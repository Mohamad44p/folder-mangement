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
    restore: (fid, fileId) => invoke("files:restore", fid, fileId),
    move: (src, fileId, dst) => invoke("files:move", src, fileId, dst),
    rename: (fid, fileId, name) => invoke("files:rename", fid, fileId, name),
    bulkDelete: (fid, ids) => invoke("files:bulk-delete", fid, ids),
    bulkMove: (src, ids, dst) => invoke("files:bulk-move", src, ids, dst),
    revealInOS: (fid, fileId) => invoke("files:reveal-in-os", fid, fileId),
    getExif: (fileId) => invoke("files:get-exif", fileId),
  },
  comments: {
    list: (fileId) => invoke("comments:list", fileId),
    add: (input) => invoke("comments:add", input),
    update: (id, text) => invoke("comments:update", id, text),
    delete: (id) => invoke("comments:delete", id),
    resolve: (id, resolved) => invoke("comments:resolve", id, resolved),
  },
  annotations: {
    list: (fileId) => invoke("annotations:list", fileId),
    add: (input) => invoke("annotations:add", input),
    delete: (id) => invoke("annotations:delete", id),
  },
  reactions: {
    list: (fileId) => invoke("reactions:list", fileId),
    toggle: (input) => invoke("reactions:toggle", input),
  },
  activity: {
    list: (folderId, limit) => invoke("activity:list", folderId, limit),
    add: (input) => invoke("activity:add", input),
  },
  savedSearches: {
    list: () => invoke("saved-searches:list"),
    add: (name, query) => invoke("saved-searches:add", name, query),
    delete: (id) => invoke("saved-searches:delete", id),
  },
  folderFields: {
    list: (folderId) => invoke("folder-fields:list", folderId),
    set: (folderId, key, value) => invoke("folder-fields:set", folderId, key, value),
    remove: (folderId, key) => invoke("folder-fields:remove", folderId, key),
  },
  checklist: {
    list: (folderId) => invoke("checklist:list", folderId),
    add: (folderId, text) => invoke("checklist:add", folderId, text),
    toggle: (id) => invoke("checklist:toggle", id),
    rename: (id, text) => invoke("checklist:rename", id, text),
    remove: (id) => invoke("checklist:remove", id),
  },
  versions: {
    list: (fileId) => invoke("versions:list", fileId),
    snapshot: (fileId) => invoke("versions:snapshot", fileId),
  },
  fileTags: {
    list: (fileId) => invoke("file-tags:list", fileId),
    add: (fileId, tag) => invoke("file-tags:add", fileId, tag),
    remove: (fileId, tag) => invoke("file-tags:remove", fileId, tag),
  },
  folderTags: {
    list: (folderId) => invoke("folder-tags:list", folderId),
    add: (folderId, tag) => invoke("folder-tags:add", folderId, tag),
    remove: (folderId, tag) => invoke("folder-tags:remove", folderId, tag),
  },
  palette: {
    get: (fileId) => invoke("palette:get", fileId),
    set: (fileId, colors) => invoke("palette:set", fileId, colors),
  },
  smartFolders: {
    list: (workspaceId) => invoke("smart-folders:list", workspaceId),
    add: (input) => invoke("smart-folders:add", input),
    update: (input) => invoke("smart-folders:update", input),
    delete: (id) => invoke("smart-folders:delete", id),
  },
  search: {
    fts: (q) => invoke("search:fts", q),
  },
  ai: {
    setKey: (provider, key) => invoke("ai:set-key", provider, key),
    getKeyStatus: (provider) => invoke("ai:get-key-status", provider),
    deleteKey: (provider) => invoke("ai:delete-key", provider),
    getPreferredProvider: () => invoke("ai:get-preferred"),
    setPreferredProvider: (provider) => invoke("ai:set-preferred", provider),
    autoTag: (fileId, provider) => invoke("ai:auto-tag", fileId, provider),
    caption: (fileId, provider) => invoke("ai:caption", fileId, provider),
    ocr: (fileId, provider) => invoke("ai:ocr", fileId, provider),
    describeFolder: (folderId, provider) =>
      invoke("ai:describe-folder", folderId, provider),
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
