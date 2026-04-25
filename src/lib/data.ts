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

function makeFiles(prefix: string, urls: string[]): FolderFile[] {
  return urls.map((url, i) => ({
    id: `${prefix}-file-${i + 1}`,
    name: url.replace(/^\//, "").replace(/\.[^.]+$/, ""),
    url,
    type: "image" as const,
    size: 240_000 + i * 18_000,
    uploadedAt: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(),
  }))
}

const RAIN = [
  "/rain-portrait-1.png",
  "/rain-portrait-2.png",
  "/rain-portrait-3.png",
  "/rain-portrait-4.png",
  "/rain-portrait-5.png",
]
const RANDOM = [
  "/random-portrait-1.png",
  "/random-portrait-2.png",
  "/random-portrait-3.png",
  "/random-portrait-4.png",
  "/random-portrait-5.png",
]
const GREEN = [
  "/green-portrait-1.png",
  "/green-portrait-2.png",
  "/green-portrait-3.png",
  "/green-portrait-4.png",
  "/green-portrait-5.png",
]
const ITALY = [
  "/italy-portrait-1.png",
  "/italy-portrait-2.png",
  "/italy-portrait-3.png",
  "/italy-portrait-4.png",
  "/italy-portrait-5.png",
]
const COOL = [
  "/cool-portrait-1.png",
  "/cool-portrait-2.png",
  "/cool-portrait-3.png",
  "/cool-portrait-4.png",
  "/cool-portrait-5.png",
]
const NEON = [
  "/neon-portrait-1.png",
  "/neon-portrait-2.png",
  "/neon-portrait-3.png",
  "/neon-portrait-4.png",
  "/neon-portrait-5.png",
]
const BRAND = [
  "/brand-portrait-1.png",
  "/brand-portrait-2.png",
  "/brand-portrait-3.png",
  "/brand-portrait-4.png",
  "/brand-portrait-5.png",
]

function sub(
  id: string,
  parentId: string,
  title: string,
  imgs: string[],
  extras: Partial<Project> = {},
): Project {
  return {
    id,
    parentId,
    title,
    fileCount: imgs.length,
    createdAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
    images: imgs,
    files: makeFiles(id, imgs),
    description: extras.description ?? "",
    tags: extras.tags ?? [],
    icon: extras.icon,
    color: extras.color,
    favorite: extras.favorite,
    pinned: extras.pinned,
    ...extras,
  }
}

export const projects: Project[] = [
  // Root folders
  {
    id: "1",
    title: "Recreation of Historical Events",
    fileCount: 14,
    createdAt: "2024-10-20",
    updatedAt: "2024-12-15",
    parentId: null,
    description: "Cinematic reconstructions of pivotal moments across history.",
    tags: ["history", "cinematic", "documentary"],
    images: RAIN,
    files: makeFiles("rain", RAIN),
    icon: "🏛️",
    color: "#78350f",
    favorite: true,
    pinned: true,
  },
  {
    id: "2",
    title: "How Creators Make Content Go Viral",
    fileCount: 6,
    createdAt: "2024-11-15",
    updatedAt: "2024-12-20",
    parentId: null,
    description: "Tactics, hooks, and patterns from top performing creators.",
    tags: ["creators", "growth", "social"],
    images: RANDOM,
    files: makeFiles("random", RANDOM),
    icon: "🚀",
    color: "#7f1d1d",
  },
  {
    id: "3",
    title: "Trends and Innovations in Gaming for 2026",
    fileCount: 5,
    createdAt: "2024-11-25",
    parentId: null,
    description: "Looking ahead at the gaming landscape.",
    tags: ["gaming", "trends", "tech"],
    images: GREEN,
    files: makeFiles("green", GREEN),
    icon: "🎮",
    color: "#064e3b",
    favorite: true,
  },
  {
    id: "4",
    title: "Italian Vibes and Trends",
    fileCount: 8,
    createdAt: "2024-10-25",
    parentId: null,
    description: "Mediterranean aesthetics and lifestyle moments.",
    tags: ["italy", "lifestyle", "travel"],
    images: ITALY,
    files: makeFiles("italy", ITALY),
    icon: "🍝",
    color: "#0c4a6e",
  },
  {
    id: "5",
    title: "Tutorial Series: Unlocking Your Creative Potential",
    fileCount: 8,
    createdAt: "2024-11-20",
    parentId: null,
    description: "Step-by-step guides for creative growth.",
    tags: ["tutorial", "creative", "education"],
    images: COOL,
    files: makeFiles("cool", COOL),
    icon: "🎓",
    color: "#4c1d95",
  },

  // Subfolders of "1" — Historical Events
  sub("1-ancient", "1", "Ancient Civilizations", RAIN.slice(0, 4), {
    description: "Egypt, Greece, Rome — the foundations.",
    tags: ["ancient", "civilizations"],
    icon: "🏺",
  }),
  sub("1-medieval", "1", "Medieval Europe", RAIN.slice(1, 5), {
    description: "Knights, castles, and the dark ages.",
    tags: ["medieval", "europe"],
    icon: "⚔️",
  }),
  sub("1-modern", "1", "Modern Era", BRAND.slice(0, 4), {
    description: "20th century moments that shaped today.",
    tags: ["modern", "20th-century"],
    icon: "📜",
  }),
  // Sub-sub-folders under Ancient
  sub("1-ancient-egypt", "1-ancient", "Egypt", RAIN.slice(0, 3), {
    description: "Pyramids, pharaohs, and the Nile.",
    tags: ["egypt"],
    icon: "🐪",
  }),
  sub("1-ancient-rome", "1-ancient", "Rome", RAIN.slice(2, 5), {
    description: "Empire, gladiators, aqueducts.",
    tags: ["rome"],
    icon: "🏟️",
  }),

  // Subfolders of "2" — Viral Content
  sub("2-youtube", "2", "YouTube Hooks", RANDOM.slice(0, 4), {
    description: "Opening patterns that retain.",
    tags: ["youtube", "hooks"],
    icon: "▶️",
  }),
  sub("2-tiktok", "2", "TikTok Patterns", RANDOM.slice(1, 5), {
    description: "Short-form structure breakdowns.",
    tags: ["tiktok", "shorts"],
    icon: "🎵",
  }),
  sub("2-ig", "2", "Instagram Reels", RANDOM.slice(2, 5).concat(RANDOM[0]), {
    description: "Visual rhythm for IG audiences.",
    tags: ["instagram", "reels"],
    icon: "📸",
  }),

  // Subfolders of "3" — Gaming Trends
  sub("3-console", "3", "Console Highlights", GREEN.slice(0, 4), {
    description: "AAA console releases and demos.",
    tags: ["console", "aaa"],
    icon: "🕹️",
  }),
  sub("3-pc", "3", "PC Innovations", GREEN.slice(1, 5), {
    description: "Hardware, indie, mods.",
    tags: ["pc", "indie"],
    icon: "🖥️",
  }),
  sub("3-mobile", "3", "Mobile Gaming", NEON.slice(0, 3), {
    description: "Touch-first experiences.",
    tags: ["mobile", "touch"],
    icon: "📱",
  }),

  // Subfolders of "4" — Italy
  sub("4-food", "4", "Cucina Italiana", ITALY.slice(0, 4), {
    description: "Pasta, pizza, regional flavors.",
    tags: ["food", "cucina"],
    icon: "🍕",
  }),
  sub("4-arch", "4", "Architecture", ITALY.slice(1, 5), {
    description: "Roman, renaissance, baroque.",
    tags: ["architecture"],
    icon: "🏛️",
  }),
  sub("4-fashion", "4", "Italian Fashion", BRAND.slice(0, 4), {
    description: "Milan runway moments.",
    tags: ["fashion", "milano"],
    icon: "👗",
  }),

  // Subfolders of "5" — Tutorials
  sub("5-beginner", "5", "Beginner Path", COOL.slice(0, 4), {
    description: "Start here.",
    tags: ["beginner"],
    icon: "🌱",
  }),
  sub("5-intermediate", "5", "Intermediate Path", COOL.slice(1, 5), {
    description: "Level up your skills.",
    tags: ["intermediate"],
    icon: "🪴",
  }),
  sub("5-advanced", "5", "Advanced Techniques", COOL.slice(2, 5).concat(COOL[0]), {
    description: "Master craft.",
    tags: ["advanced"],
    icon: "🌳",
  }),
  sub("5-beginner-firststeps", "5-beginner", "First Steps", COOL.slice(0, 3), {
    description: "Day 1 essentials.",
    tags: ["day-1"],
    icon: "👶",
  }),
]
