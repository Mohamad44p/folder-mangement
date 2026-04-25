import { ipcMain } from "electron"
import { randomUUID } from "node:crypto"
import * as fs from "node:fs"
import type Database from "better-sqlite3"
import { Queries, type FileRow, type VersionRow } from "../db/queries"
import { hashFileStream, snapshotVersion } from "../fs-ops"
import { wrapIpc } from "./envelope"
import type { VersionRecord } from "../../src/lib/library/types"

function toRecord(r: VersionRow): VersionRecord {
  return {
    id: r.id,
    fileId: r.file_id,
    absPath: r.abs_path,
    size: r.size,
    contentHash: r.content_hash,
    createdAt: r.created_at,
  }
}

export function registerVersionsIpc(
  db: Database.Database,
  libraryRoot: string,
): void {
  const q = new Queries(db)

  ipcMain.handle(
    "versions:list",
    wrapIpc<VersionRecord[], [string]>(async (_e, fileId) => {
      const rows = q.listVersionsByFile.all(fileId) as VersionRow[]
      return rows.map(toRecord)
    }),
  )

  ipcMain.handle(
    "versions:snapshot",
    wrapIpc<VersionRecord, [string]>(async (_e, fileId) => {
      const file = q.getFileById.get(fileId) as FileRow | undefined
      if (!file) throw notFound(`file ${fileId} not found`)
      const snapPath = snapshotVersion(libraryRoot, fileId, file.abs_path)
      const stat = fs.statSync(snapPath)
      const hash = await hashFileStream(snapPath).catch(() => null)
      const id = randomUUID()
      q.insertVersion.run({
        id,
        file_id: fileId,
        abs_path: snapPath,
        size: stat.size,
        content_hash: hash,
      })
      const row = db
        .prepare<[string]>(`SELECT * FROM file_versions WHERE id = ?`)
        .get(id) as VersionRow
      return toRecord(row)
    }),
  )
}

function notFound(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "NOT_FOUND" })
}
