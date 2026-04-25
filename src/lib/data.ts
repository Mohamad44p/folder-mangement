export type FolderFileType = "image" | "video" | "document" | "other"

export const FOLDER_COLORS = [
  { id: "neutral", value: "#1e1e1e", label: "Default" },
  { id: "rose", value: "#7f1d1d", label: "Rose" },
  { id: "amber", value: "#78350f", label: "Amber" },
  { id: "emerald", value: "#064e3b", label: "Emerald" },
  { id: "sky", value: "#0c4a6e", label: "Sky" },
  { id: "violet", value: "#4c1d95", label: "Violet" },
  { id: "fuchsia", value: "#701a75", label: "Fuchsia" },
  { id: "slate", value: "#1e293b", label: "Slate" },
] as const

export const FOLDER_ICONS = ["📁", "🎬", "🎨", "📸", "🎮", "🍝", "🏛️", "🎓", "🚀", "✨", "🌍", "🎵", "🔥", "💡", "🌿"]

export interface FileAnnotation {
  id: string
  kind: "rect" | "arrow" | "text" | "circle"
  x: number // percentage 0-100 of image width
  y: number
  w?: number
  h?: number
  x2?: number
  y2?: number
  color: string
  text?: string
  createdAt: string
}

export interface FileComment {
  id: string
  author: string
  text: string
  timestamp: string
  parentId?: string
  resolved?: boolean
}

export interface FileReaction {
  emoji: string
  by: string
}

export interface FolderFile {
  id: string
  name: string
  url: string
  type: FolderFileType
  size?: number
  uploadedAt: string
  description?: string
  tags?: string[]
  favorite?: boolean
  rotation?: number
  flipH?: boolean
  flipV?: boolean
  annotations?: FileAnnotation[]
  comments?: FileComment[]
  reactions?: FileReaction[]
  pinned?: boolean
  ocrText?: string
  palette?: string[]
  dimensions?: { width: number; height: number }
  exif?: Record<string, string>
  aiTags?: { tag: string; confidence: number }[]
  geo?: { lat: number; lng: number }
}

export type ActivityKind =
  | "created"
  | "renamed"
  | "uploaded"
  | "deleted"
  | "moved"
  | "restored"
  | "tagged"
  | "shared"
  | "favorited"
  | "noted"
  | "covered"
  | "status"
  | "locked"
  | "unlocked"
  | "archived"
  | "commented"
  | "annotated"

export interface ActivityEntry {
  id: string
  timestamp: string
  kind: ActivityKind
  actor: string
  description: string
}

export type SharePermission = "view" | "comment" | "edit"

export interface ShareInfo {
  link: string
  permission: SharePermission
  sharedWith: { name: string; email?: string }[]
  createdAt: string
  expiresAt?: string
  password?: string
}

export type WorkflowStatus = "draft" | "review" | "approved" | "published"

export const WORKFLOW_STATUSES: { value: WorkflowStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "#64748b" },
  { value: "review", label: "In Review", color: "#f59e0b" },
  { value: "approved", label: "Approved", color: "#10b981" },
  { value: "published", label: "Published", color: "#8b5cf6" },
]

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Project {
  id: string
  title: string
  fileCount: number
  createdAt: string
  updatedAt?: string
  images: string[]
  isGenerating?: boolean
  progress?: number
  eta?: string
  isFailed?: boolean
  parentId?: string | null
  description?: string
  tags?: string[]
  files?: FolderFile[]
  isEmpty?: boolean
  favorite?: boolean
  pinned?: boolean
  color?: string
  icon?: string
  deletedAt?: string
  coverFileId?: string
  notes?: string
  activity?: ActivityEntry[]
  share?: ShareInfo
  status?: WorkflowStatus
  dueDate?: string
  locked?: boolean
  customFields?: Record<string, string>
  archivedAt?: string
  checklist?: ChecklistItem[]
  lastViewedAt?: string
  workspaceId?: string
}

export type SmartFolderField = "tag" | "type" | "favorite" | "name" | "size" | "uploaded"
export type SmartFolderOp = "is" | "has" | "contains" | "gt" | "lt" | "within-days"

export interface SmartFolderRule {
  field: SmartFolderField
  op: SmartFolderOp
  value: string | number | boolean
}

export interface SmartFolder {
  id: string
  name: string
  icon: string
  matchAll: boolean
  rules: SmartFolderRule[]
}

export interface SavedSearch {
  id: string
  name: string
  query: string
}

export interface Workspace {
  id: string
  name: string
  icon: string
}

export const DEFAULT_WORKSPACES: Workspace[] = [
  { id: "default", name: "Personal", icon: "🏠" },
]

export const DEFAULT_SMART_FOLDERS: SmartFolder[] = [
  {
    id: "smart-favs",
    name: "All favorites",
    icon: "⭐",
    matchAll: false,
    rules: [{ field: "favorite", op: "is", value: true }],
  },
  {
    id: "smart-recent",
    name: "Uploaded this week",
    icon: "🕒",
    matchAll: true,
    rules: [{ field: "uploaded", op: "within-days", value: 7 }],
  },
  {
    id: "smart-large",
    name: "Large files",
    icon: "🗂️",
    matchAll: true,
    rules: [{ field: "size", op: "gt", value: 250_000 }],
  },
]

/**
 * Seed dataset for the empty-state. The app starts empty — folders and files
 * are created exclusively through user actions (or hydrated from the SQLite
 * library when running in Electron).
 */
export const projects: Project[] = []

