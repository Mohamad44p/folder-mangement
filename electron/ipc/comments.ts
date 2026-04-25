import { ipcMain } from "electron"
import { randomUUID } from "node:crypto"
import type Database from "better-sqlite3"
import { Queries, type CommentRow } from "../db/queries"
import { wrapIpc } from "./envelope"
import type {
  CommentRecord,
  CreateCommentInput,
} from "../../src/lib/library/types"

function toRecord(r: CommentRow): CommentRecord {
  return {
    id: r.id,
    fileId: r.file_id,
    parentId: r.parent_id,
    author: r.author,
    text: r.text ?? "",
    resolved: !!r.resolved,
    timestamp: r.timestamp,
  }
}

export function registerCommentsIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "comments:list",
    wrapIpc<CommentRecord[], [string]>(async (_e, fileId) => {
      const rows = q.listCommentsByFile.all(fileId) as CommentRow[]
      return rows.map(toRecord)
    }),
  )

  ipcMain.handle(
    "comments:add",
    wrapIpc<CommentRecord, [CreateCommentInput]>(async (_e, input) => {
      const id = randomUUID()
      q.insertComment.run({
        id,
        file_id: input.fileId,
        parent_id: input.parentId ?? null,
        author: input.author ?? null,
        text: input.text,
        resolved: 0,
      })
      const row = db
        .prepare<[string]>(`SELECT * FROM file_comments WHERE id = ?`)
        .get(id) as CommentRow
      return toRecord(row)
    }),
  )

  ipcMain.handle(
    "comments:update",
    wrapIpc<CommentRecord, [string, string]>(async (_e, id, text) => {
      q.updateCommentText.run(text, id)
      const row = db
        .prepare<[string]>(`SELECT * FROM file_comments WHERE id = ?`)
        .get(id) as CommentRow | undefined
      if (!row) throw notFound(`comment ${id} not found`)
      return toRecord(row)
    }),
  )

  ipcMain.handle(
    "comments:delete",
    wrapIpc<void, [string]>(async (_e, id) => {
      q.deleteComment.run(id)
    }),
  )

  ipcMain.handle(
    "comments:resolve",
    wrapIpc<CommentRecord, [string, boolean]>(async (_e, id, resolved) => {
      q.setCommentResolved.run(resolved ? 1 : 0, id)
      const row = db
        .prepare<[string]>(`SELECT * FROM file_comments WHERE id = ?`)
        .get(id) as CommentRow | undefined
      if (!row) throw notFound(`comment ${id} not found`)
      return toRecord(row)
    }),
  )
}

function notFound(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "NOT_FOUND" })
}
