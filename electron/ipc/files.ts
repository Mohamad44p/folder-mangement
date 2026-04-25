import type Database from "better-sqlite3"
import * as path from "node:path"
import { v4 as uuid } from "uuid"
import { Queries, type FileRow } from "../db/queries"
import {
  atomicMoveToTrash,
  atomicRename,
  hashBytes,
  writeBytesAtomic,
} from "../fs-ops"
import type {
  FileRecord,
  UploadItem,
  FolderFileType,
} from "../../src/lib/library/types"

interface FilesDeps {
  db: Database.Database
  queries: Queries
  libraryRoot: string
}

export class FilesService {
  private readonly db: Database.Database
  private readonly q: Queries
  private readonly root: string

  constructor(deps: FilesDeps) {
    this.db = deps.db
    this.q = deps.queries
    this.root = deps.libraryRoot
  }

  async listInFolder(folderId: string): Promise<FileRecord[]> {
    const rows = this.q.listFilesByFolder.all(folderId) as FileRow[]
    return rows.map(toRecord)
  }

  async upload(folderId: string, items: UploadItem[]): Promise<FileRecord[]> {
    const folder = this.q.getFolderById.get(folderId) as { abs_path: string } | undefined
    if (!folder) throw notFound(`folder ${folderId} not found`)

    const out: FileRecord[] = []
    for (const item of items) {
      const u8 =
        item.bytes instanceof ArrayBuffer
          ? new Uint8Array(item.bytes)
          : new Uint8Array(item.bytes)
      const proposed = path.join(folder.abs_path, sanitizeName(item.name))
      const finalPath = writeBytesAtomic(proposed, u8)
      const hash = hashBytes(u8)
      const type = detectType(item.mime, item.name)
      const id = uuid()
      this.q.insertFile.run({
        id,
        folder_id: folderId,
        name: path.basename(finalPath),
        abs_path: finalPath,
        type,
        mime: item.mime,
        size: u8.byteLength,
        width: null,
        height: null,
        duration_ms: null,
        content_hash: hash,
      })
      const row = this.q.getFileById.get(id) as FileRow
      out.push(toRecord(row))
    }
    return out
  }

  async rename(folderId: string, fileId: string, name: string): Promise<FileRecord> {
    const row = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!row || row.folder_id !== folderId) throw notFound(`file ${fileId} not found`)
    const newPath = path.join(path.dirname(row.abs_path), sanitizeName(name))
    const finalPath = atomicRename(row.abs_path, newPath)
    this.q.updateFileName.run(path.basename(finalPath), finalPath, fileId)
    return toRecord(this.q.getFileById.get(fileId) as FileRow)
  }

  async move(srcFolderId: string, fileId: string, dstFolderId: string): Promise<FileRecord> {
    const file = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!file || file.folder_id !== srcFolderId) throw notFound(`file ${fileId} not found`)
    const dst = this.q.getFolderById.get(dstFolderId) as { abs_path: string } | undefined
    if (!dst) throw notFound(`folder ${dstFolderId} not found`)
    const newPath = path.join(dst.abs_path, file.name)
    const finalPath = atomicRename(file.abs_path, newPath)
    this.q.updateFileFolderAndPath.run(dstFolderId, finalPath, fileId)
    return toRecord(this.q.getFileById.get(fileId) as FileRow)
  }

  async delete(folderId: string, fileId: string): Promise<void> {
    const row = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!row || row.folder_id !== folderId) return
    atomicMoveToTrash(this.root, row.abs_path)
    this.q.softDeleteFile.run(fileId)
  }

  async bulkDelete(folderId: string, fileIds: string[]): Promise<void> {
    const tx = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        const row = this.q.getFileById.get(id) as FileRow | undefined
        if (!row || row.folder_id !== folderId) continue
        atomicMoveToTrash(this.root, row.abs_path)
        this.q.softDeleteFile.run(id)
      }
    })
    tx(fileIds)
  }

  async bulkMove(srcFolderId: string, fileIds: string[], dstFolderId: string): Promise<void> {
    for (const id of fileIds) {
      try {
        await this.move(srcFolderId, id, dstFolderId)
      } catch {
        /* continue with the rest */
      }
    }
  }
}

function toRecord(r: FileRow): FileRecord {
  return {
    id: r.id,
    folderId: r.folder_id,
    name: r.name,
    absPath: r.abs_path,
    url: `folders://${r.id}`,
    type: r.type as FolderFileType,
    mime: r.mime ?? undefined,
    size: r.size ?? undefined,
    width: r.width ?? undefined,
    height: r.height ?? undefined,
    durationMs: r.duration_ms ?? undefined,
    contentHash: r.content_hash ?? undefined,
    uploadedAt: r.uploaded_at,
    modifiedAt: r.modified_at,
    deletedAt: r.deleted_at ?? undefined,
    rotation: r.rotation,
    flipH: !!r.flip_h,
    flipV: !!r.flip_v,
    isFavorite: !!r.is_favorite,
    isPinned: !!r.is_pinned,
    ocrText: r.ocr_text ?? undefined,
    caption: r.caption ?? undefined,
    aiTagStatus: (r.ai_tag_status as FileRecord["aiTagStatus"]) ?? "pending",
    description: r.description ?? undefined,
    geo:
      r.geo_lat != null && r.geo_lng != null
        ? { lat: r.geo_lat, lng: r.geo_lng }
        : undefined,
  }
}

function detectType(mime: string, name: string): FolderFileType {
  const m = mime.toLowerCase()
  if (m.startsWith("image/")) return "image"
  if (m.startsWith("video/")) return "video"
  if (m === "application/pdf" || /\.(pdf|docx?|txt|md|csv|xlsx?|pptx?)$/i.test(name)) {
    return "document"
  }
  return "other"
}

function sanitizeName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw invalid("file name cannot be empty")
  if (/[<>:"/\\|?*]/.test(trimmed)) throw invalid(`invalid file name: ${name}`)
  return trimmed
}

function notFound(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "NOT_FOUND" })
}

function invalid(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "INVALID_INPUT" })
}
