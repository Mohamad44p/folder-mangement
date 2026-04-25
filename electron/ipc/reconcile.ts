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
  const folderRows = q.listAllActiveFolders.all("default") as FolderRow[]
  const fileRows = db
    .prepare(`SELECT * FROM files WHERE deleted_at IS NULL`)
    .all() as FileRow[]

  const dbFolderPaths = new Map(folderRows.map((r) => [r.abs_path, r]))
  const dbFilePaths = new Map(fileRows.map((r) => [r.abs_path, r]))

  // Sort dirs by depth so parents are inserted before children.
  onDisk.dirs.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length)

  const tx = db.transaction(() => {
    for (const dirPath of onDisk.dirs) {
      if (dbFolderPaths.has(dirPath)) continue
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
      } as FolderRow)
    }

    for (const filePath of onDisk.files) {
      if (dbFilePaths.has(filePath)) continue
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

    for (const row of folderRows) {
      if (!fs.existsSync(row.abs_path)) {
        q.softDeleteFolder.run(row.id)
      }
    }

    for (const row of fileRows) {
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
