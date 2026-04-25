import { ipcMain } from "electron"
import type Database from "better-sqlite3"
import { Queries } from "../db/queries"
import { wrapIpc } from "./envelope"

export function registerPaletteIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "palette:get",
    wrapIpc<string[], [string]>(async (_e, fileId) => {
      const row = q.getFilePalette.get(fileId) as { colors: string } | undefined
      if (!row) return []
      try {
        const parsed = JSON.parse(row.colors) as unknown
        if (!Array.isArray(parsed)) return []
        return parsed.filter((c): c is string => typeof c === "string")
      } catch {
        return []
      }
    }),
  )

  ipcMain.handle(
    "palette:set",
    wrapIpc<void, [string, string[]]>(async (_e, fileId, colors) => {
      const cleaned = colors
        .filter((c) => typeof c === "string")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
      q.upsertFilePalette.run(fileId, JSON.stringify(cleaned))
    }),
  )
}
