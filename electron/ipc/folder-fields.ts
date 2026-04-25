import { ipcMain } from "electron"
import type Database from "better-sqlite3"
import { Queries } from "../db/queries"
import { wrapIpc } from "./envelope"
import type { CustomFieldRecord } from "../../src/lib/library/types"

interface FieldRow {
  key: string
  value: string
}

export function registerFolderFieldsIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "folder-fields:list",
    wrapIpc<CustomFieldRecord[], [string]>(async (_e, folderId) => {
      const rows = q.listFolderFields.all(folderId) as FieldRow[]
      return rows.map((r) => ({ key: r.key, value: r.value }))
    }),
  )

  ipcMain.handle(
    "folder-fields:set",
    wrapIpc<void, [string, string, string]>(async (_e, folderId, key, value) => {
      q.upsertFolderField.run(folderId, key, value)
    }),
  )

  ipcMain.handle(
    "folder-fields:remove",
    wrapIpc<void, [string, string]>(async (_e, folderId, key) => {
      q.deleteFolderField.run(folderId, key)
    }),
  )
}
