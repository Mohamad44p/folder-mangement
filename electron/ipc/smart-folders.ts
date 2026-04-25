import { ipcMain } from "electron"
import { randomUUID } from "node:crypto"
import type Database from "better-sqlite3"
import { Queries, type SmartFolderRow } from "../db/queries"
import { wrapIpc } from "./envelope"
import type {
  SmartFolderRecord,
  CreateSmartFolderInput,
  UpdateSmartFolderInput,
} from "../../src/lib/library/types"

const DEFAULT_WORKSPACE = "default"

function toRecord(r: SmartFolderRow): SmartFolderRecord {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    name: r.name,
    rulesJson: r.rules_json,
    sort: r.sort,
    view: r.view,
    density: r.density,
    groupKind: r.group_kind,
    recentsOnly: !!r.recents_only,
    createdAt: r.created_at,
  }
}

export function registerSmartFoldersIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "smart-folders:list",
    wrapIpc<SmartFolderRecord[], [string | undefined]>(async (_e, workspaceId) => {
      const rows = q.listSmartFolders.all(
        workspaceId ?? DEFAULT_WORKSPACE,
      ) as SmartFolderRow[]
      return rows.map(toRecord)
    }),
  )

  ipcMain.handle(
    "smart-folders:add",
    wrapIpc<SmartFolderRecord, [CreateSmartFolderInput]>(async (_e, input) => {
      const id = randomUUID()
      q.insertSmartFolder.run({
        id,
        workspace_id: input.workspaceId ?? DEFAULT_WORKSPACE,
        name: input.name,
        rules_json: input.rulesJson,
        sort: input.sort ?? null,
        view: input.view ?? null,
        density: input.density ?? null,
        group_kind: input.groupKind ?? null,
        recents_only: input.recentsOnly ? 1 : 0,
      })
      const row = db
        .prepare<[string]>(`SELECT * FROM smart_folders WHERE id = ?`)
        .get(id) as SmartFolderRow
      return toRecord(row)
    }),
  )

  ipcMain.handle(
    "smart-folders:update",
    wrapIpc<SmartFolderRecord, [UpdateSmartFolderInput]>(async (_e, input) => {
      q.updateSmartFolder.run({
        id: input.id,
        name: input.name,
        rules_json: input.rulesJson,
        sort: input.sort ?? null,
        view: input.view ?? null,
        density: input.density ?? null,
        group_kind: input.groupKind ?? null,
        recents_only: input.recentsOnly ? 1 : 0,
      })
      const row = db
        .prepare<[string]>(`SELECT * FROM smart_folders WHERE id = ?`)
        .get(input.id) as SmartFolderRow | undefined
      if (!row) throw notFound(`smart folder ${input.id} not found`)
      return toRecord(row)
    }),
  )

  ipcMain.handle(
    "smart-folders:delete",
    wrapIpc<void, [string]>(async (_e, id) => {
      q.deleteSmartFolder.run(id)
    }),
  )
}

function notFound(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "NOT_FOUND" })
}
