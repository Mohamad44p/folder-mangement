import { ipcMain } from "electron"
import type Database from "better-sqlite3"
import { Queries } from "../db/queries"
import { wrapIpc } from "./envelope"

interface ExifResult {
  data: Record<string, unknown> | null
}

export function registerFileMetaIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "files:get-exif",
    wrapIpc<ExifResult, [string]>(async (_e, fileId) => {
      const row = q.getFileExif.get(fileId) as { data: string } | undefined
      if (!row) return { data: null }
      try {
        return { data: JSON.parse(row.data) as Record<string, unknown> }
      } catch {
        return { data: null }
      }
    }),
  )
}
