export type FolderFileType = "image" | "video" | "document" | "other"

export interface CreateFolderInput {
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

export type AiProvider = "openai" | "anthropic" | "google"

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
    move: (srcFolderId: string, fileId: string, dstFolderId: string) => Promise<FileRecord>
    rename: (folderId: string, fileId: string, name: string) => Promise<FileRecord>
    bulkDelete: (folderId: string, fileIds: string[]) => Promise<void>
    bulkMove: (srcFolderId: string, fileIds: string[], dstFolderId: string) => Promise<void>
    revealInOS: (folderId: string, fileId: string) => Promise<void>
  }
  search: {
    fts: (query: string) => Promise<SearchHit[]>
  }
  ai: {
    setKey: (provider: AiProvider, key: string) => Promise<void>
    getKeyStatus: (provider: AiProvider) => Promise<{ has: boolean }>
    deleteKey: (provider: AiProvider) => Promise<void>
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
