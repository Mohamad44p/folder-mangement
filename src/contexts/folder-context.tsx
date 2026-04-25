"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  projects as seedProjects,
  DEFAULT_SMART_FOLDERS,
  DEFAULT_WORKSPACES,
  type ActivityEntry,
  type ActivityKind,
  type ChecklistItem,
  type FileAnnotation,
  type FileComment,
  type FileReaction,
  type FolderFile,
  type Project,
  type SavedSearch,
  type ShareInfo,
  type SharePermission,
  type SmartFolder,
  type Workspace,
  type WorkflowStatus,
} from "@/lib/data"
import {
  detectFileType,
  hydrateFromLibrary,
  libraryCreateFolder,
  libraryDeleteFolder,
  libraryRenameFolder,
  libraryUploadFiles,
  loadFolders,
  readFileAsDataURL,
  saveFolders,
} from "@/lib/folder-storage"
import { library } from "@/lib/library"
import { applyPattern } from "@/lib/rename-pattern"
import { toast } from "sonner"

function isElectronEnv(): boolean {
  return typeof window !== "undefined" && !!window.api?.library
}

function genUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // Fallback (non-crypto) — only hit in very old environments.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export type SortKey = "created-desc" | "created-asc" | "name-asc" | "name-desc" | "count-desc" | "updated-desc"
export type FilterKind = "all" | "empty" | "non-empty" | "with-images" | "favorites"
export type FileSortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc" | "size-desc" | "size-asc" | "type"
export type FileFilterKind = "all" | "image" | "video" | "document" | "other" | "favorites"
export type ViewMode = "grid" | "list" | "large" | "calendar" | "map"
export type GroupKind = "none" | "type" | "date"

export interface FolderWithMeta extends Project {
  isNew?: boolean
  isVisible?: boolean
}

export interface SearchHit {
  kind: "folder" | "file"
  folderId: string
  folderTitle: string
  fileId?: string
  fileName?: string
  fileUrl?: string
  matchedField: string
  snippet: string
  pathTitles: string[]
}

export interface FolderTreeNode {
  folder: FolderWithMeta
  children: FolderTreeNode[]
}

export interface Stats {
  totalFolders: number
  totalSubfolders: number
  totalFiles: number
  totalSize: number
  trashCount: number
  favoritesCount: number
}

export interface DuplicateGroup {
  key: string
  files: { file: FolderFile; folderId: string; folderTitle: string }[]
}

export interface StorageSlice {
  folderId: string
  title: string
  bytes: number
  color?: string
}

export interface ActivityDay {
  date: string
  count: number
}

export interface NotificationItem {
  id: string
  folderId: string
  folderTitle: string
  message: string
  timestamp: string
  read: boolean
}

