import type Database from "better-sqlite3"
import { ipcMain, shell } from "electron"
import { Queries } from "../db/queries"
import { wrapIpc } from "./envelope"
import type { FilesService } from "./files"
import type { FileRecord, UploadItem } from "../../src/lib/library/types"

export function registerFilesIpc(svc: FilesService, db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "files:list-in-folder",
    wrapIpc<FileRecord[], [string]>(async (_e, fid) => svc.listInFolder(fid)),
  )
  ipcMain.handle(
    "files:upload",
    wrapIpc<FileRecord[], [string, UploadItem[]]>(async (_e, fid, items) =>
      svc.upload(fid, items),
    ),
  )
  ipcMain.handle(
    "files:rename",
    wrapIpc<FileRecord, [string, string, string]>(async (_e, fid, fileId, name) =>
      svc.rename(fid, fileId, name),
    ),
  )
  ipcMain.handle(
    "files:move",
    wrapIpc<FileRecord, [string, string, string]>(async (_e, src, fileId, dst) =>
      svc.move(src, fileId, dst),
    ),
  )
  ipcMain.handle(
    "files:delete",
    wrapIpc<void, [string, string]>(async (_e, fid, fileId) =>
      svc.delete(fid, fileId),
    ),
  )
  ipcMain.handle(
    "files:bulk-delete",
    wrapIpc<void, [string, string[]]>(async (_e, fid, ids) =>
      svc.bulkDelete(fid, ids),
    ),
  )
  ipcMain.handle(
    "files:bulk-move",
    wrapIpc<void, [string, string[], string]>(async (_e, src, ids, dst) =>
      svc.bulkMove(src, ids, dst),
    ),
  )

  ipcMain.handle(
    "files:reveal-in-os",
    wrapIpc<void, [string, string]>(async (_e, _folderId, fileId) => {
      const row = q.getFileById.get(fileId) as { abs_path: string } | undefined
      if (row) shell.showItemInFolder(row.abs_path)
    }),
  )
}
