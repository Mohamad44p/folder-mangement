import { ipcMain } from "electron"
import { randomUUID } from "node:crypto"
import type Database from "better-sqlite3"
import { Queries, type SavedSearchRow } from "../db/queries"
import { wrapIpc } from "./envelope"
import type { SavedSearchRecord } from "../../src/lib/library/types"

function toRecord(r: SavedSearchRow): SavedSearchRecord {
  return {
    id: r.id,
    name: r.name,
    query: r.query,
    createdAt: r.created_at,
  }
}

export function registerSavedSearchesIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "saved-searches:list",
    wrapIpc<SavedSearchRecord[]>(async () => {
      const rows = q.listSavedSearches.all() as SavedSearchRow[]
      return rows.map(toRecord)
    }),
  )

  ipcMain.handle(
    "saved-searches:add",
    wrapIpc<SavedSearchRecord, [string, string]>(async (_e, name, query) => {
      const id = randomUUID()
      q.insertSavedSearch.run(id, name, query)
      const row = db
        .prepare<[string]>(`SELECT * FROM saved_searches WHERE id = ?`)
        .get(id) as SavedSearchRow
      return toRecord(row)
    }),
  )

  ipcMain.handle(
    "saved-searches:delete",
    wrapIpc<void, [string]>(async (_e, id) => {
      q.deleteSavedSearch.run(id)
    }),
  )
}
