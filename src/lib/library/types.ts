export type FolderFileType = "image" | "video" | "document" | "other"

export type AnnotationKind = "rect" | "arrow" | "text" | "highlight"

export interface CommentRecord {
  id: string
  fileId: string
  parentId: string | null
  author: string | null
  text: string
  resolved: boolean
  timestamp: string
}

export interface CreateCommentInput {
  fileId: string
  parentId?: string | null
  author?: string | null
  text: string
}

export interface AnnotationRecord {
  id: string
  fileId: string
  kind: AnnotationKind
  x?: number
  y?: number
  w?: number
  h?: number
  x2?: number
  y2?: number
  color?: string
  text?: string
  createdAt: string
}

export interface CreateAnnotationInput {
  fileId: string
  kind: AnnotationKind
  x?: number
  y?: number
  w?: number
  h?: number
  x2?: number
  y2?: number
  color?: string
  text?: string
}

export interface ReactionRecord {
  fileId: string
  emoji: string
  by: string
}

export interface ReactionToggleInput {
  fileId: string
  emoji: string
  by: string
}

export interface ActivityRecord {
  id: string
  folderId: string
  kind: string
  actor: string | null
  description: string | null
  timestamp: string
}

export interface CreateActivityInput {
  folderId: string
  kind: string
  actor?: string | null
  description?: string | null
}

export interface SavedSearchRecord {
  id: string
  name: string
  query: string
  createdAt: string
}

export interface CustomFieldRecord {
  key: string
  value: string
}

export interface ChecklistItemRecord {
  id: string
  folderId: string
  text: string
  done: boolean
  createdAt: string
}

export interface VersionRecord {
  id: string
  fileId: string
  absPath: string
  size: number | null
  contentHash: string | null
  createdAt: string
}

export interface SmartFolderRecord {
  id: string
  workspaceId: string
  name: string
  rulesJson: string
  sort: string | null
  view: string | null
  density: string | null
  groupKind: string | null
  recentsOnly: boolean
  createdAt: string
}

export interface CreateSmartFolderInput {
  workspaceId?: string
  name: string
  rulesJson: string
  sort?: string | null
  view?: string | null
  density?: string | null
  groupKind?: string | null
  recentsOnly?: boolean
}

export interface UpdateSmartFolderInput {
  id: string
  name: string
  rulesJson: string
  sort?: string | null
  view?: string | null
  density?: string | null
  groupKind?: string | null
  recentsOnly?: boolean
}

export interface CreateFolderInput {
  id?: string
  parentId: string | null
  name: string
  workspaceId?: string
}

export interface FolderRecord {
  id: string
  workspaceId: string
  parentId: string | null
  name: string
  absPath: string
  color?: string
  icon?: string
  coverFileId?: string
  notes?: string
  isFavorite: boolean
  isPinned: boolean
  isArchived: boolean
  isLocked: boolean
  workflowStatus?: "todo" | "in-progress" | "review" | "done"
  dueDate?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  sortOrder: number
}

export interface FileRecord {
  id: string
  folderId: string
  name: string
  absPath: string
  url: string
  type: FolderFileType
  mime?: string
  size?: number
  width?: number
  height?: number
  durationMs?: number
  contentHash?: string
  uploadedAt: string
  modifiedAt: string
  deletedAt?: string
  rotation: number
  flipH: boolean
  flipV: boolean
  isFavorite: boolean
  isPinned: boolean
  ocrText?: string
  caption?: string
  aiTagStatus: "pending" | "done" | "failed" | "skipped"
  description?: string
  geo?: { lat: number; lng: number }
}

export interface UploadItem {
  name: string
  mime: string
  bytes: Uint8Array | ArrayBuffer
}

export interface SearchHit {
  fileId: string
  folderId: string
  matchedField: "name" | "ocr_text" | "caption" | "description"
  snippet: string
}

export type AiProvider = "openai" | "anthropic" | "openrouter"

export interface FsChangedPayload {
  kind: "added" | "removed" | "renamed" | "modified"
  path: string
}

