import "./types"
import type {
  CreateFolderInput,
  FolderRecord,
  FileRecord,
  UploadItem,
  SearchHit,
  AiProvider,
} from "./types"

export const library = {
  folders: {
    listAll: () => window.api.library.listAllFolders(),
    list: (parentId: string | null) => window.api.library.listFolders(parentId),
    get: (id: string) => window.api.library.getFolder(id),
    create: (input: CreateFolderInput) => window.api.library.createFolder(input),
    rename: (id: string, name: string) => window.api.library.renameFolder(id, name),
    delete: (id: string) => window.api.library.deleteFolder(id),
    restore: (id: string) => window.api.library.restoreFolder(id),
    permanentlyDelete: (id: string) => window.api.library.permanentlyDeleteFolder(id),
    move: (id: string, np: string | null) => window.api.library.moveFolder(id, np),
    listDeleted: () => window.api.library.listDeletedFolders(),
  },
  files: {
    list: (folderId: string) => window.api.files.listInFolder(folderId),
    upload: (folderId: string, items: UploadItem[]) =>
      window.api.files.upload(folderId, items),
    rename: (folderId: string, fileId: string, name: string) =>
      window.api.files.rename(folderId, fileId, name),
    move: (src: string, fileId: string, dst: string) =>
      window.api.files.move(src, fileId, dst),
    delete: (folderId: string, fileId: string) =>
      window.api.files.delete(folderId, fileId),
    bulkDelete: (folderId: string, ids: string[]) =>
      window.api.files.bulkDelete(folderId, ids),
    bulkMove: (src: string, ids: string[], dst: string) =>
      window.api.files.bulkMove(src, ids, dst),
    revealInOS: (folderId: string, fileId: string) =>
      window.api.files.revealInOS(folderId, fileId),
  },
  search: {
    fts: (q: string) => window.api.search.fts(q),
  },
  ai: {
    setKey: (provider: AiProvider, key: string) => window.api.ai.setKey(provider, key),
    getKeyStatus: (provider: AiProvider) => window.api.ai.getKeyStatus(provider),
    deleteKey: (provider: AiProvider) => window.api.ai.deleteKey(provider),
    autoTag: (fileId: string, provider?: AiProvider) =>
      window.api.ai.autoTag(fileId, provider),
    caption: (fileId: string, provider?: AiProvider) =>
      window.api.ai.caption(fileId, provider),
  },
  events: {
    on: (
      event: "fs-changed" | "thumb-ready" | "reconcile-progress",
      h: (p: unknown) => void,
    ) => window.api.events.on(event, h),
  },
  app: {
    getLibraryPath: () => window.api.app.getLibraryPath(),
    hasLibraryPath: () => window.api.app.hasLibraryPath(),
    setLibraryPath: (p: string) => window.api.app.setLibraryPath(p),
    getVersion: () => window.api.app.getVersion(),
  },
}

export type {
  FolderRecord,
  FileRecord,
  UploadItem,
  SearchHit,
  AiProvider,
  CreateFolderInput,
}
