import type { Project } from "./data"

const STORAGE_KEY = "folder-mgr:v2"

interface PersistShape {
  folders: Project[]
  version: 1
}

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

export function saveFolders(folders: Project[]) {
  if (typeof window === "undefined") return
  try {
    const payload: PersistShape = { folders, version: 1 }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / serialization errors silently
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

export function detectFileType(mimeOrName: string): "image" | "video" | "document" | "other" {
  const lower = mimeOrName.toLowerCase()
  if (lower.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/.test(lower)) return "image"
  if (lower.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/.test(lower)) return "video"
  if (/\.(pdf|docx?|txt|md|csv|xlsx?|pptx?)$/.test(lower) || lower.includes("pdf") || lower.includes("document")) return "document"
  return "other"
}