interface FolderContextType {
  folders: FolderWithMeta[]
  rootFolders: FolderWithMeta[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  sortKey: SortKey
  setSortKey: (k: SortKey) => void
  filterKind: FilterKind
  setFilterKind: (k: FilterKind) => void
  selectedTags: string[]
  toggleTag: (tag: string) => void
  clearTags: () => void
  allTags: string[]

  createFolder: (init?: Partial<Project>) => string
  createEmptyFolder: (parentId?: string | null) => string
  createFromTemplate: (parentId: string | null, root: Partial<Project>, subfolders: Partial<Project>[]) => string
  deleteFolder: (id: string) => void
  permanentlyDeleteFolder: (id: string) => void
  restoreFolder: (id: string) => void
  emptyTrash: () => void
  renameFolder: (id: string, title: string) => void
  updateFolderMetadata: (id: string, patch: Partial<Project>) => void
  setFolderGenerating: (id: string, generating: boolean) => void
  toggleFolderFavorite: (id: string) => void
  toggleFolderPin: (id: string) => void
  setFolderColor: (id: string, color: string | undefined) => void
  setFolderIcon: (id: string, icon: string | undefined) => void
  setFolderCover: (id: string, fileId: string | undefined) => void
  setFolderNotes: (id: string, notes: string) => void
  duplicateFolder: (id: string) => string | null
  moveFolder: (id: string, newParentId: string | null) => void
  shareFolder: (id: string, permission: SharePermission) => void
  updateSharePermission: (id: string, permission: SharePermission) => void
  addSharedWith: (id: string, name: string, email?: string) => void
  removeSharedWith: (id: string, name: string) => void
  unshareFolder: (id: string) => void

  uploadFiles: (folderId: string, files: FileList | File[]) => Promise<void>
  deleteFile: (folderId: string, fileId: string) => void
  renameFile: (folderId: string, fileId: string, name: string) => void
  updateFileMetadata: (folderId: string, fileId: string, patch: Partial<FolderFile>) => void
  toggleFileFavorite: (folderId: string, fileId: string) => void
  bulkDeleteFiles: (folderId: string, fileIds: string[]) => void
  bulkMoveFiles: (sourceFolderId: string, fileIds: string[], destFolderId: string) => void
  moveFile: (sourceFolderId: string, fileId: string, destFolderId: string) => void
  bulkRenameFiles: (folderId: string, fileIds: string[], pattern: string) => void
  bulkUpdateFiles: (folderId: string, fileIds: string[], patch: Partial<FolderFile>) => void
  bulkAddTagsToFiles: (folderId: string, fileIds: string[], tags: string[]) => void
  bulkRemoveTagsFromFiles: (folderId: string, fileIds: string[], tags: string[]) => void

  getFolder: (id: string) => FolderWithMeta | undefined
  getSubfolders: (parentId: string | null) => FolderWithMeta[]
  getDisplayFolders: () => FolderWithMeta[]
  getDisplayFoldersIn: (parentId: string | null) => FolderWithMeta[]
  getTrashed: () => FolderWithMeta[]
  getFavorites: () => FolderWithMeta[]
  getRecents: () => FolderWithMeta[]
  getFolderTree: () => FolderTreeNode[]
  getStats: () => Stats
  getDescendantIds: (id: string) => string[]
  buildPathTitles: (id: string) => string[]
  getDuplicates: () => DuplicateGroup[]
  getStorageBreakdown: () => StorageSlice[]

  openFolderId: string | null
  navigationStack: string[]
  openFolder: (id: string) => void
  closeFolder: () => void
  navigateToSubfolder: (id: string) => void
  navigateBack: () => void
  navigateToBreadcrumb: (id: string) => void

  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  globalSearch: (q: string) => SearchHit[]

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  trashOpen: boolean
  setTrashOpen: (open: boolean) => void

  lightbox: { folderId: string; fileId: string } | null
  openLightbox: (folderId: string, fileId: string) => void
  closeLightbox: () => void

  // Smart folders
  smartFolders: SmartFolder[]
  addSmartFolder: (s: Omit<SmartFolder, "id">) => string
  updateSmartFolder: (id: string, patch: Partial<SmartFolder>) => void
  deleteSmartFolder: (id: string) => void
  openSmartFolderId: string | null
  openSmartFolder: (id: string | null) => void

  // Saved searches
  savedSearches: SavedSearch[]
  addSavedSearch: (name: string, query: string) => string
  deleteSavedSearch: (id: string) => void

  // Slideshow
  slideshow: { folderId: string } | null
  startSlideshow: (folderId: string) => void
  stopSlideshow: () => void

  // Compare
  compare: { folderId: string; fileIdA: string; fileIdB: string } | null
  openCompare: (folderId: string, a: string, b: string) => void
  closeCompare: () => void

  // Modals
  templatePickerOpen: boolean
  setTemplatePickerOpen: (open: boolean) => void
  duplicateFinderOpen: boolean
  setDuplicateFinderOpen: (open: boolean) => void
  smartFolderEditor: { mode: "new" } | { mode: "edit"; id: string } | null
  setSmartFolderEditor: (state: { mode: "new" } | { mode: "edit"; id: string } | null) => void
  shareDialogOpen: string | null
  setShareDialogOpen: (folderId: string | null) => void
  bulkRenameOpen: { folderId: string; fileIds: string[] } | null
  setBulkRenameOpen: (state: { folderId: string; fileIds: string[] } | null) => void
  bulkEditOpen: { folderId: string; fileIds: string[] } | null
  setBulkEditOpen: (state: { folderId: string; fileIds: string[] } | null) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void

  appendActivity: (folderId: string, kind: ActivityKind, description: string) => void

  // Workflows
  setFolderStatus: (id: string, status: WorkflowStatus | undefined) => void
  setFolderDueDate: (id: string, due: string | undefined) => void
  setFolderLocked: (id: string, locked: boolean) => void
  archiveFolder: (id: string) => void
  unarchiveFolder: (id: string) => void
  setCustomField: (id: string, key: string, value: string) => void
  removeCustomField: (id: string, key: string) => void
  addChecklistItem: (id: string, text: string) => void
  toggleChecklistItem: (id: string, itemId: string) => void
  removeChecklistItem: (id: string, itemId: string) => void
  markFolderViewed: (id: string) => void

  // Per-file ops
  togglePinFile: (folderId: string, fileId: string) => void
  rotateFile: (folderId: string, fileId: string, delta: number) => void
  flipFile: (folderId: string, fileId: string, axis: "h" | "v") => void
  setFileAnnotations: (folderId: string, fileId: string, ann: FileAnnotation[]) => void
  addFileComment: (folderId: string, fileId: string, text: string, author?: string, parentId?: string) => void
  removeFileComment: (folderId: string, fileId: string, commentId: string) => void
  toggleFileReaction: (folderId: string, fileId: string, emoji: string, by?: string) => void
  setFileExif: (folderId: string, fileId: string, exif: Record<string, string>) => void
  setFilePalette: (folderId: string, fileId: string, palette: string[]) => void
  setFileDimensions: (folderId: string, fileId: string, dims: { width: number; height: number }) => void
  setFileAiTags: (folderId: string, fileId: string, tags: { tag: string; confidence: number }[]) => void
  setFileOcr: (folderId: string, fileId: string, text: string) => void
  setFileGeo: (folderId: string, fileId: string, geo: { lat: number; lng: number } | undefined) => void

  // Share extras
  setShareExpiry: (id: string, expiresAt: string | undefined) => void
  setSharePassword: (id: string, password: string | undefined) => void

  // Tabs
  tabs: string[]
  activeTab: string | null
  addTab: (id: string) => void
  removeTab: (id: string) => void
  switchTab: (id: string) => void

  // Recently closed
  recentlyClosed: string[]
  reopenLastClosed: () => void

  // Workspaces
  workspaces: Workspace[]
  activeWorkspaceId: string
  switchWorkspace: (id: string) => void
  addWorkspace: (name: string, icon: string) => string
  renameWorkspace: (id: string, name: string) => void
  deleteWorkspace: (id: string) => void

  // Shortcuts
  customShortcuts: Record<string, string>
  setShortcut: (id: string, keys: string) => void
  resetShortcuts: () => void

  // Onboarding
  onboardingComplete: boolean
  setOnboardingComplete: (v: boolean) => void

  // Layout
  twoPaneMode: boolean
  setTwoPaneMode: (v: boolean) => void

  // Modal triggers
  crossFolderRenameOpen: boolean
  setCrossFolderRenameOpen: (open: boolean) => void
  exportModalOpen: boolean
  setExportModalOpen: (open: boolean) => void
  importModalOpen: boolean
  setImportModalOpen: (open: boolean) => void
  shortcutsModalOpen: boolean
  setShortcutsModalOpen: (open: boolean) => void
  heatmapModalOpen: boolean
  setHeatmapModalOpen: (open: boolean) => void
  imageSearchTarget: { folderId: string; fileId: string } | null
  setImageSearchTarget: (t: { folderId: string; fileId: string } | null) => void
  workspacesModalOpen: boolean
  setWorkspacesModalOpen: (open: boolean) => void

  // Activity heatmap data
  getActivityHeatmap: (year?: number) => ActivityDay[]

  // Library import/replace
  replaceLibrary: (folders: Project[]) => void
  mergeLibrary: (folders: Project[]) => void

  // Cross-folder bulk rename
  crossFolderRename: (matcher: (file: FolderFile, folder: Project) => boolean, pattern: string) => number
}

const FolderContext = createContext<FolderContextType | null>(null)

const RECENTS_KEY = "folder-mgr:recents:v1"
const SMART_KEY = "folder-mgr:smart:v1"
const SEARCHES_KEY = "folder-mgr:searches:v1"
const WORKSPACES_KEY = "folder-mgr:workspaces:v1"
const ACTIVE_WORKSPACE_KEY = "folder-mgr:activeWorkspace:v1"
const SHORTCUTS_KEY = "folder-mgr:shortcuts:v1"
const ONBOARDING_KEY = "folder-mgr:onboarded:v1"
const TWOPANE_KEY = "folder-mgr:twopane:v1"

const seedWithDefaults = (list: Project[]): Project[] =>
  list.map((p) => ({
    ...p,
    parentId: p.parentId ?? null,
  }))

function genId(prefix = "f"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function previewImagesFromFiles(files: FolderFile[] | undefined, fallback: string[] = []): string[] {
  const imgs = (files ?? []).filter((f) => f.type === "image").map((f) => f.url)
  if (imgs.length >= 1) return imgs.slice(0, 5)
  return fallback.slice(0, 5)
}

function makeActivity(kind: ActivityKind, description: string, actor = "You"): ActivityEntry {
  return {
    id: genId("act"),
    timestamp: new Date().toISOString(),
    kind,
    actor,
    description,
  }
}

export function FolderProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<FolderWithMeta[]>(() => seedWithDefaults(seedProjects))
  const [hydrated, setHydrated] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("created-desc")
  const [filterKind, setFilterKind] = useState<FilterKind>("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [navigationStack, setNavigationStack] = useState<string[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [trashOpen, setTrashOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ folderId: string; fileId: string } | null>(null)
  const [recentIds, setRecentIds] = useState<string[]>([])

  const [smartFolders, setSmartFolders] = useState<SmartFolder[]>(DEFAULT_SMART_FOLDERS)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [openSmartFolderId, setOpenSmartFolderId] = useState<string | null>(null)
  const [slideshow, setSlideshow] = useState<{ folderId: string } | null>(null)
  const [compare, setCompare] = useState<{ folderId: string; fileIdA: string; fileIdB: string } | null>(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [duplicateFinderOpen, setDuplicateFinderOpen] = useState(false)
  const [smartFolderEditor, setSmartFolderEditor] = useState<{ mode: "new" } | { mode: "edit"; id: string } | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState<string | null>(null)
  const [bulkRenameOpen, setBulkRenameOpen] = useState<{ folderId: string; fileIds: string[] } | null>(null)
  const [bulkEditOpen, setBulkEditOpen] = useState<{ folderId: string; fileIds: string[] } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // New state for the 40 features
  const [tabs, setTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [recentlyClosed, setRecentlyClosed] = useState<string[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>(DEFAULT_WORKSPACES)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("default")
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>({})
  const [onboardingComplete, setOnboardingCompleteState] = useState(false)
  const [twoPaneMode, setTwoPaneModeState] = useState(false)
  const [crossFolderRenameOpen, setCrossFolderRenameOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [heatmapModalOpen, setHeatmapModalOpen] = useState(false)
  const [imageSearchTarget, setImageSearchTarget] = useState<{ folderId: string; fileId: string } | null>(null)
  const [workspacesModalOpen, setWorkspacesModalOpen] = useState(false)

  const animatingRef = useRef(false)

  // Hydrate
  useEffect(() => {
    const stored = loadFolders()
    if (stored && stored.length > 0) {
      setFolders(stored as FolderWithMeta[])
    }
    // In Electron, the SQLite library is the source of truth — override
    // localStorage state once the async hydration finishes.
    void (async () => {
      try {
        const fromLibrary = await hydrateFromLibrary()
        if (fromLibrary) setFolders(fromLibrary as FolderWithMeta[])
      } catch (err) {
        console.error("Failed to hydrate from library:", err)
      }
    })()
    try {
      const raw = window.localStorage.getItem(RECENTS_KEY)
      if (raw) setRecentIds(JSON.parse(raw))
    } catch {}
    try {
      const raw = window.localStorage.getItem(SMART_KEY)
      if (raw) setSmartFolders(JSON.parse(raw))
    } catch {}
    try {
      const raw = window.localStorage.getItem(SEARCHES_KEY)
      if (raw) setSavedSearches(JSON.parse(raw))
    } catch {}
    try {
      const raw = window.localStorage.getItem(WORKSPACES_KEY)
      if (raw) setWorkspaces(JSON.parse(raw))
    } catch {}
    try {
      const raw = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY)
      if (raw) setActiveWorkspaceId(raw)
    } catch {}
    try {
      const raw = window.localStorage.getItem(SHORTCUTS_KEY)
      if (raw) setCustomShortcuts(JSON.parse(raw))
    } catch {}
    try {
      const raw = window.localStorage.getItem(ONBOARDING_KEY)
      if (raw === "1") setOnboardingCompleteState(true)
    } catch {}
    try {
      const raw = window.localStorage.getItem(TWOPANE_KEY)
      if (raw === "1") setTwoPaneModeState(true)
    } catch {}
    setHydrated(true)
  }, [])

  // Persist folders
  useEffect(() => {
    if (!hydrated) return
    const stripped = folders.map(({ isNew, isVisible, ...rest }) => rest)
    saveFolders(stripped)
  }, [folders, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recentIds))
    } catch {}
  }, [recentIds, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(SMART_KEY, JSON.stringify(smartFolders))
    } catch {}
  }, [smartFolders, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(SEARCHES_KEY, JSON.stringify(savedSearches))
    } catch {}
  }, [savedSearches, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try { window.localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces)) } catch {}
  }, [workspaces, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try { window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId) } catch {}
  }, [activeWorkspaceId, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try { window.localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(customShortcuts)) } catch {}
  }, [customShortcuts, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try { window.localStorage.setItem(ONBOARDING_KEY, onboardingComplete ? "1" : "0") } catch {}
  }, [onboardingComplete, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try { window.localStorage.setItem(TWOPANE_KEY, twoPaneMode ? "1" : "0") } catch {}
  }, [twoPaneMode, hydrated])

  // Drive isNew → isVisible animation
  useEffect(() => {
    const hasNewInvisible = folders.some((p) => p.isNew && !p.isVisible)
    if (hasNewInvisible && !animatingRef.current) {
      animatingRef.current = true
      const t = setTimeout(() => {
        setFolders((prev) => prev.map((p) => (p.isNew && !p.isVisible ? { ...p, isVisible: true } : p)))
      }, 50)
      return () => clearTimeout(t)
    }
  }, [folders])

  useEffect(() => {
    const hasVisibleNew = folders.some((p) => p.isNew && p.isVisible)
    if (hasVisibleNew) {
      const t = setTimeout(() => {
        setFolders((prev) => prev.map((p) => ({ ...p, isNew: false })))
        animatingRef.current = false
      }, 500)
      return () => clearTimeout(t)
    }
  }, [folders])

  const allTags = useMemo(() => {
    const tagCounts = new Map<string, number>()
    for (const f of folders) {
      if (f.deletedAt) continue
      for (const t of f.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
      for (const file of f.files ?? []) {
        for (const t of file.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
      }
    }
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
  }, [folders])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])
  const clearTags = useCallback(() => setSelectedTags([]), [])

  const appendActivity = useCallback((folderId: string, kind: ActivityKind, description: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const list = f.activity ?? []
        const next = [makeActivity(kind, description), ...list].slice(0, 50)
        return { ...f, activity: next }
      }),
    )
  }, [])

  const createFolder = useCallback((init: Partial<Project> = {}) => {
    // Use a UUID in Electron mode so the same id flows through to SQLite
    // and through the folders:// protocol for any future file operations.
    const id =
      init.id ?? (isElectronEnv() ? genUuid() : genId("new-project"))
    const now = new Date().toISOString()
    const newFolder: FolderWithMeta = {
      id,
      title: init.title ?? "Untitled Folder",
      fileCount: init.fileCount ?? 0,
      createdAt: init.createdAt ?? now,
      updatedAt: init.updatedAt ?? now,
      images: init.images ?? [],
      files: init.files ?? [],
      parentId: init.parentId ?? null,
      description: init.description ?? "",
      tags: init.tags ?? [],
      isGenerating: init.isGenerating ?? false,
      progress: init.progress,
      eta: init.eta,
      isFailed: init.isFailed,
      isEmpty: init.isEmpty ?? (init.files?.length ?? 0) === 0,
      icon: init.icon,
      color: init.color,
      favorite: init.favorite,
      pinned: init.pinned,
      notes: init.notes,
      activity: [makeActivity("created", `Folder "${init.title ?? "Untitled"}" created`)],
      isNew: true,
      isVisible: false,
    }
    setFolders((prev) => [newFolder, ...prev])
    if (isElectronEnv()) {
      void libraryCreateFolder(
        newFolder.title ?? "Untitled",
        newFolder.parentId ?? null,
        id,
      ).catch((err) => {
        console.error("library.createFolder failed:", err)
        // Roll back the optimistic insert on hard failure.
        setFolders((prev) => prev.filter((f) => f.id !== id))
      })
    }
    return id
  }, [])

  const createEmptyFolder = useCallback(
    (parentId: string | null = null) => {
      return createFolder({
        title: "New Folder",
        fileCount: 0,
        images: [],
        files: [],
        parentId,
        isEmpty: true,
      })
    },
    [createFolder],
  )

  const createFromTemplate = useCallback(
    (parentId: string | null, root: Partial<Project>, subfolders: Partial<Project>[]) => {
      const rootId = createFolder({
        ...root,
        parentId: parentId ?? null,
        isEmpty: true,
      })
      for (const sf of subfolders) {
        createFolder({
          ...sf,
          parentId: rootId,
          isEmpty: true,
        })
      }
      return rootId
    },
    [createFolder],
  )

  const getDescendantIds = useCallback(
    (id: string): string[] => {
      const result: string[] = []
      const queue = [id]
      while (queue.length) {
        const cur = queue.shift()!
        for (const f of folders) {
          if (f.parentId === cur) {
            result.push(String(f.id))
            queue.push(String(f.id))
          }
        }
      }
      return result
    },
    [folders],
  )

  const deleteFolder = useCallback(
    (id: string) => {
      const now = new Date().toISOString()
      // Capture title for the toast before mutating state.
      let title = "Folder"
      setFolders((prev) => {
        const target = prev.find((f) => String(f.id) === id)
        if (target?.title) title = target.title
        const toMark = new Set<string>([id])
        let changed = true
        while (changed) {
          changed = false
          prev.forEach((f) => {
            if (f.parentId && toMark.has(f.parentId) && !toMark.has(String(f.id))) {
              toMark.add(String(f.id))
              changed = true
            }
          })
        }
        return prev.map((f) => (toMark.has(String(f.id)) ? { ...f, deletedAt: now } : f))
      })
      setRecentIds((prev) => prev.filter((rid) => rid !== id))
      if (isElectronEnv()) {
        void libraryDeleteFolder(id).catch((err) => {
          console.error("library.deleteFolder failed:", err)
        })
      }
      toast(`"${title}" moved to trash`, {
        action: {
          label: "Undo",
          onClick: () => {
            restoreFolder(id)
          },
        },
        duration: 6000,
      })
    },
    // restoreFolder is defined just below — referenced via closure that
    // captures the latest definition at call-time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const permanentlyDeleteFolder = useCallback((id: string) => {
    setFolders((prev) => {
      const toRemove = new Set<string>([id])
      let changed = true
      while (changed) {
        changed = false
        prev.forEach((f) => {
          if (f.parentId && toRemove.has(f.parentId) && !toRemove.has(String(f.id))) {
            toRemove.add(String(f.id))
            changed = true
          }
        })
      }
      return prev.filter((f) => !toRemove.has(String(f.id)))
    })
  }, [])

  const restoreFolder = useCallback((id: string) => {
    setFolders((prev) => {
      const toRestore = new Set<string>([id])
      let changed = true
      while (changed) {
        changed = false
        prev.forEach((f) => {
          if (f.parentId && toRestore.has(f.parentId) && !toRestore.has(String(f.id))) {
            toRestore.add(String(f.id))
            changed = true
          }
        })
      }
      return prev.map((f) => {
        if (!toRestore.has(String(f.id))) return f
        const { deletedAt: _, ...rest } = f
        const log = [...(rest.activity ?? [])]
        log.unshift(makeActivity("restored", "Folder restored from trash"))
        return { ...rest, activity: log.slice(0, 50) } as FolderWithMeta
      })
    })
    if (isElectronEnv()) {
      void library.folders.restore(id).catch((err) => {
        console.error("library.restoreFolder failed:", err)
      })
    }
  }, [])

  const emptyTrash = useCallback(() => {
    setFolders((prev) => prev.filter((f) => !f.deletedAt))
  }, [])

  const renameFolder = useCallback((id: string, title: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const log = [makeActivity("renamed", `Renamed to "${title}"`), ...(f.activity ?? [])].slice(0, 50)
        return { ...f, title, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
    if (isElectronEnv()) {
      void libraryRenameFolder(id, title).catch((err) => {
        console.error("library.renameFolder failed:", err)
      })
    }
  }, [])

  const updateFolderMetadata = useCallback((id: string, patch: Partial<Project>) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        return { ...f, ...patch, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const setFolderGenerating = useCallback((id: string, generating: boolean) => {
    setFolders((prev) =>
      prev.map((f) => (String(f.id) === id ? { ...f, isGenerating: generating } : f)),
    )
  }, [])

  const toggleFolderFavorite = useCallback((id: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const next = !f.favorite
        const log = [
          makeActivity("favorited", next ? "Marked as favorite" : "Unmarked as favorite"),
          ...(f.activity ?? []),
        ].slice(0, 50)
        return { ...f, favorite: next, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const toggleFolderPin = useCallback((id: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        String(f.id) === id ? { ...f, pinned: !f.pinned, updatedAt: new Date().toISOString() } : f,
      ),
    )
  }, [])

  const setFolderColor = useCallback((id: string, color: string | undefined) => {
    setFolders((prev) =>
      prev.map((f) => (String(f.id) === id ? { ...f, color, updatedAt: new Date().toISOString() } : f)),
    )
  }, [])

  const setFolderIcon = useCallback((id: string, icon: string | undefined) => {
    setFolders((prev) =>
      prev.map((f) => (String(f.id) === id ? { ...f, icon, updatedAt: new Date().toISOString() } : f)),
    )
  }, [])

  const setFolderCover = useCallback((id: string, fileId: string | undefined) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const log = [
          makeActivity("covered", fileId ? "Cover photo updated" : "Cover photo cleared"),
          ...(f.activity ?? []),
        ].slice(0, 50)
        return { ...f, coverFileId: fileId, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const setFolderNotes = useCallback((id: string, notes: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const log = [makeActivity("noted", "Notes updated"), ...(f.activity ?? [])].slice(0, 50)
        return { ...f, notes, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const duplicateFolder = useCallback(
    (id: string): string | null => {
      const root = folders.find((f) => String(f.id) === id)
      if (!root) return null
      const idMap = new Map<string, string>()
      const now = new Date().toISOString()
      const collectIds = [String(root.id), ...getDescendantIds(String(root.id))]
      for (const oldId of collectIds) {
        idMap.set(oldId, genId("dup"))
      }
      const clones: FolderWithMeta[] = []
      for (const oldId of collectIds) {
        const orig = folders.find((f) => String(f.id) === oldId)
        if (!orig) continue
        const newId = idMap.get(oldId)!
        const newParentId = oldId === id ? root.parentId : idMap.get(orig.parentId ?? "") ?? null
        const clonedFiles = (orig.files ?? []).map((file) => ({ ...file, id: genId("file") }))
        clones.push({
          ...orig,
          id: newId,
          parentId: newParentId ?? null,
          title: oldId === id ? orig.title + " (Copy)" : orig.title,
          createdAt: now,
          updatedAt: now,
          files: clonedFiles,
          deletedAt: undefined,
          favorite: false,
          pinned: false,
          activity: [makeActivity("created", `Duplicated from "${orig.title}"`)],
          share: undefined,
          isNew: oldId === id,
          isVisible: false,
        })
      }
      setFolders((prev) => [...clones, ...prev])
      return idMap.get(id) ?? null
    },
    [folders, getDescendantIds],
  )

  const moveFolder = useCallback(
    (id: string, newParentId: string | null) => {
      const desc = new Set(getDescendantIds(id))
      if (newParentId && (newParentId === id || desc.has(newParentId))) return
      setFolders((prev) =>
        prev.map((f) => {
          if (String(f.id) !== id) return f
          const log = [makeActivity("moved", newParentId ? "Moved into folder" : "Moved to root"), ...(f.activity ?? [])].slice(0, 50)
          return { ...f, parentId: newParentId, activity: log, updatedAt: new Date().toISOString() }
        }),
      )
    },
    [getDescendantIds],
  )

  // ---------- Sharing ----------
  const shareFolder = useCallback((id: string, permission: SharePermission) => {
    const link = `https://app.example.com/folders/${id}/share/${Math.random().toString(36).slice(2, 12)}`
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const share: ShareInfo = {
          link,
          permission,
          sharedWith: f.share?.sharedWith ?? [],
          createdAt: new Date().toISOString(),
        }
        const log = [makeActivity("shared", `Folder shared (${permission})`), ...(f.activity ?? [])].slice(0, 50)
        return { ...f, share, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const updateSharePermission = useCallback((id: string, permission: SharePermission) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id || !f.share) return f
        return { ...f, share: { ...f.share, permission }, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const addSharedWith = useCallback((id: string, name: string, email?: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const share: ShareInfo = f.share ?? {
          link: `https://app.example.com/folders/${id}/share/${Math.random().toString(36).slice(2, 12)}`,
          permission: "view",
          sharedWith: [],
          createdAt: new Date().toISOString(),
        }
        const next = { ...share, sharedWith: [...share.sharedWith, { name, email }] }
        return { ...f, share: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const removeSharedWith = useCallback((id: string, name: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id || !f.share) return f
        return {
          ...f,
          share: { ...f.share, sharedWith: f.share.sharedWith.filter((s) => s.name !== name) },
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const unshareFolder = useCallback((id: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        return { ...f, share: undefined, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  // ---------- File ops ----------
  const uploadFiles = useCallback(async (folderId: string, files: FileList | File[]) => {
    const list = Array.from(files)
    const newFiles: FolderFile[] = []

    if (isElectronEnv()) {
      // Electron: send raw bytes through the IPC bridge, get back canonical
      // FileRecords. The url field is folders://<id>, served by the custom
      // protocol — no base64 inflation, no localStorage bloat.
      try {
        const created = await libraryUploadFiles(folderId, list)
        if (created) {
          for (const r of created) {
            newFiles.push({
              id: r.id,
              name: r.name,
              url: r.url,
              type: r.type,
              size: r.size,
              uploadedAt: r.uploadedAt,
              favorite: r.isFavorite,
              pinned: r.isPinned,
              rotation: r.rotation,
              flipH: r.flipH,
              flipV: r.flipV,
            })
          }
          // Fire-and-forget AI auto-tag for image uploads. If no key is
          // configured the call rejects and we just leave ai_tag_status as
          // 'pending' for a future retry.
          for (const r of created) {
            if (r.type !== "image") continue
            void library.ai
              .autoTag(r.id)
              .then((res) => {
                setFolders((prev) =>
                  prev.map((f) => {
                    if (String(f.id) !== folderId) return f
                    return {
                      ...f,
                      files: (f.files ?? []).map((file) =>
                        file.id === r.id
                          ? { ...file, aiTags: res.tags }
                          : file,
                      ),
                    }
                  }),
                )
              })
              .catch(() => {
                // No key, network error, or model failure — silent.
              })
          }
        }
      } catch (err) {
        console.error("library.upload failed:", err)
      }
    } else {
      // Web fallback: data URLs in localStorage (best-effort, quota-bounded).
      for (const file of list) {
        try {
          const url = await readFileAsDataURL(file)
          newFiles.push({
            id: genId("file"),
            name: file.name,
            url,
            type: detectFileType(file.type || file.name),
            size: file.size,
            uploadedAt: new Date().toISOString(),
          })
        } catch {}
      }
    }

    if (newFiles.length === 0) return
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const merged = [...(f.files ?? []), ...newFiles]
        const log = [
          makeActivity("uploaded", `${newFiles.length} file${newFiles.length === 1 ? "" : "s"} uploaded`),
          ...(f.activity ?? []),
        ].slice(0, 50)
        return {
          ...f,
          files: merged,
          images: previewImagesFromFiles(merged, f.images),
          isEmpty: merged.length === 0,
          activity: log,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const deleteFile = useCallback((folderId: string, fileId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const target = (f.files ?? []).find((file) => file.id === fileId)
        const next = (f.files ?? []).filter((file) => file.id !== fileId)
        const log = target
          ? [makeActivity("deleted", `File "${target.name}" removed`), ...(f.activity ?? [])].slice(0, 50)
          : f.activity
        return {
          ...f,
          files: next,
          images: previewImagesFromFiles(next, []),
          isEmpty: next.length === 0,
          coverFileId: f.coverFileId === fileId ? undefined : f.coverFileId,
          activity: log,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const renameFile = useCallback((folderId: string, fileId: string, name: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) => (file.id === fileId ? { ...file, name } : file))
        return { ...f, files: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const updateFileMetadata = useCallback(
    (folderId: string, fileId: string, patch: Partial<FolderFile>) => {
      setFolders((prev) =>
        prev.map((f) => {
          if (String(f.id) !== folderId) return f
          const next = (f.files ?? []).map((file) =>
            file.id === fileId ? { ...file, ...patch } : file,
          )
          return { ...f, files: next, updatedAt: new Date().toISOString() }
        }),
      )
    },
    [],
  )

  const toggleFileFavorite = useCallback((folderId: string, fileId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) =>
          file.id === fileId ? { ...file, favorite: !file.favorite } : file,
        )
        return { ...f, files: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const bulkDeleteFiles = useCallback((folderId: string, fileIds: string[]) => {
    const set = new Set(fileIds)
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).filter((file) => !set.has(file.id))
        const log = [
          makeActivity("deleted", `${fileIds.length} file${fileIds.length === 1 ? "" : "s"} removed`),
          ...(f.activity ?? []),
        ].slice(0, 50)
        return {
          ...f,
          files: next,
          images: previewImagesFromFiles(next, []),
          isEmpty: next.length === 0,
          activity: log,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const moveFile = useCallback((sourceFolderId: string, fileId: string, destFolderId: string) => {
    if (sourceFolderId === destFolderId) return
    setFolders((prev) => {
      let moved: FolderFile | null = null
      const next = prev.map((f) => {
        if (String(f.id) === sourceFolderId) {
          const remaining = (f.files ?? []).filter((file) => {
            if (file.id === fileId) {
              moved = file
              return false
            }
            return true
          })
          return {
            ...f,
            files: remaining,
            images: previewImagesFromFiles(remaining, []),
            isEmpty: remaining.length === 0,
            updatedAt: new Date().toISOString(),
          }
        }
        return f
      })
      if (!moved) return prev
      return next.map((f) => {
        if (String(f.id) === destFolderId) {
          const merged = [...(f.files ?? []), moved!]
          return {
            ...f,
            files: merged,
            images: previewImagesFromFiles(merged, f.images),
            isEmpty: merged.length === 0,
            updatedAt: new Date().toISOString(),
          }
        }
        return f
      })
    })
  }, [])

  const bulkMoveFiles = useCallback(
    (sourceFolderId: string, fileIds: string[], destFolderId: string) => {
      if (sourceFolderId === destFolderId || fileIds.length === 0) return
      const set = new Set(fileIds)
      setFolders((prev) => {
        const moved: FolderFile[] = []
        const after = prev.map((f) => {
          if (String(f.id) === sourceFolderId) {
            const remaining = (f.files ?? []).filter((file) => {
              if (set.has(file.id)) {
                moved.push(file)
                return false
              }
              return true
            })
            return {
              ...f,
              files: remaining,
              images: previewImagesFromFiles(remaining, []),
              isEmpty: remaining.length === 0,
              updatedAt: new Date().toISOString(),
            }
          }
          return f
        })
        if (moved.length === 0) return prev
        return after.map((f) => {
          if (String(f.id) === destFolderId) {
            const merged = [...(f.files ?? []), ...moved]
            return {
              ...f,
              files: merged,
              images: previewImagesFromFiles(merged, f.images),
              isEmpty: merged.length === 0,
              updatedAt: new Date().toISOString(),
            }
          }
          return f
        })
      })
    },
    [],
  )

  const bulkRenameFiles = useCallback((folderId: string, fileIds: string[], pattern: string) => {
    const set = new Set(fileIds)
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const targets = (f.files ?? []).filter((file) => set.has(file.id))
        const renamed = (f.files ?? []).map((file) => {
          if (!set.has(file.id)) return file
          const idx = targets.findIndex((t) => t.id === file.id)
          const newName = applyPattern(pattern, file, idx)
          return { ...file, name: newName }
        })
        const log = [
          makeActivity("renamed", `${targets.length} file${targets.length === 1 ? "" : "s"} renamed`),
          ...(f.activity ?? []),
        ].slice(0, 50)
        return { ...f, files: renamed, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const bulkUpdateFiles = useCallback(
    (folderId: string, fileIds: string[], patch: Partial<FolderFile>) => {
      const set = new Set(fileIds)
      setFolders((prev) =>
        prev.map((f) => {
          if (String(f.id) !== folderId) return f
          const next = (f.files ?? []).map((file) => (set.has(file.id) ? { ...file, ...patch } : file))
          return { ...f, files: next, updatedAt: new Date().toISOString() }
        }),
      )
    },
    [],
  )

  const bulkAddTagsToFiles = useCallback((folderId: string, fileIds: string[], tags: string[]) => {
    const set = new Set(fileIds)
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) => {
          if (!set.has(file.id)) return file
          const merged = Array.from(new Set([...(file.tags ?? []), ...tags]))
          return { ...file, tags: merged }
        })
        const log = [
          makeActivity("tagged", `Added tags to ${fileIds.length} file${fileIds.length === 1 ? "" : "s"}`),
          ...(f.activity ?? []),
        ].slice(0, 50)
        return { ...f, files: next, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const bulkRemoveTagsFromFiles = useCallback((folderId: string, fileIds: string[], tags: string[]) => {
    const set = new Set(fileIds)
    const removeSet = new Set(tags)
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) => {
          if (!set.has(file.id)) return file
          const filtered = (file.tags ?? []).filter((t) => !removeSet.has(t))
          return { ...file, tags: filtered }
        })
        return { ...f, files: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  // ---------- Computed ----------
  const getFolder = useCallback(
    (id: string) => folders.find((f) => String(f.id) === id),
    [folders],
  )

  const getSubfolders = useCallback(
    (parentId: string | null) =>
      folders.filter((f) => (f.parentId ?? null) === parentId && !f.deletedAt),
    [folders],
  )

  const sortFolders = useCallback(
    (list: FolderWithMeta[]): FolderWithMeta[] => {
      const out = [...list]
      switch (sortKey) {
        case "created-asc":
          out.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
          break
        case "created-desc":
          out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
          break
        case "updated-desc":
          out.sort(
            (a, b) =>
              +new Date(b.updatedAt ?? b.createdAt) - +new Date(a.updatedAt ?? a.createdAt),
          )
          break
        case "name-asc":
          out.sort((a, b) => a.title.localeCompare(b.title))
          break
        case "name-desc":
          out.sort((a, b) => b.title.localeCompare(a.title))
          break
        case "count-desc":
          out.sort((a, b) => {
            const ac =
              (a.files?.length ?? 0) + folders.filter((f) => f.parentId === a.id && !f.deletedAt).length
            const bc =
              (b.files?.length ?? 0) + folders.filter((f) => f.parentId === b.id && !f.deletedAt).length
            return bc - ac
          })
          break
      }
      out.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
      return out
    },
    [sortKey, folders],
  )

  const filterFolders = useCallback(
    (list: FolderWithMeta[]): FolderWithMeta[] => {
      const q = searchQuery.trim().toLowerCase()
      let out = list.filter((f) => !f.deletedAt)
      if (q) {
        out = out.filter((f) => {
          const inTitle = f.title.toLowerCase().includes(q)
          const inDesc = (f.description ?? "").toLowerCase().includes(q)
          const inTags = (f.tags ?? []).some((t) => t.toLowerCase().includes(q))
          const inFiles = (f.files ?? []).some((file) => file.name.toLowerCase().includes(q))
          return inTitle || inDesc || inTags || inFiles
        })
      }
      if (selectedTags.length > 0) {
        out = out.filter((f) => selectedTags.every((tag) => (f.tags ?? []).includes(tag)))
      }
      switch (filterKind) {
        case "empty":
          out = out.filter(
            (f) => (f.files?.length ?? 0) === 0 && getSubfolders(String(f.id)).length === 0,
          )
          break
        case "non-empty":
          out = out.filter(
            (f) => (f.files?.length ?? 0) > 0 || getSubfolders(String(f.id)).length > 0,
          )
          break
        case "with-images":
          out = out.filter((f) => (f.files ?? []).some((x) => x.type === "image"))
          break
        case "favorites":
          out = out.filter((f) => !!f.favorite)
          break
      }
      return out
    },
    [searchQuery, filterKind, getSubfolders, selectedTags],
  )

  const rootFolders = useMemo(
    () => folders.filter((f) => (f.parentId ?? null) === null && !f.deletedAt),
    [folders],
  )

  const getDisplayFolders = useCallback(
    () => sortFolders(filterFolders(rootFolders)),
    [sortFolders, filterFolders, rootFolders],
  )

  const getDisplayFoldersIn = useCallback(
    (parentId: string | null) => sortFolders(filterFolders(getSubfolders(parentId))),
    [sortFolders, filterFolders, getSubfolders],
  )

  const getTrashed = useCallback(
    () =>
      folders
        .filter((f) => !!f.deletedAt)
        .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")),
    [folders],
  )

  const getFavorites = useCallback(
    () => folders.filter((f) => !!f.favorite && !f.deletedAt),
    [folders],
  )

  const getRecents = useCallback(() => {
    const map = new Map(folders.map((f) => [String(f.id), f]))
    return recentIds
      .map((id) => map.get(id))
      .filter((f): f is FolderWithMeta => !!f && !f.deletedAt)
  }, [folders, recentIds])

  const getFolderTree = useCallback((): FolderTreeNode[] => {
    const visible = folders.filter((f) => !f.deletedAt)
    const byParent = new Map<string | null, FolderWithMeta[]>()
    for (const f of visible) {
      const key = f.parentId ?? null
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key)!.push(f)
    }
    const buildNode = (folder: FolderWithMeta): FolderTreeNode => ({
      folder,
      children: (byParent.get(String(folder.id)) ?? [])
        .sort((a, b) => a.title.localeCompare(b.title))
        .map(buildNode),
    })
    const roots = (byParent.get(null) ?? []).sort((a, b) => a.title.localeCompare(b.title))
    return roots.map(buildNode)
  }, [folders])

  const getStats = useCallback((): Stats => {
    let totalFiles = 0
    let totalSize = 0
    let trashCount = 0
    let favoritesCount = 0
    let totalFolders = 0
    let totalSubfolders = 0
    for (const f of folders) {
      if (f.deletedAt) {
        trashCount++
        continue
      }
      if (f.parentId == null) totalFolders++
      else totalSubfolders++
      if (f.favorite) favoritesCount++
      for (const file of f.files ?? []) {
        totalFiles++
        totalSize += file.size ?? 0
      }
    }
    return { totalFolders, totalSubfolders, totalFiles, totalSize, trashCount, favoritesCount }
  }, [folders])

  const buildPathTitles = useCallback(
    (folderId: string): string[] => {
      const titles: string[] = []
      let current = folders.find((f) => String(f.id) === folderId)
      const guard = new Set<string>()
      while (current && !guard.has(String(current.id))) {
        guard.add(String(current.id))
        titles.unshift(current.title)
        if (!current.parentId) break
        current = folders.find((f) => String(f.id) === current!.parentId)
      }
      return titles
    },
    [folders],
  )

  const buildPathIds = useCallback(
    (folderId: string): string[] => {
      const ids: string[] = []
      let current = folders.find((f) => String(f.id) === folderId)
      const guard = new Set<string>()
      while (current && !guard.has(String(current.id))) {
        guard.add(String(current.id))
        ids.unshift(String(current.id))
        if (!current.parentId) break
        current = folders.find((f) => String(f.id) === current!.parentId)
      }
      return ids
    },
    [folders],
  )

  const pushRecent = useCallback((id: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((x) => x !== id)
      return [id, ...filtered].slice(0, 8)
    })
  }, [])

  const openFolder = useCallback(
    (id: string) => {
      setOpenFolderId(id)
      const path = buildPathIds(id)
      setNavigationStack(path)
      pushRecent(id)
      setTabs((prev) => (prev.includes(id) ? prev : [...prev, id].slice(-5)))
      setActiveTab(id)
    },
    [buildPathIds, pushRecent],
  )

  const closeFolder = useCallback(() => {
    setOpenFolderId(null)
    setNavigationStack([])
  }, [])

  const navigateToSubfolder = useCallback(
    (id: string) => {
      setNavigationStack((prev) => [...prev, id])
      setOpenFolderId(id)
      pushRecent(id)
    },
    [pushRecent],
  )

  const navigateBack = useCallback(() => {
    setNavigationStack((prev) => {
      const next = prev.slice(0, -1)
      setOpenFolderId(next[next.length - 1] ?? null)
      return next
    })
  }, [])

  const navigateToBreadcrumb = useCallback((id: string) => {
    setNavigationStack((prev) => {
      const idx = prev.indexOf(id)
      if (idx === -1) return prev
      const next = prev.slice(0, idx + 1)
      setOpenFolderId(id)
      return next
    })
  }, [])

  const openLightbox = useCallback((folderId: string, fileId: string) => {
    setLightbox({ folderId, fileId })
  }, [])
  const closeLightbox = useCallback(() => setLightbox(null), [])

  const startSlideshow = useCallback((folderId: string) => setSlideshow({ folderId }), [])
  const stopSlideshow = useCallback(() => setSlideshow(null), [])

  const openCompare = useCallback(
    (folderId: string, fileIdA: string, fileIdB: string) => setCompare({ folderId, fileIdA, fileIdB }),
    [],
  )
  const closeCompare = useCallback(() => setCompare(null), [])

  const getDuplicates = useCallback((): DuplicateGroup[] => {
    const groups = new Map<string, DuplicateGroup>()
    for (const f of folders) {
      if (f.deletedAt) continue
      for (const file of f.files ?? []) {
        const key = `${file.name.toLowerCase()}|${file.size ?? 0}`
        if (!groups.has(key)) groups.set(key, { key, files: [] })
        groups.get(key)!.files.push({ file, folderId: String(f.id), folderTitle: f.title })
      }
    }
    return Array.from(groups.values()).filter((g) => g.files.length > 1)
  }, [folders])

  const getStorageBreakdown = useCallback((): StorageSlice[] => {
    const slices: StorageSlice[] = []
    const visible = folders.filter((f) => !f.deletedAt)
    const byTopLevel = new Map<string, FolderWithMeta>()
    for (const f of visible) if (f.parentId == null) byTopLevel.set(String(f.id), f)

    for (const top of byTopLevel.values()) {
      let bytes = 0
      const stack = [String(top.id)]
      while (stack.length) {
        const cur = stack.pop()!
        const folder = visible.find((f) => String(f.id) === cur)
        if (!folder) continue
        for (const file of folder.files ?? []) bytes += file.size ?? 0
        for (const child of visible) {
          if (child.parentId === cur) stack.push(String(child.id))
        }
      }
      if (bytes > 0) {
        slices.push({ folderId: String(top.id), title: top.title, bytes, color: top.color })
      }
    }
    slices.sort((a, b) => b.bytes - a.bytes)
    return slices
  }, [folders])

  const globalSearch = useCallback(
    (q: string): SearchHit[] => {
      const query = q.trim().toLowerCase()
      if (!query) return []
      const hits: SearchHit[] = []
      for (const f of folders) {
        if (f.deletedAt) continue
        const path = buildPathTitles(String(f.id))
        if (f.title.toLowerCase().includes(query)) {
          hits.push({
            kind: "folder",
            folderId: String(f.id),
            folderTitle: f.title,
            matchedField: "title",
            snippet: f.title,
            pathTitles: path,
          })
        } else if ((f.description ?? "").toLowerCase().includes(query)) {
          hits.push({
            kind: "folder",
            folderId: String(f.id),
            folderTitle: f.title,
            matchedField: "description",
            snippet: f.description ?? "",
            pathTitles: path,
          })
        } else if ((f.tags ?? []).some((t) => t.toLowerCase().includes(query))) {
          hits.push({
            kind: "folder",
            folderId: String(f.id),
            folderTitle: f.title,
            matchedField: "tag",
            snippet: (f.tags ?? []).join(", "),
            pathTitles: path,
          })
        }
        for (const file of f.files ?? []) {
          if (
            file.name.toLowerCase().includes(query) ||
            (file.description ?? "").toLowerCase().includes(query) ||
            (file.tags ?? []).some((t) => t.toLowerCase().includes(query))
          ) {
            hits.push({
              kind: "file",
              folderId: String(f.id),
              folderTitle: f.title,
              fileId: file.id,
              fileName: file.name,
              fileUrl: file.url,
              matchedField: "file",
              snippet: file.name,
              pathTitles: [...path, file.name],
            })
          }
        }
      }
      return hits.slice(0, 50)
    },
    [folders, buildPathTitles],
  )

  // Smart folders
  const addSmartFolder = useCallback((s: Omit<SmartFolder, "id">) => {
    const id = genId("smart")
    setSmartFolders((prev) => [{ ...s, id }, ...prev])
    return id
  }, [])

  const updateSmartFolder = useCallback((id: string, patch: Partial<SmartFolder>) => {
    setSmartFolders((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const deleteSmartFolder = useCallback((id: string) => {
    setSmartFolders((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const openSmartFolder = useCallback((id: string | null) => setOpenSmartFolderId(id), [])

  // Saved searches
  const addSavedSearch = useCallback((name: string, query: string) => {
    const id = genId("ss")
    setSavedSearches((prev) => [{ id, name, query }, ...prev])
    return id
  }, [])

  const deleteSavedSearch = useCallback((id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // ===== Workflows =====
  const setFolderStatus = useCallback((id: string, status: WorkflowStatus | undefined) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const log = [
          makeActivity("status", status ? `Status set to ${status}` : "Status cleared"),
          ...(f.activity ?? []),
        ].slice(0, 50)
        return { ...f, status, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const setFolderDueDate = useCallback((id: string, due: string | undefined) => {
    setFolders((prev) =>
      prev.map((f) =>
        String(f.id) === id ? { ...f, dueDate: due, updatedAt: new Date().toISOString() } : f,
      ),
    )
  }, [])

  const setFolderLocked = useCallback((id: string, locked: boolean) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const log = [
          makeActivity(locked ? "locked" : "unlocked", locked ? "Folder locked" : "Folder unlocked"),
          ...(f.activity ?? []),
        ].slice(0, 50)
        return { ...f, locked, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const archiveFolder = useCallback((id: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const log = [makeActivity("archived", "Folder archived"), ...(f.activity ?? [])].slice(0, 50)
        return { ...f, archivedAt: new Date().toISOString(), activity: log }
      }),
    )
  }, [])

  const unarchiveFolder = useCallback((id: string) => {
    setFolders((prev) =>
      prev.map((f) => (String(f.id) === id ? { ...f, archivedAt: undefined } : f)),
    )
  }, [])

  const setCustomField = useCallback((id: string, key: string, value: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const fields = { ...(f.customFields ?? {}), [key]: value }
        return { ...f, customFields: fields, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const removeCustomField = useCallback((id: string, key: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const fields = { ...(f.customFields ?? {}) }
        delete fields[key]
        return { ...f, customFields: fields, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const addChecklistItem = useCallback((id: string, text: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const item: ChecklistItem = { id: genId("chk"), text, done: false }
        const next = [...(f.checklist ?? []), item]
        return { ...f, checklist: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const toggleChecklistItem = useCallback((id: string, itemId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const next = (f.checklist ?? []).map((it) =>
          it.id === itemId ? { ...it, done: !it.done } : it,
        )
        return { ...f, checklist: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const removeChecklistItem = useCallback((id: string, itemId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id) return f
        const next = (f.checklist ?? []).filter((it) => it.id !== itemId)
        return { ...f, checklist: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const markFolderViewed = useCallback((id: string) => {
    setFolders((prev) =>
      prev.map((f) => (String(f.id) === id ? { ...f, lastViewedAt: new Date().toISOString() } : f)),
    )
  }, [])

  // ===== Per-file =====
  const togglePinFile = useCallback((folderId: string, fileId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) =>
          file.id === fileId ? { ...file, pinned: !file.pinned } : file,
        )
        return { ...f, files: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const rotateFile = useCallback((folderId: string, fileId: string, delta: number) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) =>
          file.id === fileId ? { ...file, rotation: (((file.rotation ?? 0) + delta) % 360 + 360) % 360 } : file,
        )
        return { ...f, files: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const flipFile = useCallback((folderId: string, fileId: string, axis: "h" | "v") => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) => {
          if (file.id !== fileId) return file
          if (axis === "h") return { ...file, flipH: !file.flipH }
          return { ...file, flipV: !file.flipV }
        })
        return { ...f, files: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const setFileAnnotations = useCallback((folderId: string, fileId: string, ann: FileAnnotation[]) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) =>
          file.id === fileId ? { ...file, annotations: ann } : file,
        )
        const log = [makeActivity("annotated", "Annotations updated"), ...(f.activity ?? [])].slice(0, 50)
        return { ...f, files: next, activity: log, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const addFileComment = useCallback(
    (folderId: string, fileId: string, text: string, author = "You", parentId?: string) => {
      setFolders((prev) =>
        prev.map((f) => {
          if (String(f.id) !== folderId) return f
          const next = (f.files ?? []).map((file) => {
            if (file.id !== fileId) return file
            const newComment: FileComment = {
              id: genId("c"),
              author,
              text,
              timestamp: new Date().toISOString(),
              parentId,
            }
            return { ...file, comments: [...(file.comments ?? []), newComment] }
          })
          const log = [makeActivity("commented", "New comment"), ...(f.activity ?? [])].slice(0, 50)
          return { ...f, files: next, activity: log, updatedAt: new Date().toISOString() }
        }),
      )
    },
    [],
  )

  const removeFileComment = useCallback((folderId: string, fileId: string, commentId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) => {
          if (file.id !== fileId) return file
          return { ...file, comments: (file.comments ?? []).filter((c) => c.id !== commentId) }
        })
        return { ...f, files: next, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const toggleFileReaction = useCallback(
    (folderId: string, fileId: string, emoji: string, by = "You") => {
      setFolders((prev) =>
        prev.map((f) => {
          if (String(f.id) !== folderId) return f
          const next = (f.files ?? []).map((file) => {
            if (file.id !== fileId) return file
            const list = file.reactions ?? []
            const has = list.find((r) => r.emoji === emoji && r.by === by)
            const updated = has
              ? list.filter((r) => !(r.emoji === emoji && r.by === by))
              : [...list, { emoji, by }]
            return { ...file, reactions: updated }
          })
          return { ...f, files: next, updatedAt: new Date().toISOString() }
        }),
      )
    },
    [],
  )

  const setFileExif = useCallback(
    (folderId: string, fileId: string, exif: Record<string, string>) => {
      setFolders((prev) =>
        prev.map((f) => {
          if (String(f.id) !== folderId) return f
          const next = (f.files ?? []).map((file) =>
            file.id === fileId ? { ...file, exif } : file,
          )
          return { ...f, files: next }
        }),
      )
    },
    [],
  )

  const setFilePalette = useCallback((folderId: string, fileId: string, palette: string[]) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) =>
          file.id === fileId ? { ...file, palette } : file,
        )
        return { ...f, files: next }
      }),
    )
  }, [])

  const setFileDimensions = useCallback(
    (folderId: string, fileId: string, dims: { width: number; height: number }) => {
      setFolders((prev) =>
        prev.map((f) => {
          if (String(f.id) !== folderId) return f
          const next = (f.files ?? []).map((file) =>
            file.id === fileId ? { ...file, dimensions: dims } : file,
          )
          return { ...f, files: next }
        }),
      )
    },
    [],
  )

  const setFileAiTags = useCallback(
    (folderId: string, fileId: string, aiTags: { tag: string; confidence: number }[]) => {
      setFolders((prev) =>
        prev.map((f) => {
          if (String(f.id) !== folderId) return f
          const next = (f.files ?? []).map((file) =>
            file.id === fileId ? { ...file, aiTags } : file,
          )
          return { ...f, files: next, updatedAt: new Date().toISOString() }
        }),
      )
    },
    [],
  )

  const setFileOcr = useCallback((folderId: string, fileId: string, text: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== folderId) return f
        const next = (f.files ?? []).map((file) =>
          file.id === fileId ? { ...file, ocrText: text } : file,
        )
        return { ...f, files: next }
      }),
    )
  }, [])

  const setFileGeo = useCallback(
    (folderId: string, fileId: string, geo: { lat: number; lng: number } | undefined) => {
      setFolders((prev) =>
        prev.map((f) => {
          if (String(f.id) !== folderId) return f
          const next = (f.files ?? []).map((file) =>
            file.id === fileId ? { ...file, geo } : file,
          )
          return { ...f, files: next }
        }),
      )
    },
    [],
  )

  // ===== Share extras =====
  const setShareExpiry = useCallback((id: string, expiresAt: string | undefined) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id || !f.share) return f
        return { ...f, share: { ...f.share, expiresAt }, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const setSharePassword = useCallback((id: string, password: string | undefined) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (String(f.id) !== id || !f.share) return f
        return { ...f, share: { ...f.share, password }, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  // ===== Tabs =====
  const addTab = useCallback((id: string) => {
    setTabs((prev) => (prev.includes(id) ? prev : [...prev, id].slice(-5)))
    setActiveTab(id)
  }, [])

  const removeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t !== id)
      setActiveTab((cur) => (cur === id ? next[next.length - 1] ?? null : cur))
      return next
    })
    setRecentlyClosed((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 8))
  }, [])

  const switchTab = useCallback((id: string) => {
    setActiveTab(id)
  }, [])

  const reopenLastClosed = useCallback(() => {
    setRecentlyClosed((prev) => {
      if (prev.length === 0) return prev
      const [id, ...rest] = prev
      addTab(id)
      setOpenFolderId(id)
      return rest
    })
  }, [addTab])

  // ===== Workspaces =====
  const switchWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id)
  }, [])

  const addWorkspace = useCallback((name: string, icon: string) => {
    const id = genId("ws")
    setWorkspaces((prev) => [...prev, { id, name, icon }])
    return id
  }, [])

  const renameWorkspace = useCallback((id: string, name: string) => {
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)))
  }, [])

  const deleteWorkspace = useCallback((id: string) => {
    if (id === "default") return
    setWorkspaces((prev) => prev.filter((w) => w.id !== id))
    setActiveWorkspaceId((cur) => (cur === id ? "default" : cur))
  }, [])

  // ===== Shortcuts =====
  const setShortcut = useCallback((id: string, keys: string) => {
    setCustomShortcuts((prev) => ({ ...prev, [id]: keys }))
  }, [])

  const resetShortcuts = useCallback(() => {
    setCustomShortcuts({})
  }, [])

  // ===== Onboarding =====
  const setOnboardingComplete = useCallback((v: boolean) => {
    setOnboardingCompleteState(v)
  }, [])

  const setTwoPaneMode = useCallback((v: boolean) => {
    setTwoPaneModeState(v)
  }, [])

  // ===== Activity heatmap =====
  const getActivityHeatmap = useCallback(
    (year?: number): ActivityDay[] => {
      const targetYear = year ?? new Date().getFullYear()
      const map = new Map<string, number>()
      for (const f of folders) {
        if (f.deletedAt) continue
        for (const a of f.activity ?? []) {
          try {
            const d = new Date(a.timestamp)
            if (d.getFullYear() !== targetYear) continue
            const key = d.toISOString().slice(0, 10)
            map.set(key, (map.get(key) ?? 0) + 1)
          } catch {}
        }
        for (const file of f.files ?? []) {
          try {
            const d = new Date(file.uploadedAt)
            if (d.getFullYear() !== targetYear) continue
            const key = d.toISOString().slice(0, 10)
            map.set(key, (map.get(key) ?? 0) + 1)
          } catch {}
        }
      }
      return Array.from(map.entries()).map(([date, count]) => ({ date, count }))
    },
    [folders],
  )

  // ===== Library import =====
  const replaceLibrary = useCallback((next: Project[]) => {
    setFolders(next as FolderWithMeta[])
  }, [])

  const mergeLibrary = useCallback((incoming: Project[]) => {
    setFolders((prev) => {
      const ids = new Set(prev.map((f) => String(f.id)))
      const novel = incoming.filter((f) => !ids.has(String(f.id)))
      return [...prev, ...(novel as FolderWithMeta[])]
    })
  }, [])

  const crossFolderRename = useCallback(
    (matcher: (file: FolderFile, folder: Project) => boolean, pattern: string): number => {
      let count = 0
      setFolders((prev) =>
        prev.map((f) => {
          if (f.deletedAt) return f
          const matches: FolderFile[] = (f.files ?? []).filter((file) => matcher(file, f))
          if (matches.length === 0) return f
          const next = (f.files ?? []).map((file) => {
            if (!matcher(file, f)) return file
            const idx = matches.findIndex((m) => m.id === file.id)
            count++
            return { ...file, name: applyPattern(pattern, file, idx) }
          })
          return { ...f, files: next, updatedAt: new Date().toISOString() }
        }),
      )
      return count
    },
    [],
  )

  const value: FolderContextType = {
    folders,
    rootFolders,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    filterKind,
    setFilterKind,
    selectedTags,
    toggleTag,
    clearTags,
    allTags,
    createFolder,
    createEmptyFolder,
    createFromTemplate,
    deleteFolder,
    permanentlyDeleteFolder,
    restoreFolder,
    emptyTrash,
    renameFolder,
    updateFolderMetadata,
    setFolderGenerating,
    toggleFolderFavorite,
    toggleFolderPin,
    setFolderColor,
    setFolderIcon,
    setFolderCover,
    setFolderNotes,
    duplicateFolder,
    moveFolder,
    shareFolder,
    updateSharePermission,
    addSharedWith,
    removeSharedWith,
    unshareFolder,
    uploadFiles,
    deleteFile,
    renameFile,
    updateFileMetadata,
    toggleFileFavorite,
    bulkDeleteFiles,
    bulkMoveFiles,
    moveFile,
    bulkRenameFiles,
    bulkUpdateFiles,
    bulkAddTagsToFiles,
    bulkRemoveTagsFromFiles,
    getFolder,
    getSubfolders,
    getDisplayFolders,
    getDisplayFoldersIn,
    getTrashed,
    getFavorites,
    getRecents,
    getFolderTree,
    getStats,
    getDescendantIds,
    buildPathTitles,
    getDuplicates,
    getStorageBreakdown,
    openFolderId,
    navigationStack,
    openFolder,
    closeFolder,
    navigateToSubfolder,
    navigateBack,
    navigateToBreadcrumb,
    paletteOpen,
    setPaletteOpen,
    globalSearch,
    sidebarOpen,
    setSidebarOpen,
    trashOpen,
    setTrashOpen,
    lightbox,
    openLightbox,
    closeLightbox,
    smartFolders,
    addSmartFolder,
    updateSmartFolder,
    deleteSmartFolder,
    openSmartFolderId,
    openSmartFolder,
    savedSearches,
    addSavedSearch,
    deleteSavedSearch,
    slideshow,
    startSlideshow,
    stopSlideshow,
    compare,
    openCompare,
    closeCompare,
    templatePickerOpen,
    setTemplatePickerOpen,
    duplicateFinderOpen,
    setDuplicateFinderOpen,
    smartFolderEditor,
    setSmartFolderEditor,
    shareDialogOpen,
    setShareDialogOpen,
    bulkRenameOpen,
    setBulkRenameOpen,
    bulkEditOpen,
    setBulkEditOpen,
    settingsOpen,
    setSettingsOpen,
    appendActivity,
    setFolderStatus,
    setFolderDueDate,
    setFolderLocked,
    archiveFolder,
    unarchiveFolder,
    setCustomField,
    removeCustomField,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    markFolderViewed,
    togglePinFile,
    rotateFile,
    flipFile,
    setFileAnnotations,
    addFileComment,
    removeFileComment,
    toggleFileReaction,
    setFileExif,
    setFilePalette,
    setFileDimensions,
    setFileAiTags,
    setFileOcr,
    setFileGeo,
    setShareExpiry,
    setSharePassword,
    tabs,
    activeTab,
    addTab,
    removeTab,
    switchTab,
    recentlyClosed,
    reopenLastClosed,
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    addWorkspace,
    renameWorkspace,
    deleteWorkspace,
    customShortcuts,
    setShortcut,
    resetShortcuts,
    onboardingComplete,
    setOnboardingComplete,
    twoPaneMode,
    setTwoPaneMode,
    crossFolderRenameOpen,
    setCrossFolderRenameOpen,
    exportModalOpen,
    setExportModalOpen,
    importModalOpen,
    setImportModalOpen,
    shortcutsModalOpen,
    setShortcutsModalOpen,
    heatmapModalOpen,
    setHeatmapModalOpen,
    imageSearchTarget,
    setImageSearchTarget,
    workspacesModalOpen,
    setWorkspacesModalOpen,
    getActivityHeatmap,
    replaceLibrary,
    mergeLibrary,
    crossFolderRename,
  }

  return <FolderContext.Provider value={value}>{children}</FolderContext.Provider>
}

export function useFolders() {
  const ctx = useContext(FolderContext)
  if (!ctx) throw new Error("useFolders must be used within a FolderProvider")
  return ctx
}
