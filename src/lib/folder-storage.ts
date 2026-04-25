import type { Project, FolderFile, FolderFileType } from "./data"
import type { FolderRecord, FileRecord } from "./library/types"

const STORAGE_KEY = "folder-mgr:v2"

interface PersistShape {
  folders: Project[]
  version: 1
}

function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.api?.library
}

/**
 * Synchronously read folders from localStorage. In Electron we still keep a
 * localStorage shadow so the existing FolderContext (which expects synchronous
 * loads) keeps working. Electron's authoritative SQLite library is hydrated
 * asynchronously via {@link hydrateFromLibrary}.
 */
export function loadFolders(): Project[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistShape
    if (!parsed?.folders || !Array.isArray(parsed.folders)) return null
    return parsed.folders
  } catch {
    return null
  }
}

/**
 * In Electron, fetch the authoritative folder/file tree from SQLite and
 * mirror it into Project[] shape. Returns null in non-Electron contexts so
 * callers can fall back to {@link loadFolders}.
 */
export async function hydrateFromLibrary(): Promise<Project[] | null> {
  if (!isElectron()) return null
  const folders = await window.api.library.listAllFolders()
  const projects: Project[] = []
  for (const f of folders) {
    const files = await window.api.files.listInFolder(f.id)
    projects.push(folderRecordToProject(f, files))
  }
  return projects
}

export function saveFolders(folders: Project[]) {
  if (typeof window === "undefined") return
  try {
    const payload: PersistShape = { folders, version: 1 }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage quota / serialization errors. The Electron-backed path
    // does not depend on this for correctness; the renderer's localStorage
    // is just a synchronous cache.
  }
}

export function clearFolders() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function readFileAsBytes(file: File): Promise<Uint8Array> {
  return file.arrayBuffer().then((buf) => new Uint8Array(buf))
}

export function detectFileType(mimeOrName: string): FolderFileType {
  const lower = mimeOrName.toLowerCase()
  if (lower.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/.test(lower)) return "image"
  if (lower.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/.test(lower)) return "video"
  if (
    /\.(pdf|docx?|txt|md|csv|xlsx?|pptx?)$/.test(lower) ||
    lower.includes("pdf") ||
    lower.includes("document")
  )
    return "document"
  return "other"
}

function folderRecordToProject(f: FolderRecord, files: FileRecord[]): Project {
  const folderFiles = files.map(fileRecordToFolderFile)
  return {
    id: f.id,
    title: f.name,
    fileCount: folderFiles.length,
    images: folderFiles.filter((x) => x.type === "image").map((x) => x.url),
    isGenerating: false,
    progress: 100,
    createdAt: f.createdAt,
    isEmpty: folderFiles.length === 0,
    parentId: f.parentId ?? null,
    color: f.color,
    icon: f.icon,
    coverFileId: f.coverFileId,
    notes: f.notes,
    isFavorite: f.isFavorite,
    isPinned: f.isPinned,
    isArchived: f.isArchived,
    isLocked: f.isLocked,
    workflowStatus: f.workflowStatus,
    dueDate: f.dueDate,
    files: folderFiles,
  } as Project
}

function fileRecordToFolderFile(f: FileRecord): FolderFile {
  return {
    id: f.id,
    name: f.name,
    url: f.url,
    type: f.type,
    size: f.size,
    uploadedAt: f.uploadedAt,
    description: f.description,
    favorite: f.isFavorite,
    rotation: f.rotation,
    flipH: f.flipH,
    flipV: f.flipV,
    pinned: f.isPinned,
    ocrText: f.ocrText,
    geo: f.geo,
  } as FolderFile
}

/**
 * Mirror a folder mutation into the Electron library. Returns false (so
 * callers can decide to keep the local state if Electron is unavailable).
 */
export async function libraryCreateFolder(
  title: string,
  parentId: string | null,
): Promise<{ id: string } | null> {
  if (!isElectron()) return null
  const f = await window.api.library.createFolder({ name: title, parentId })
  return { id: f.id }
}

export async function libraryRenameFolder(id: string, title: string): Promise<boolean> {
  if (!isElectron()) return false
  await window.api.library.renameFolder(id, title)
  return true
}

export async function libraryDeleteFolder(id: string): Promise<boolean> {
  if (!isElectron()) return false
  await window.api.library.deleteFolder(id)
  return true
}

export async function libraryUploadFiles(
  folderId: string,
  files: File[],
): Promise<FileRecord[] | null> {
  if (!isElectron()) return null
  const items = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      mime: f.type || "application/octet-stream",
      bytes: await f.arrayBuffer(),
    })),
  )
  return await window.api.files.upload(folderId, items)
}
