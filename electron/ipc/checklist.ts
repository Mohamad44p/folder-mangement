import { ipcMain } from "electron"
import { randomUUID } from "node:crypto"
import type Database from "better-sqlite3"
import { Queries, type ChecklistRow } from "../db/queries"
import { wrapIpc } from "./envelope"
import type { ChecklistItemRecord } from "../../src/lib/library/types"

function toRecord(r: ChecklistRow): ChecklistItemRecord {
  return {
    id: r.id,
    folderId: r.folder_id,
    text: r.text,
    done: !!r.done,
    createdAt: r.created_at,
  }
}

export function registerChecklistIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "checklist:list",
    wrapIpc<ChecklistItemRecord[], [string]>(async (_e, folderId) => {
      const rows = q.listChecklist.all(folderId) as ChecklistRow[]
      return rows.map(toRecord)
    }),
  )

  ipcMain.handle(
    "checklist:add",
    wrapIpc<ChecklistItemRecord, [string, string]>(async (_e, folderId, text) => {
      const id = randomUUID()
      q.insertChecklistItem.run(id, folderId, text)
      const row = q.getChecklistItem.get(id) as ChecklistRow
      return toRecord(row)
    }),
  )

  ipcMain.handle(
    "checklist:toggle",
    wrapIpc<ChecklistItemRecord, [string]>(async (_e, id) => {
      q.toggleChecklistItem.run(id)
      const row = q.getChecklistItem.get(id) as ChecklistRow | undefined
      if (!row) throw notFound(`checklist item ${id} not found`)
      return toRecord(row)
    }),
  )

  ipcMain.handle(
    "checklist:rename",
    wrapIpc<ChecklistItemRecord, [string, string]>(async (_e, id, text) => {
      q.renameChecklistItem.run(text, id)
      const row = q.getChecklistItem.get(id) as ChecklistRow | undefined
      if (!row) throw notFound(`checklist item ${id} not found`)
      return toRecord(row)
    }),
  )

  ipcMain.handle(
    "checklist:remove",
    wrapIpc<void, [string]>(async (_e, id) => {
      q.deleteChecklistItem.run(id)
    }),
  )
}

function notFound(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "NOT_FOUND" })
}
