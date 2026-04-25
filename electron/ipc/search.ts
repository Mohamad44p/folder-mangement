import { ipcMain } from "electron"
import type Database from "better-sqlite3"
import { wrapIpc } from "./envelope"
import type { SearchHit } from "../../src/lib/library/types"

interface FtsRow {
  file_id: string
  folder_id: string
  matched_field: SearchHit["matchedField"]
  snippet: string
}

export function registerSearchIpc(db: Database.Database): void {
  const stmt = db.prepare<[string]>(`
    SELECT
      f.id        AS file_id,
      f.folder_id AS folder_id,
      'name'      AS matched_field,
      snippet(files_fts, 0, '<b>', '</b>', '…', 8) AS snippet
    FROM files_fts
    JOIN files f ON f.rowid = files_fts.rowid
    WHERE files_fts MATCH ? AND f.deleted_at IS NULL
    ORDER BY rank
    LIMIT 100
  `)

  ipcMain.handle(
    "search:fts",
    wrapIpc<SearchHit[], [string]>(async (_e, query) => {
      const trimmed = query.trim()
      if (!trimmed) return []
      // Escape FTS5 syntax in user input by quoting with double-quotes.
      // Simple terms work as-is; this prevents control characters from
      // throwing parse errors.
      const safe = `"${trimmed.replace(/"/g, '""')}"`
      let rows: FtsRow[]
      try {
        rows = stmt.all(safe) as FtsRow[]
      } catch {
        rows = []
      }
      return rows.map((r) => ({
        fileId: r.file_id,
        folderId: r.folder_id,
        matchedField: r.matched_field,
        snippet: r.snippet,
      }))
    }),
  )
}
