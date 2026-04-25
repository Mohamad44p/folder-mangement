import type Database from "better-sqlite3"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import { v4 as uuid } from "uuid"
import type { Queries, FolderRow, FileRow } from "../db/queries"

interface ReconcileDeps {
  db: Database.Database
  queries: Queries
  libraryRoot: string
  onProgress?: (done: number, total: number) => void
}

const META_DIR = ".folders-app"

export async function reconcileLibrary(deps: ReconcileDeps): Promise<void> {
  const { db, queries: q, libraryRoot } = deps
  const onDisk = walkLibrary(libraryRoot)

  // Load *all* rows including soft-deleted ones — abs_path has a UNIQUE
  // index across the whole table, so an INSERT for a path owned by a
  // tombstoned row would violate it. We resurrect those rows instead.
  const allFolderRows = db
    .prepare(`SELECT * FROM folders WHERE workspace_id = ?`)
    .all("default") as FolderRow[]
  const allFileRows = db
    .prepare(`SELECT * FROM files`)
    .all() as FileRow[]
  const activeFolderRows = allFolderRows.filter((r) => r.deleted_at === null)
  const activeFileRows = allFileRows.filter((r) => r.deleted_at === null)

  const dbFolderPaths = new Map(allFolderRows.map((r) => [r.abs_path, r]))
  const dbFilePaths = new Map(allFileRows.map((r) => [r.abs_path, r]))

  // Sort dirs by depth so parents are inserted before children.
  onDisk.dirs.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length)

  const tx = db.transaction(() => {
    for (const dirPath of onDisk.dirs) {
      const existing = dbFolderPaths.get(dirPath)
      if (existing) {
        // Path is already known. If it was tombstoned, the user recreated
        // a folder we previously trashed — restore the row instead of
        // inserting a duplicate.
        if (existing.deleted_at !== null) {
          q.restoreFolderRow.run(existing.id)
          existing.deleted_at = null
        }
        continue
      }
      const parentRow = findParentFolder(dirPath, libraryRoot, q)
      const id = uuid()
      q.insertFolder.run({
        id,
        workspace_id: "default",
        parent_id: parentRow?.id ?? null,
        name: path.basename(dirPath),
        abs_path: dirPath,
        sort_order: 0,
      })
      // Cache the new row so deeper children find their parent in the same tx.
      dbFolderPaths.set(dirPath, {
        id,
        abs_path: dirPath,
        deleted_at: null,
      } as FolderRow)
    }

    for (const filePath of onDisk.files) {
      const existingFile = dbFilePaths.get(filePath)
      if (existingFile) {
        if (existingFile.deleted_at !== null) {
          q.restoreFileRow.run(existingFile.id)
          existingFile.deleted_at = null
        }
        continue
      }
      const dir = path.dirname(filePath)
      const parent =
        dbFolderPaths.get(dir) ?? q.getFolderByPath(dir)
      if (!parent) continue
      let stat: fs.Stats
      try {
        stat = fs.statSync(filePath)
      } catch {
        continue
      }
      let hash: string | null = null
      try {
        const buf = fs.readFileSync(filePath)
        hash = createHash("sha256")
          .update(buf as unknown as Uint8Array)
          .digest("hex")
      } catch {
        // unreadable; insert without hash and let later passes fix it
      }
      q.insertFile.run({
        id: uuid(),
        folder_id: parent.id,
        name: path.basename(filePath),
        abs_path: filePath,
        type: detectTypeFromExt(filePath),
        mime: null,
        size: stat.size,
        width: null,
        height: null,
        duration_ms: null,
        content_hash: hash,
      })
    }

    // Tombstone rows whose disk entry vanished. Only walk the previously
    // active rows so we don't re-soft-delete already-deleted ones.
    for (const row of activeFolderRows) {
      if (!fs.existsSync(row.abs_path)) {
        q.softDeleteFolder.run(row.id)
      }
    }

    for (const row of activeFileRows) {
      if (!fs.existsSync(row.abs_path)) {
        q.softDeleteFile.run(row.id)
      }
    }
  })

  tx()
}

function walkLibrary(root: string): { dirs: string[]; files: string[] } {
  const dirs: string[] = []
  const files: string[] = []
  function walk(p: string) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(p, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      if (ent.name === META_DIR) continue
      const full = path.join(p, ent.name)
      if (ent.isDirectory()) {
        dirs.push(full)
        walk(full)
      } else if (ent.isFile()) {
        files.push(full)
      }
    }
  }
  walk(root)
  return { dirs, files }
}

function findParentFolder(
  dirPath: string,
  libraryRoot: string,
  q: Queries,
): FolderRow | null {
  const parent = path.dirname(dirPath)
  if (parent === libraryRoot) return null
  return q.getFolderByPath(parent)
}

function detectTypeFromExt(p: string): "image" | "video" | "document" | "other" {
  const lower = p.toLowerCase()
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/.test(lower)) return "image"
  if (/\.(mp4|mov|webm|mkv)$/.test(lower)) return "video"
  if (/\.(pdf|docx?|txt|md|csv|xlsx?|pptx?)$/.test(lower)) return "document"
  return "other"
}
