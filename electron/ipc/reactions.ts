import { ipcMain } from "electron"
import type Database from "better-sqlite3"
import { Queries, type ReactionRow } from "../db/queries"
import { wrapIpc } from "./envelope"
import type {
  ReactionRecord,
  ReactionToggleInput,
} from "../../src/lib/library/types"

function toRecord(r: ReactionRow): ReactionRecord {
  return { fileId: r.file_id, emoji: r.emoji, by: r.by }
}

export function registerReactionsIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "reactions:list",
    wrapIpc<ReactionRecord[], [string]>(async (_e, fileId) => {
      const rows = q.listReactionsByFile.all(fileId) as ReactionRow[]
      return rows.map(toRecord)
    }),
  )

  ipcMain.handle(
    "reactions:toggle",
    wrapIpc<{ active: boolean }, [ReactionToggleInput]>(async (_e, input) => {
      const exists = q.findReaction.get(input.fileId, input.emoji, input.by) as
        | unknown
        | undefined
      if (exists) {
        q.deleteReaction.run(input.fileId, input.emoji, input.by)
        return { active: false }
      }
      q.insertReaction.run(input.fileId, input.emoji, input.by)
      return { active: true }
    }),
  )
}
