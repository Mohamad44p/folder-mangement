import { ipcMain } from "electron"
import type Database from "better-sqlite3"
import { Queries } from "../db/queries"
import { wrapIpc } from "./envelope"

interface TagRow {
  tag: string
}

export function registerTagsIpc(db: Database.Database): void {
  const q = new Queries(db)

  // File tags --------------------------------------------------------------
  ipcMain.handle(
    "file-tags:list",
    wrapIpc<string[], [string]>(async (_e, fileId) => {
      const rows = q.listFileTags.all(fileId) as TagRow[]
      return rows.map((r) => r.tag)
    }),
  )

  ipcMain.handle(
    "file-tags:add",
    wrapIpc<void, [string, string]>(async (_e, fileId, tag) => {
      q.insertFileTag.run(fileId, normalizeTag(tag))
    }),
  )

  ipcMain.handle(
    "file-tags:remove",
    wrapIpc<void, [string, string]>(async (_e, fileId, tag) => {
      q.removeFileTag.run(fileId, normalizeTag(tag))
    }),
  )

  // Folder tags ------------------------------------------------------------
  ipcMain.handle(
    "folder-tags:list",
    wrapIpc<string[], [string]>(async (_e, folderId) => {
      const rows = q.listFolderTags.all(folderId) as TagRow[]
      return rows.map((r) => r.tag)
    }),
  )

  ipcMain.handle(
    "folder-tags:add",
    wrapIpc<void, [string, string]>(async (_e, folderId, tag) => {
      q.insertFolderTag.run(folderId, normalizeTag(tag))
    }),
  )

  ipcMain.handle(
    "folder-tags:remove",
    wrapIpc<void, [string, string]>(async (_e, folderId, tag) => {
      q.removeFolderTag.run(folderId, normalizeTag(tag))
    }),
  )
}

function normalizeTag(tag: string): string {
  const t = tag.trim().toLowerCase()
  if (!t) {
    throw Object.assign(new Error("tag cannot be empty"), { code: "INVALID_INPUT" })
  }
  return t
}
