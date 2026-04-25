import { ipcMain } from "electron"
import { randomUUID } from "node:crypto"
import type Database from "better-sqlite3"
import { Queries, type ActivityRow } from "../db/queries"
import { wrapIpc } from "./envelope"
import type {
  ActivityRecord,
  CreateActivityInput,
} from "../../src/lib/library/types"

function toRecord(r: ActivityRow): ActivityRecord {
  return {
    id: r.id,
    folderId: r.folder_id,
    kind: r.kind,
    actor: r.actor,
    description: r.description,
    timestamp: r.timestamp,
  }
}

export function registerActivityIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "activity:list",
    wrapIpc<ActivityRecord[], [string, number | undefined]>(
      async (_e, folderId, limit) => {
        const cap = typeof limit === "number" && limit > 0 ? limit : 200
        const rows = q.listActivityByFolder.all(folderId, cap) as ActivityRow[]
        return rows.map(toRecord)
      },
    ),
  )

  ipcMain.handle(
    "activity:add",
    wrapIpc<ActivityRecord, [CreateActivityInput]>(async (_e, input) => {
      const id = randomUUID()
      q.insertActivity.run({
        id,
        folder_id: input.folderId,
        kind: input.kind,
        actor: input.actor ?? null,
        description: input.description ?? null,
      })
      const row = db
        .prepare<[string]>(`SELECT * FROM folder_activity WHERE id = ?`)
        .get(id) as ActivityRow
      return toRecord(row)
    }),
  )
}
