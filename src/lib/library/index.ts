import "./types"
import type {
  CreateFolderInput,
  FolderRecord,
  FileRecord,
  UploadItem,
  SearchHit,
  AiProvider,
  CommentRecord,
  CreateCommentInput,
  AnnotationRecord,
  CreateAnnotationInput,
  ReactionRecord,
  ReactionToggleInput,
  ActivityRecord,
  CreateActivityInput,
  SavedSearchRecord,
  CustomFieldRecord,
  ChecklistItemRecord,
  VersionRecord,
  SmartFolderRecord,
  CreateSmartFolderInput,
  UpdateSmartFolderInput,
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
    restore: (folderId: string, fileId: string) =>
      window.api.files.restore(folderId, fileId),
    bulkDelete: (folderId: string, ids: string[]) =>
      window.api.files.bulkDelete(folderId, ids),
    bulkMove: (src: string, ids: string[], dst: string) =>
      window.api.files.bulkMove(src, ids, dst),
    revealInOS: (folderId: string, fileId: string) =>
      window.api.files.revealInOS(folderId, fileId),
    getExif: (fileId: string) => window.api.files.getExif(fileId),
  },
  search: {
    fts: (q: string) => window.api.search.fts(q),
  },
  ai: {
    setKey: (provider: AiProvider, key: string) => window.api.ai.setKey(provider, key),
    getKeyStatus: (provider: AiProvider) => window.api.ai.getKeyStatus(provider),
    deleteKey: (provider: AiProvider) => window.api.ai.deleteKey(provider),
    getPreferredProvider: () => window.api.ai.getPreferredProvider(),
    setPreferredProvider: (provider: AiProvider | null) =>
      window.api.ai.setPreferredProvider(provider),
    autoTag: (fileId: string, provider?: AiProvider) =>
      window.api.ai.autoTag(fileId, provider),
    caption: (fileId: string, provider?: AiProvider) =>
      window.api.ai.caption(fileId, provider),
    ocr: (fileId: string, provider?: AiProvider) =>
      window.api.ai.ocr(fileId, provider),
    describeFolder: (folderId: string, provider?: AiProvider) =>
      window.api.ai.describeFolder(folderId, provider),
  },
  comments: {
    list: (fileId: string) => window.api.comments.list(fileId),
    add: (input: CreateCommentInput) => window.api.comments.add(input),
    update: (id: string, text: string) => window.api.comments.update(id, text),
    delete: (id: string) => window.api.comments.delete(id),
    resolve: (id: string, resolved: boolean) =>
      window.api.comments.resolve(id, resolved),
  },
  annotations: {
    list: (fileId: string) => window.api.annotations.list(fileId),
    add: (input: CreateAnnotationInput) => window.api.annotations.add(input),
    delete: (id: string) => window.api.annotations.delete(id),
  },
  reactions: {
    list: (fileId: string) => window.api.reactions.list(fileId),
    toggle: (input: ReactionToggleInput) => window.api.reactions.toggle(input),
  },
  activity: {
    list: (folderId: string, limit?: number) =>
      window.api.activity.list(folderId, limit),
    add: (input: CreateActivityInput) => window.api.activity.add(input),
  },
  savedSearches: {
    list: () => window.api.savedSearches.list(),
    add: (name: string, query: string) => window.api.savedSearches.add(name, query),
    delete: (id: string) => window.api.savedSearches.delete(id),
  },
  folderFields: {
    list: (folderId: string) => window.api.folderFields.list(folderId),
    set: (folderId: string, key: string, value: string) =>
      window.api.folderFields.set(folderId, key, value),
    remove: (folderId: string, key: string) =>
      window.api.folderFields.remove(folderId, key),
  },
  checklist: {
    list: (folderId: string) => window.api.checklist.list(folderId),
    add: (folderId: string, text: string) => window.api.checklist.add(folderId, text),
    toggle: (id: string) => window.api.checklist.toggle(id),
    rename: (id: string, text: string) => window.api.checklist.rename(id, text),
    remove: (id: string) => window.api.checklist.remove(id),
  },
  versions: {
    list: (fileId: string) => window.api.versions.list(fileId),
    snapshot: (fileId: string) => window.api.versions.snapshot(fileId),
  },
  fileTags: {
    list: (fileId: string) => window.api.fileTags.list(fileId),
    add: (fileId: string, tag: string) => window.api.fileTags.add(fileId, tag),
    remove: (fileId: string, tag: string) => window.api.fileTags.remove(fileId, tag),
  },
  folderTags: {
    list: (folderId: string) => window.api.folderTags.list(folderId),
    add: (folderId: string, tag: string) => window.api.folderTags.add(folderId, tag),
    remove: (folderId: string, tag: string) =>
      window.api.folderTags.remove(folderId, tag),
  },
  palette: {
    get: (fileId: string) => window.api.palette.get(fileId),
    set: (fileId: string, colors: string[]) => window.api.palette.set(fileId, colors),
  },
  smartFolders: {
    list: (workspaceId?: string) => window.api.smartFolders.list(workspaceId),
    add: (input: CreateSmartFolderInput) => window.api.smartFolders.add(input),
    update: (input: UpdateSmartFolderInput) => window.api.smartFolders.update(input),
    delete: (id: string) => window.api.smartFolders.delete(id),
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
  CommentRecord,
  CreateCommentInput,
  AnnotationRecord,
  CreateAnnotationInput,
  ReactionRecord,
  ReactionToggleInput,
  ActivityRecord,
  CreateActivityInput,
  SavedSearchRecord,
  CustomFieldRecord,
  ChecklistItemRecord,
  VersionRecord,
  SmartFolderRecord,
  CreateSmartFolderInput,
  UpdateSmartFolderInput,
}