export interface WindowApi {
  library: {
    listAllFolders: () => Promise<FolderRecord[]>
    listFolders: (parentId: string | null) => Promise<FolderRecord[]>
    getFolder: (id: string) => Promise<FolderRecord | null>
    createFolder: (input: CreateFolderInput) => Promise<FolderRecord>
    renameFolder: (id: string, name: string) => Promise<FolderRecord>
    deleteFolder: (id: string) => Promise<void>
    restoreFolder: (id: string) => Promise<void>
    permanentlyDeleteFolder: (id: string) => Promise<void>
    moveFolder: (id: string, newParentId: string | null) => Promise<FolderRecord>
    listDeletedFolders: () => Promise<FolderRecord[]>
  }
  files: {
    listInFolder: (folderId: string) => Promise<FileRecord[]>
    upload: (folderId: string, items: UploadItem[]) => Promise<FileRecord[]>
    delete: (folderId: string, fileId: string) => Promise<void>
    restore: (folderId: string, fileId: string) => Promise<FileRecord>
    move: (srcFolderId: string, fileId: string, dstFolderId: string) => Promise<FileRecord>
    rename: (folderId: string, fileId: string, name: string) => Promise<FileRecord>
    bulkDelete: (folderId: string, fileIds: string[]) => Promise<void>
    bulkMove: (srcFolderId: string, fileIds: string[], dstFolderId: string) => Promise<void>
    revealInOS: (folderId: string, fileId: string) => Promise<void>
    getExif: (fileId: string) => Promise<{ data: Record<string, unknown> | null }>
  }
  comments: {
    list: (fileId: string) => Promise<CommentRecord[]>
    add: (input: CreateCommentInput) => Promise<CommentRecord>
    update: (id: string, text: string) => Promise<CommentRecord>
    delete: (id: string) => Promise<void>
    resolve: (id: string, resolved: boolean) => Promise<CommentRecord>
  }
  annotations: {
    list: (fileId: string) => Promise<AnnotationRecord[]>
    add: (input: CreateAnnotationInput) => Promise<AnnotationRecord>
    delete: (id: string) => Promise<void>
  }
  reactions: {
    list: (fileId: string) => Promise<ReactionRecord[]>
    toggle: (input: ReactionToggleInput) => Promise<{ active: boolean }>
  }
  activity: {
    list: (folderId: string, limit?: number) => Promise<ActivityRecord[]>
    add: (input: CreateActivityInput) => Promise<ActivityRecord>
  }
  savedSearches: {
    list: () => Promise<SavedSearchRecord[]>
    add: (name: string, query: string) => Promise<SavedSearchRecord>
    delete: (id: string) => Promise<void>
  }
  folderFields: {
    list: (folderId: string) => Promise<CustomFieldRecord[]>
    set: (folderId: string, key: string, value: string) => Promise<void>
    remove: (folderId: string, key: string) => Promise<void>
  }
  checklist: {
    list: (folderId: string) => Promise<ChecklistItemRecord[]>
    add: (folderId: string, text: string) => Promise<ChecklistItemRecord>
    toggle: (id: string) => Promise<ChecklistItemRecord>
    rename: (id: string, text: string) => Promise<ChecklistItemRecord>
    remove: (id: string) => Promise<void>
  }
  versions: {
    list: (fileId: string) => Promise<VersionRecord[]>
    snapshot: (fileId: string) => Promise<VersionRecord>
  }
  fileTags: {
    list: (fileId: string) => Promise<string[]>
    add: (fileId: string, tag: string) => Promise<void>
    remove: (fileId: string, tag: string) => Promise<void>
  }
  folderTags: {
    list: (folderId: string) => Promise<string[]>
    add: (folderId: string, tag: string) => Promise<void>
    remove: (folderId: string, tag: string) => Promise<void>
  }
  palette: {
    get: (fileId: string) => Promise<string[]>
    set: (fileId: string, colors: string[]) => Promise<void>
  }
  smartFolders: {
    list: (workspaceId?: string) => Promise<SmartFolderRecord[]>
    add: (input: CreateSmartFolderInput) => Promise<SmartFolderRecord>
    update: (input: UpdateSmartFolderInput) => Promise<SmartFolderRecord>
    delete: (id: string) => Promise<void>
  }
  search: {
    fts: (query: string) => Promise<SearchHit[]>
  }
  ai: {
    setKey: (provider: AiProvider, key: string) => Promise<void>
    getKeyStatus: (provider: AiProvider) => Promise<{ has: boolean }>
    deleteKey: (provider: AiProvider) => Promise<void>
    getPreferredProvider: () => Promise<AiProvider | null>
    setPreferredProvider: (provider: AiProvider | null) => Promise<void>
    autoTag: (
      fileId: string,
      provider?: AiProvider,
    ) => Promise<{ tags: { tag: string; confidence: number }[] }>
    caption: (fileId: string, provider?: AiProvider) => Promise<{ caption: string }>
    ocr: (fileId: string, provider?: AiProvider) => Promise<{ text: string }>
    describeFolder: (
      folderId: string,
      provider?: AiProvider,
    ) => Promise<{ description: string }>
  }
  events: {
    on: (
      event: "fs-changed" | "thumb-ready" | "reconcile-progress",
      handler: (payload: unknown) => void,
    ) => () => void
  }
  shell: {
    revealInExplorer: (absPath: string) => Promise<void>
    openExternal: (url: string) => Promise<void>
  }
  app: {
    getLibraryPath: () => Promise<string>
    hasLibraryPath: () => Promise<boolean>
    setLibraryPath: (absPath: string) => Promise<void>
    getVersion: () => Promise<string>
    relaunch: () => Promise<void>
  }
}

declare global {
  interface Window {
    api: WindowApi
  }
}

export {}
