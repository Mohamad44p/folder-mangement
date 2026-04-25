import { ipcMain } from "electron"
import { randomUUID } from "node:crypto"
import type Database from "better-sqlite3"
import { Queries, type AnnotationRow } from "../db/queries"
import { wrapIpc } from "./envelope"
import type {
  AnnotationRecord,
  CreateAnnotationInput,
} from "../../src/lib/library/types"

function toRecord(r: AnnotationRow): AnnotationRecord {
  return {
    id: r.id,
    fileId: r.file_id,
    kind: r.kind as AnnotationRecord["kind"],
    x: r.x ?? undefined,
    y: r.y ?? undefined,
    w: r.w ?? undefined,
    h: r.h ?? undefined,
    x2: r.x2 ?? undefined,
    y2: r.y2 ?? undefined,
    color: r.color ?? undefined,
    text: r.text ?? undefined,
    createdAt: r.created_at,
  }
}

export function registerAnnotationsIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "annotations:list",
    wrapIpc<AnnotationRecord[], [string]>(async (_e, fileId) => {
      const rows = q.listAnnotationsByFile.all(fileId) as AnnotationRow[]
      return rows.map(toRecord)
    }),
  )

  ipcMain.handle(
    "annotations:add",
    wrapIpc<AnnotationRecord, [CreateAnnotationInput]>(async (_e, input) => {
      const id = randomUUID()
      q.insertAnnotation.run({
        id,
        file_id: input.fileId,
        kind: input.kind,
        x: input.x ?? null,
        y: input.y ?? null,
        w: input.w ?? null,
        h: input.h ?? null,
        x2: input.x2 ?? null,
        y2: input.y2 ?? null,
        color: input.color ?? null,
        text: input.text ?? null,
      })
      const row = db
        .prepare<[string]>(`SELECT * FROM file_annotations WHERE id = ?`)
        .get(id) as AnnotationRow
      return toRecord(row)
    }),
  )

  ipcMain.handle(
    "annotations:delete",
    wrapIpc<void, [string]>(async (_e, id) => {
      q.deleteAnnotation.run(id)
    }),
  )
}
