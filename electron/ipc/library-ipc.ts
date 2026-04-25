import { ipcMain } from "electron"
import { wrapIpc } from "./envelope"
import type { LibraryService } from "./library"
import type { CreateFolderInput, FolderRecord } from "../../src/lib/library/types"

export function registerLibraryIpc(svc: LibraryService): void {
  ipcMain.handle(
    "library:list-all-folders",
    wrapIpc<FolderRecord[]>(async () => svc.listAllFolders()),
  )
  ipcMain.handle(
    "library:list-folders",
    wrapIpc<FolderRecord[], [string | null]>(async (_e, parentId) =>
      svc.listFolders(parentId),
    ),
  )
  ipcMain.handle(
    "library:get-folder",
    wrapIpc<FolderRecord | null, [string]>(async (_e, id) => svc.getFolder(id)),
  )
  ipcMain.handle(
    "library:create-folder",
    wrapIpc<FolderRecord, [CreateFolderInput]>(async (_e, input) =>
      svc.createFolder(input),
    ),
  )
  ipcMain.handle(
    "library:rename-folder",
    wrapIpc<FolderRecord, [string, string]>(async (_e, id, name) =>
      svc.renameFolder(id, name),
    ),
  )
  ipcMain.handle(
    "library:delete-folder",
    wrapIpc<void, [string]>(async (_e, id) => svc.deleteFolder(id)),
  )
  ipcMain.handle(
    "library:restore-folder",
    wrapIpc<void, [string]>(async (_e, id) => svc.restoreFolder(id)),
  )
  ipcMain.handle(
    "library:permanently-delete-folder",
    wrapIpc<void, [string]>(async (_e, id) => svc.permanentlyDeleteFolder(id)),
  )
  ipcMain.handle(
    "library:move-folder",
    wrapIpc<FolderRecord, [string, string | null]>(async (_e, id, np) =>
      svc.moveFolder(id, np),
    ),
  )
  ipcMain.handle(
    "library:list-deleted-folders",
    wrapIpc<FolderRecord[]>(async () => svc.listDeletedFolders()),
  )
}
