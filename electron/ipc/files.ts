import type Database from "better-sqlite3"
import * as fs from "node:fs"
import * as path from "node:path"
import { v4 as uuid } from "uuid"
import * as exifr from "exifr"
import sharp from "sharp"
import { Queries, type FileRow } from "../db/queries"
import {
  atomicMoveToTrash,
  atomicRename,
  hashBytes,
  trashRoot,
  writeBytesAtomic,
} from "../fs-ops"
import type { LibraryWatcher } from "./fs-watcher"
import type {
  FileRecord,
  UploadItem,
  FolderFileType,
} from "../../src/lib/library/types"

interface FilesDeps {
  db: Database.Database
  queries: Queries
  libraryRoot: string
  watcher?: LibraryWatcher
}

export class FilesService {
  private readonly db: Database.Database
  private readonly q: Queries
  private readonly root: string
  private watcher: LibraryWatcher | null

  constructor(deps: FilesDeps) {
    this.db = deps.db
    this.q = deps.queries
    this.root = deps.libraryRoot
    this.watcher = deps.watcher ?? null
  }

  setWatcher(w: LibraryWatcher | null): void {
    this.watcher = w
  }

  private mute(paths: (string | null | undefined)[]): void {
    const real = paths.filter((p): p is string => typeof p === "string" && p.length > 0)
    if (real.length === 0) return
    this.watcher?.mutePathsTemporarily(real)
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
      this.mute([proposed])
      const finalPath = writeBytesAtomic(proposed, u8)
      this.mute([finalPath])
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

      if (type === "image") {
        await this.extractImageMetadata(id, u8)
      }

      const row = this.q.getFileById.get(id) as FileRow
      out.push(toRecord(row))
    }
    return out
  }

  /**
   * Best-effort: pull EXIF (incl. GPS) and dimensions for an image. Failures
   * are logged but never block the upload — corrupt EXIF is common and must
   * not abort persistence.
   */
  private async extractImageMetadata(fileId: string, bytes: Uint8Array): Promise<void> {
    const buf = Buffer.from(bytes)

    // Dimensions via sharp (works for JPEG/PNG/WEBP/AVIF/GIF/etc.)
    try {
      const meta = await sharp(buf).metadata()
      if (typeof meta.width === "number" && typeof meta.height === "number") {
        this.q.updateFileDimensions.run(meta.width, meta.height, fileId)
      }
    } catch (err) {
      console.error(`sharp metadata failed for ${fileId}:`, (err as Error).message)
    }

    // GPS — separate call so a parse failure on the rich metadata doesn't lose coords.
    try {
      const gps = (await exifr.gps(buf)) as
        | { latitude?: number; longitude?: number }
        | undefined
      if (
        gps &&
        typeof gps.latitude === "number" &&
        typeof gps.longitude === "number"
      ) {
        this.q.updateFileGeo.run(gps.latitude, gps.longitude, fileId)
      }
    } catch (err) {
      console.error(`exifr.gps failed for ${fileId}:`, (err as Error).message)
    }

    // Rich metadata blob — TIFF + EXIF tags (skip GPS to avoid duplicating).
    try {
      const exif = (await exifr.parse(buf, {
        tiff: true,
        exif: true,
        gps: false,
      })) as Record<string, unknown> | undefined
      if (exif && Object.keys(exif).length > 0) {
        this.q.upsertFileExif.run(fileId, JSON.stringify(exif, exifReplacer))
      }
    } catch (err) {
      console.error(`exifr.parse failed for ${fileId}:`, (err as Error).message)
    }
  }

  async rename(folderId: string, fileId: string, name: string): Promise<FileRecord> {
    const row = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!row || row.folder_id !== folderId) throw notFound(`file ${fileId} not found`)
    const newPath = path.join(path.dirname(row.abs_path), sanitizeName(name))
    this.mute([row.abs_path, newPath])
    const finalPath = atomicRename(row.abs_path, newPath)
    this.mute([finalPath])
    this.q.updateFileName.run(path.basename(finalPath), finalPath, fileId)
    return toRecord(this.q.getFileById.get(fileId) as FileRow)
  }

  async move(srcFolderId: string, fileId: string, dstFolderId: string): Promise<FileRecord> {
    const file = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!file || file.folder_id !== srcFolderId) throw notFound(`file ${fileId} not found`)
    const dst = this.q.getFolderById.get(dstFolderId) as { abs_path: string } | undefined
    if (!dst) throw notFound(`folder ${dstFolderId} not found`)
    const newPath = path.join(dst.abs_path, file.name)
    this.mute([file.abs_path, newPath])
    const finalPath = atomicRename(file.abs_path, newPath)
    this.mute([finalPath])
    this.q.updateFileFolderAndPath.run(dstFolderId, finalPath, fileId)
    return toRecord(this.q.getFileById.get(fileId) as FileRow)
  }

  async delete(folderId: string, fileId: string): Promise<void> {
    const row = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!row || row.folder_id !== folderId) return
    const trashed = path.join(trashRoot(this.root), path.relative(this.root, row.abs_path))
    this.mute([row.abs_path, trashed])
    atomicMoveToTrash(this.root, row.abs_path)
    this.q.softDeleteFile.run(fileId)
  }

  async restore(folderId: string, fileId: string): Promise<FileRecord> {
    const row = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!row || row.folder_id !== folderId) throw notFound(`file ${fileId} not found`)
    const trashed = path.join(trashRoot(this.root), path.relative(this.root, row.abs_path))
    this.mute([trashed, row.abs_path])
    if (fs.existsSync(trashed)) {
      fs.mkdirSync(path.dirname(row.abs_path), { recursive: true })
      const finalPath = atomicRename(trashed, row.abs_path)
      this.mute([finalPath])
      if (finalPath !== row.abs_path) {
        this.q.updateFilePath.run(finalPath, fileId)
      }
    }
    this.q.restoreFileRow.run(fileId)
    return toRecord(this.q.getFileById.get(fileId) as FileRow)
  }

  async bulkDelete(folderId: string, fileIds: string[]): Promise<void> {
    const trashedPaths: string[] = []
    const tx = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        const row = this.q.getFileById.get(id) as FileRow | undefined
        if (!row || row.folder_id !== folderId) continue
        const trashed = path.join(trashRoot(this.root), path.relative(this.root, row.abs_path))
        this.mute([row.abs_path, trashed])
        trashedPaths.push(row.abs_path, trashed)
        atomicMoveToTrash(this.root, row.abs_path)
        this.q.softDeleteFile.run(id)
      }
    })
    tx(fileIds)
  }

  async bulkMove(srcFolderId: string, fileIds: string[], dstFolderId: string): Promise<void> {
    const dst = this.q.getFolderById.get(dstFolderId) as { abs_path: string } | undefined
    if (!dst) throw notFound(`folder ${dstFolderId} not found`)
    const moves: { fileId: string; from: string; to: string }[] = []
    for (const id of fileIds) {
      const file = this.q.getFileById.get(id) as FileRow | undefined
      if (!file || file.folder_id !== srcFolderId) continue
      const target = path.join(dst.abs_path, file.name)
      this.mute([file.abs_path, target])
      const finalPath = atomicRename(file.abs_path, target)
      this.mute([finalPath])
      moves.push({ fileId: id, from: file.abs_path, to: finalPath })
    }
    const tx = this.db.transaction(() => {
      for (const m of moves) {
        this.q.updateFileFolderAndPath.run(dstFolderId, m.to, m.fileId)
      }
    })
    try {
      tx()
    } catch (err) {
      // Roll the disk back if the DB transaction failed.
      for (const m of moves.reverse()) {
        try {
          this.mute([m.to, m.from])
          atomicRename(m.to, m.from)
        } catch {
          /* best effort */
        }
      }
      throw err
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

/**
 * EXIF can include Date instances, BigInts and Buffers — none of which round-
 * trip through JSON. Coerce them so the persisted blob stays parseable.
 */
function exifReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "bigint") return value.toString()
  if (
    value &&
    typeof value === "object" &&
    "type" in value &&
    (value as { type?: unknown }).type === "Buffer"
  ) {
    return undefined
  }
  if (value instanceof Uint8Array) return undefined
  return value
}
