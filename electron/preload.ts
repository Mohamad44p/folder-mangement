import { contextBridge, ipcRenderer } from "electron"
import type {
  WindowApi,
  FsChangedPayload,
} from "../src/lib/library/types"

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (!result.ok) {
    const err = new Error(result.error.message) as Error & { code?: string }
    err.code = result.error.code
    throw err
  }
  return result.data
}

const api: WindowApi = {
  library: {
    listAllFolders: () => invoke("library:list-all-folders"),
    listFolders: (parentId) => invoke("library:list-folders", parentId),
    getFolder: (id) => invoke("library:get-folder", id),
    createFolder: (input) => invoke("library:create-folder", input),
    renameFolder: (id, name) => invoke("library:rename-folder", id, name),
    deleteFolder: (id) => invoke("library:delete-folder", id),
    restoreFolder: (id) => invoke("library:restore-folder", id),
    permanentlyDeleteFolder: (id) => invoke("library:permanently-delete-folder", id),
    moveFolder: (id, np) => invoke("library:move-folder", id, np),
    listDeletedFolders: () => invoke("library:list-deleted-folders"),
  },
  files: {
    listInFolder: (fid) => invoke("files:list-in-folder", fid),
    upload: (fid, items) => invoke("files:upload", fid, items),
    delete: (fid, fileId) => invoke("files:delete", fid, fileId),
    move: (src, fileId, dst) => invoke("files:move", src, fileId, dst),
    rename: (fid, fileId, name) => invoke("files:rename", fid, fileId, name),
    bulkDelete: (fid, ids) => invoke("files:bulk-delete", fid, ids),
    bulkMove: (src, ids, dst) => invoke("files:bulk-move", src, ids, dst),
    revealInOS: (fid, fileId) => invoke("files:reveal-in-os", fid, fileId),
  },
  search: {
    fts: (q) => invoke("search:fts", q),
  },
  ai: {
    setKey: (provider, key) => invoke("ai:set-key", provider, key),
    getKeyStatus: (provider) => invoke("ai:get-key-status", provider),
    deleteKey: (provider) => invoke("ai:delete-key", provider),
    autoTag: (fileId, provider) => invoke("ai:auto-tag", fileId, provider),
    caption: (fileId, provider) => invoke("ai:caption", fileId, provider),
  },
  events: {
    on: (event, handler) => {
      const channel = `event:${event}`
      const listener = (_e: unknown, payload: unknown) =>
        handler(payload as FsChangedPayload)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.off(channel, listener)
    },
  },
  shell: {
    revealInExplorer: (absPath) => invoke("shell:reveal", absPath),
    openExternal: (url) => invoke("shell:open-external", url),
  },
  app: {
    getLibraryPath: () => invoke("app:get-library-path"),
    hasLibraryPath: () => invoke("app:has-library-path"),
    setLibraryPath: (absPath) => invoke("app:set-library-path", absPath),
    getVersion: () => invoke("app:get-version"),
    relaunch: () => invoke("app:relaunch"),
  },
}

contextBridge.exposeInMainWorld("api", api)
