"use client"

import {
  useFolders,
  type FileFilterKind,
  type FileSortKey,
  type GroupKind,
  type ViewMode,
} from "@/contexts/folder-context"
import { useDraggable, useDropTarget } from "@/contexts/dnd-context"
import type { FolderFile } from "@/lib/data"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronLeft,
  X,
  FolderPlus,
  Search,
  Trash2,
  Pencil,
  Image as ImageIcon,
  Film,
  FileText,
  File as FileIcon,
  Calendar,
  Files,
  Tag,
  Check,
  Download,
  Star,
  Pin,
  Copy,
  Palette,
  ArrowRightLeft,
  CheckSquare,
  Square,
  LayoutGrid,
  List,
  ArrowDownUp,
  Filter,
  Group,
  Share2,
  Play,
  GitCompare,
  CalendarDays,
  StickyNote,
  Activity,
  ImagePlus,
  Edit3,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { FileUploadZone } from "./file-upload-zone"
import { ProjectFolder } from "./project-folder"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoveToPopover } from "./move-to-popover"
import { FolderDecoratorPopover } from "./folder-decorator-popover"
import { NotesEditor } from "./notes-editor"
import { ActivityTimeline } from "./activity-timeline"
import { FolderCalendarView } from "./folder-calendar-view"
import { WorkflowStatusPill } from "./workflow-status-pill"
import { DueDatePicker } from "./due-date-picker"
import { CustomFieldsEditor } from "./custom-fields-editor"
import { FolderChecklist } from "./folder-checklist"
import { FileCommentsThread } from "./file-comments"
import { ReactionsBar } from "./reactions-bar"
import { ColorPaletteBar } from "./color-palette-bar"
import { MapView } from "./map-view"
import { aiAutoTagFile, aiDescribeFolder, aiSuggestCover, aiOcrFile } from "@/lib/ai-mocks"
import { Lock, Unlock, Sparkles, MapPin, ScanText, Wand2, Search as SearchIcon } from "lucide-react"

const FILE_ICONS = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  other: FileIcon,
} as const

const FILE_SORTS: { value: FileSortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
  { value: "size-desc", label: "Largest first" },
  { value: "size-asc", label: "Smallest first" },
  { value: "type", label: "By type" },
]

const FILE_FILTERS: { value: FileFilterKind; label: string }[] = [
  { value: "all", label: "All files" },
  { value: "favorites", label: "Favorites" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
  { value: "other", label: "Other" },
]

const GROUP_OPTIONS: { value: GroupKind; label: string }[] = [
  { value: "none", label: "No groups" },
  { value: "type", label: "Group by type" },
  { value: "date", label: "Group by date" },
]

type TabKey = "files" | "notes" | "activity"

function formatBytes(n?: number): string {
  if (!n) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

function dateGroupKey(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((+now - +d) / (1000 * 60 * 60 * 24))
    if (diffDays < 1) return "Today"
    if (diffDays < 7) return "This week"
    if (diffDays < 30) return "This month"
    if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString(undefined, { month: "long" })
    return d.getFullYear().toString()
  } catch {
    return "Other"
  }
}

function FileGridItem({
  folderId,
  file,
  isSelected,
  isCover,
  onToggleSelect,
  onClick,
  onEdit,
  children,
}: {
  folderId: string
  file: FolderFile
  isSelected: boolean
  isCover: boolean
  onToggleSelect: () => void
  onClick: () => void
  onEdit: () => void
  children?: React.ReactNode
}) {
  const drag = useDraggable({ kind: "file", folderId, fileId: file.id, fileName: file.name })

  return (
    <div
      {...drag.dragProps}
      className={`group relative rounded-xl bg-white/[0.03] border overflow-hidden transition-colors ${
        isSelected
          ? "border-sky-400/60 ring-1 ring-sky-400/40"
          : "border-white/[0.06] hover:border-white/[0.14]"
      }`}
      style={drag.dragProps.draggable ? { cursor: "grab" } : undefined}
    >
      {/* Selection checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect()
        }}
        className={`absolute top-2 left-2 z-20 size-6 rounded-md flex items-center justify-center backdrop-blur-md transition-all ${
          isSelected
            ? "bg-sky-500 text-white opacity-100"
            : "bg-black/60 text-white/70 opacity-0 group-hover:opacity-100"
        }`}
        aria-label="Select"
      >
        {isSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
      </button>

      <div className="aspect-[4/5] relative bg-black/40 overflow-hidden cursor-pointer" onClick={onClick}>
        {file.type === "image" ? (
          <img src={file.url} alt={file.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {(() => {
              const Icon = FILE_ICONS[file.type] ?? FileIcon
              return <Icon className="size-10 text-white/30" />
            })()}
          </div>
        )}
        {file.favorite && (
          <div className="absolute top-2 right-2 size-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
            <Star className="size-3 text-yellow-300 fill-yellow-300" />
          </div>
        )}
        {file.pinned && (
          <div className="absolute top-2 right-10 size-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
            <Pin className="size-3 text-sky-300" />
          </div>
        )}
        {isCover && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] uppercase tracking-wider text-white/80 border border-white/[0.06] flex items-center gap-1">
            <ImagePlus className="size-2.5" />
            Cover
          </div>
        )}
        {file.palette && file.palette.length > 0 && (
          <div className="absolute bottom-2 right-2 flex gap-0.5 px-1 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/[0.06]">
            {file.palette.slice(0, 5).map((c) => (
              <span key={c} className="size-2 rounded-sm" style={{ backgroundColor: c }} />
            ))}
          </div>
        )}
        {children}
      </div>
      <div className="p-2.5">
        <p className="text-[12px] text-white/80 truncate" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-white/40">{formatBytes(file.size)}</span>
          <span className="text-[10px] text-white/40 uppercase">{file.type}</span>
        </div>
        {file.aiTags && file.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {file.aiTags.slice(0, 3).map((t) => (
              <span
                key={t.tag}
                className="px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[9px] text-violet-200"
              >
                {t.tag}
              </span>
            ))}
          </div>
        )}
        {(file.reactions?.length ?? 0) > 0 && (
          <div className="mt-1">
            <ReactionsBar folderId={folderId} fileId={file.id} compact />
          </div>
        )}
        {file.description && (
          <p className="text-[10px] text-white/40 mt-1 line-clamp-2">{file.description}</p>
        )}
      </div>
    </div>
  )
}

function SubfolderDropTarget({
  folderId,
  children,
}: {
  folderId: string
  children: React.ReactNode
}) {
  const { moveFile, moveFolder } = useFolders()
  const drop = useDropTarget({
    id: `sub-${folderId}`,
    accept: ["file", "folder"],
    onDropItem: (item) => {
      if (item.kind === "file") {
        moveFile(item.folderId, item.fileId, folderId)
        toast.success("File moved")
      } else if (item.kind === "folder" && item.folderId !== folderId) {
        moveFolder(item.folderId, folderId)
        toast.success("Folder nested")
      }
    },
    canDrop: (item) => item.kind === "folder" ? item.folderId !== folderId : true,
  })
  return (
    <div
      {...drop.dropProps}
      className={`relative rounded-2xl transition-all ${
        drop.isOver ? "ring-2 ring-sky-400/60 ring-offset-2 ring-offset-[#161616]" : ""
      }`}
    >
      {children}
      {drop.isOver && (
        <div className="absolute inset-0 rounded-2xl bg-sky-400/10 pointer-events-none flex items-center justify-center">
          <div className="px-3 py-1.5 rounded-full bg-sky-500 text-white text-[12px] font-medium">
            Drop to move
          </div>
        </div>
      )}
    </div>
  )
}

export function FolderDetailDialog() {
  const {
    openFolderId,
    navigationStack,
    closeFolder,
    navigateBack,
    navigateToSubfolder,
    navigateToBreadcrumb,
    getFolder,
    getSubfolders,
    renameFolder,
    updateFolderMetadata,
    deleteFolder,
    deleteFile,
    renameFile,
    updateFileMetadata,
    createEmptyFolder,
    toggleFolderFavorite,
    toggleFolderPin,
    duplicateFolder,
    moveFolder,
    moveFile,
    bulkDeleteFiles,
    bulkMoveFiles,
    toggleFileFavorite,
    openLightbox,
    getDescendantIds,
    setFolderCover,
    setFolderNotes,
    startSlideshow,
    openCompare,
    setShareDialogOpen,
    setBulkRenameOpen,
    setBulkEditOpen,
    setFolderLocked,
    setImageSearchTarget,
    togglePinFile,
    setFileAiTags,
    setFileOcr,
  } = useFolders()

  const isOpen = openFolderId !== null
  const folder = openFolderId ? getFolder(openFolderId) : undefined
  const subfolders = openFolderId ? getSubfolders(openFolderId) : []

  const [tab, setTab] = useState<TabKey>("files")
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [tagsEditing, setTagsEditing] = useState(false)
  const [tagsDraft, setTagsDraft] = useState("")
  const [innerSearch, setInnerSearch] = useState("")
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [fileNameDraft, setFileNameDraft] = useState("")
  const [fileDescDraft, setFileDescDraft] = useState("")
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false)

  const [fileSort, setFileSort] = useState<FileSortKey>("date-desc")
  const [fileFilter, setFileFilter] = useState<FileFilterKind>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [groupBy, setGroupBy] = useState<GroupKind>("none")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const titleInputRef = useRef<HTMLInputElement>(null)

  // Reset state when folder changes
  useEffect(() => {
    setTab("files")
    setTitleEditing(false)
    setTagsEditing(false)
    setInnerSearch("")
    setEditingFileId(null)
    setConfirmDeleteFolder(false)
    setSelected(new Set())
    if (folder) {
      setTitleDraft(folder.title)
      setTagsDraft((folder.tags ?? []).join(", "))
    }
  }, [openFolderId])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (e.key === "Escape" && !titleEditing && !tagsEditing && !editingFileId && !confirmDeleteFolder) {
        if (selected.size > 0) {
          setSelected(new Set())
        } else {
          closeFolder()
        }
      }
      if (!isTyping && (e.key === "Delete" || e.key === "Backspace") && selected.size > 0 && folder) {
        e.preventDefault()
        bulkDeleteFiles(String(folder.id), Array.from(selected))
        toast.success(`Deleted ${selected.size} file${selected.size === 1 ? "" : "s"}`)
        setSelected(new Set())
      }
      if (!isTyping && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && folder) {
        e.preventDefault()
        const allFileIds = (folder.files ?? []).map((f) => f.id)
        setSelected(new Set(allFileIds))
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [
    isOpen,
    closeFolder,
    titleEditing,
    tagsEditing,
    editingFileId,
    confirmDeleteFolder,
    selected,
    folder,
    bulkDeleteFiles,
  ])

  useEffect(() => {
    if (titleEditing) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [titleEditing])

  const filteredFiles = useMemo(() => {
    if (!folder) return []
    let list = [...(folder.files ?? [])]
    const q = innerSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.description ?? "").toLowerCase().includes(q) ||
          (f.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (fileFilter !== "all") {
      if (fileFilter === "favorites") list = list.filter((f) => f.favorite)
      else list = list.filter((f) => f.type === fileFilter)
    }
    switch (fileSort) {
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name))
        break
      case "date-desc":
        list.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
        break
      case "date-asc":
        list.sort((a, b) => +new Date(a.uploadedAt) - +new Date(b.uploadedAt))
        break
      case "size-desc":
        list.sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
        break
      case "size-asc":
        list.sort((a, b) => (a.size ?? 0) - (b.size ?? 0))
        break
      case "type":
        list.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
        break
    }
    // Pinned files always first
    list.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
    return list
  }, [folder, innerSearch, fileFilter, fileSort])

  const groupedFiles = useMemo(() => {
    if (groupBy === "none") return [{ key: "All", items: filteredFiles }]
    const groups = new Map<string, FolderFile[]>()
    for (const f of filteredFiles) {
      const key =
        groupBy === "type" ? f.type[0].toUpperCase() + f.type.slice(1) + "s" : dateGroupKey(f.uploadedAt)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(f)
    }
    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }))
  }, [filteredFiles, groupBy])

  const filteredSubfolders = useMemo(() => {
    const q = innerSearch.trim().toLowerCase()
    if (!q) return subfolders
    return subfolders.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    )
  }, [subfolders, innerSearch])

  const breadcrumb = useMemo(() => {
    return navigationStack
      .map((id) => getFolder(id))
      .filter(Boolean)
      .map((f) => ({ id: String(f!.id), title: f!.title, icon: f!.icon }))
  }, [navigationStack, getFolder])

  if (!folder) return null

  const handleSaveTitle = () => {
    const t = titleDraft.trim()
    if (t && t !== folder.title) {
      renameFolder(String(folder.id), t)
      toast.success("Renamed folder")
    }
    setTitleEditing(false)
  }

  const handleSaveTags = () => {
    const parsed = tagsDraft
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    updateFolderMetadata(String(folder.id), { tags: parsed })
    setTagsEditing(false)
    toast.success("Updated tags")
  }

  const handleDeleteFolder = () => {
    const id = String(folder.id)
    closeFolder()
    setTimeout(() => {
      deleteFolder(id)
      toast.success("Moved to trash")
    }, 200)
  }

  const handleDownload = (file: FolderFile) => {
    const a = document.createElement("a")
    a.href = file.url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const toggleSelect = (fileId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }

  const itemCount = (folder.files?.length ?? 0) + subfolders.length
  const totalSize = (folder.files ?? []).reduce((acc, f) => acc + (f.size ?? 0), 0)
  const headerColor = folder.color
  const moveExcludeIds = [String(folder.id), ...getDescendantIds(String(folder.id))]
  const coverFile = folder.coverFileId
    ? (folder.files ?? []).find((f) => f.id === folder.coverFileId)
    : undefined

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeFolder}
          />

          <motion.div
            className="relative w-full max-w-[940px] max-h-[90vh] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
              {breadcrumb.length > 1 && (
                <button
                  onClick={navigateBack}
                  className="size-8 flex items-center justify-center rounded-full hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
              )}
              <nav className="flex items-center gap-1 text-[13px] text-white/40 min-w-0 flex-1 overflow-hidden">
                {breadcrumb.map((b, i) => {
                  const isLast = i === breadcrumb.length - 1
                  return (
                    <div key={b.id} className="flex items-center gap-1 min-w-0">
                      {i > 0 && <span className="text-white/20">/</span>}
                      <button
                        onClick={() => !isLast && navigateToBreadcrumb(b.id)}
                        className={`flex items-center gap-1 truncate rounded px-1 py-0.5 transition-colors ${
                          isLast
                            ? "text-white/90 cursor-default"
                            : "text-white/40 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {b.icon && <span className="text-xs">{b.icon}</span>}
                        <span className="truncate">{b.title}</span>
                      </button>
                    </div>
                  )
                })}
              </nav>
              {folder.share && (
                <button
                  onClick={() => setShareDialogOpen(String(folder.id))}
                  className="h-7 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200 flex items-center gap-1.5"
                  title="Currently shared"
                >
                  <Share2 className="size-3" />
                  Shared
                  {folder.share.sharedWith.length > 0 && (
                    <span className="text-[10px] text-emerald-300/80">
                      · {folder.share.sharedWith.length}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={closeFolder}
                className="size-8 flex items-center justify-center rounded-full hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Cover banner */}
              {coverFile && (
                <div className="relative h-[140px] overflow-hidden">
                  <img
                    src={coverFile.url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161616] to-transparent" />
                </div>
              )}

              {/* Banner with metadata */}
              <div
                className="relative px-5 sm:px-6 pt-5 pb-4"
                style={
                  headerColor && !coverFile
                    ? { background: `linear-gradient(180deg, ${headerColor}40 0%, transparent 100%)` }
                    : undefined
                }
              >
                <div className="flex items-start gap-3">
                  <FolderDecoratorPopover
                    folderId={String(folder.id)}
                    trigger={
                      <button
                        className="shrink-0 size-12 rounded-xl flex items-center justify-center text-2xl transition-colors hover:scale-105 active:scale-95"
                        style={{
                          backgroundColor: folder.color ?? "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {folder.icon ?? "📁"}
                      </button>
                    }
                  />

                  <div className="flex-1 min-w-0">
                    {titleEditing ? (
                      <input
                        ref={titleInputRef}
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTitle()
                          if (e.key === "Escape") {
                            setTitleDraft(folder.title)
                            setTitleEditing(false)
                          }
                        }}
                        className="w-full bg-transparent border-none text-xl sm:text-2xl font-semibold text-white focus:outline-none px-0"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setTitleDraft(folder.title)
                          setTitleEditing(true)
                        }}
                        className="text-left text-xl sm:text-2xl font-semibold text-white hover:text-white/80 transition-colors truncate max-w-full"
                      >
                        {folder.title}
                      </button>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[12px] text-white/40 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Files className="size-3" />
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                      {totalSize > 0 && <span>· {formatBytes(totalSize)}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(folder.createdAt)}
                      </span>
                      {folder.updatedAt && folder.updatedAt !== folder.createdAt && (
                        <span className="text-white/30">· Updated {formatDate(folder.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action row */}
                <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                  <ActionPill
                    active={!!folder.favorite}
                    onClick={() => {
                      toggleFolderFavorite(String(folder.id))
                      toast.success(folder.favorite ? "Unfavorited" : "Favorited")
                    }}
                    icon={
                      <Star className={`size-3.5 ${folder.favorite ? "fill-yellow-300 text-yellow-300" : ""}`} />
                    }
                    label={folder.favorite ? "Favorited" : "Favorite"}
                  />
                  <ActionPill
                    active={!!folder.pinned}
                    onClick={() => {
                      toggleFolderPin(String(folder.id))
                      toast.success(folder.pinned ? "Unpinned" : "Pinned")
                    }}
                    icon={<Pin className={`size-3.5 ${folder.pinned ? "text-sky-300" : ""}`} />}
                    label={folder.pinned ? "Pinned" : "Pin"}
                  />
                  <FolderDecoratorPopover
                    folderId={String(folder.id)}
                    trigger={
                      <button className="h-7 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5">
                        <Palette className="size-3.5" />
                        <span className="hidden sm:inline">Decorate</span>
                      </button>
                    }
                  />
                  <ActionPill
                    onClick={() => {
                      const newId = duplicateFolder(String(folder.id))
                      if (newId) toast.success("Duplicated")
                    }}
                    icon={<Copy className="size-3.5" />}
                    label="Duplicate"
                  />
                  <MoveToPopover
                    excludeIds={moveExcludeIds}
                    allowRoot
                    onSelect={(destId) => {
                      moveFolder(String(folder.id), destId)
                      toast.success(destId ? "Moved" : "Moved to root")
                    }}
                    trigger={
                      <button className="h-7 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5">
                        <ArrowRightLeft className="size-3.5" />
                        <span className="hidden sm:inline">Move</span>
                      </button>
                    }
                  />
                  <ActionPill
                    onClick={() => setShareDialogOpen(String(folder.id))}
                    icon={<Share2 className="size-3.5" />}
                    label="Share"
                  />
                  {(folder.files?.length ?? 0) > 0 && (
                    <ActionPill
                      onClick={() => startSlideshow(String(folder.id))}
                      icon={<Play className="size-3.5" />}
                      label="Slideshow"
                    />
                  )}
                  <ActionPill
                    onClick={() => {
                      const description = aiDescribeFolder(folder, subfolders)
                      updateFolderMetadata(String(folder.id), { description })
                      toast.success("AI description generated")
                    }}
                    icon={<Wand2 className="size-3.5" />}
                    label="AI describe"
                  />
                  <ActionPill
                    onClick={() => {
                      const cover = aiSuggestCover(folder)
                      if (cover) {
                        setFolderCover(String(folder.id), cover)
                        toast.success("Cover suggested")
                      } else {
                        toast.error("No image files to use")
                      }
                    }}
                    icon={<Sparkles className="size-3.5" />}
                    label="Suggest cover"
                  />
                  <ActionPill
                    active={!!folder.locked}
                    onClick={() => {
                      setFolderLocked(String(folder.id), !folder.locked)
                      toast.success(folder.locked ? "Unlocked" : "Locked")
                    }}
                    icon={folder.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                    label={folder.locked ? "Locked" : "Lock"}
                  />
                  <button
                    onClick={() => setConfirmDeleteFolder(true)}
                    disabled={folder.locked}
                    className="h-7 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 ml-auto disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>

                {/* Status / Due / Custom fields row */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <WorkflowStatusPill folderId={String(folder.id)} />
                  <DueDatePicker folderId={String(folder.id)} />
                </div>

                {/* Description */}
                {folder.description && (
                  <p className="mt-4 text-[13px] text-white/60 px-3">{folder.description}</p>
                )}

                {/* Tags */}
                <div className="mt-2">
                  {tagsEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={tagsDraft}
                        onChange={(e) => setTagsDraft(e.target.value)}
                        placeholder="comma, separated, tags"
                        className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-full px-3 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTags()
                          if (e.key === "Escape") {
                            setTagsDraft((folder.tags ?? []).join(", "))
                            setTagsEditing(false)
                          }
                        }}
                      />
                      <button
                        onClick={handleSaveTags}
                        className="size-7 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors"
                      >
                        <Check className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setTagsDraft((folder.tags ?? []).join(", "))
                        setTagsEditing(true)
                      }}
                      className="flex items-center gap-1.5 flex-wrap rounded-lg px-3 py-1.5 hover:bg-white/[0.03] transition-colors"
                    >
                      <Tag className="size-3 text-white/30" />
                      {(folder.tags ?? []).length === 0 ? (
                        <span className="text-[12px] text-white/30 italic">Add tags...</span>
                      ) : (
                        (folder.tags ?? []).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] text-white/70"
                          >
                            {t}
                          </span>
                        ))
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="px-5 sm:px-6 border-t border-white/[0.04] flex items-center gap-0">
                {(["files", "notes", "activity"] as TabKey[]).map((t) => {
                  const TabIcon = t === "files" ? Files : t === "notes" ? StickyNote : Activity
                  const active = tab === t
                  const count =
                    t === "files"
                      ? folder.files?.length ?? 0
                      : t === "activity"
                        ? folder.activity?.length ?? 0
                        : 0
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-2.5 text-[12px] flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${
                        active
                          ? "text-white border-white/80"
                          : "text-white/50 border-transparent hover:text-white/80"
                      }`}
                    >
                      <TabIcon className="size-3.5" />
                      <span className="capitalize">{t}</span>
                      {count > 0 && (
                        <span className="text-[10px] text-white/40 font-mono">{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Tab content */}
              {tab === "notes" && (
                <div className="px-5 sm:px-6 py-4">
                  <NotesEditor
                    value={folder.notes ?? ""}
                    onSave={(v) => setFolderNotes(String(folder.id), v)}
                  />
                </div>
              )}

              {tab === "activity" && (
                <div className="px-5 sm:px-6 py-4">
                  <ActivityTimeline entries={folder.activity ?? []} />
                </div>
              )}

              {tab === "files" && (
                <>
                  {/* In-folder toolbar */}
                  <div className="px-5 sm:px-6 py-3 border-t border-white/[0.04] flex items-center gap-2 flex-wrap sticky top-0 bg-[#161616]/95 backdrop-blur-md z-10">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/40 pointer-events-none" />
                      <input
                        value={innerSearch}
                        onChange={(e) => setInnerSearch(e.target.value)}
                        placeholder="Search inside this folder..."
                        className="w-full h-8 pl-8 pr-3 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5">
                          <Filter className="size-3.5" />
                          <span className="hidden md:inline">
                            {FILE_FILTERS.find((o) => o.value === fileFilter)?.label}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#1a1a1a] border-white/[0.08] text-white min-w-[160px]"
                      >
                        <DropdownMenuLabel className="text-white/50 text-xs uppercase tracking-wide">
                          File type
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                        <DropdownMenuRadioGroup
                          value={fileFilter}
                          onValueChange={(v) => setFileFilter(v as FileFilterKind)}
                        >
                          {FILE_FILTERS.map((o) => (
                            <DropdownMenuRadioItem
                              key={o.value}
                              value={o.value}
                              className="text-sm text-white/80 focus:bg-white/[0.06] focus:text-white"
                            >
                              {o.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5">
                          <ArrowDownUp className="size-3.5" />
                          <span className="hidden md:inline">
                            {FILE_SORTS.find((o) => o.value === fileSort)?.label}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#1a1a1a] border-white/[0.08] text-white min-w-[180px]"
                      >
                        <DropdownMenuLabel className="text-white/50 text-xs uppercase tracking-wide">
                          Sort
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                        <DropdownMenuRadioGroup
                          value={fileSort}
                          onValueChange={(v) => setFileSort(v as FileSortKey)}
                        >
                          {FILE_SORTS.map((o) => (
                            <DropdownMenuRadioItem
                              key={o.value}
                              value={o.value}
                              className="text-sm text-white/80 focus:bg-white/[0.06] focus:text-white"
                            >
                              {o.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {viewMode !== "calendar" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5">
                            <Group className="size-3.5" />
                            <span className="hidden lg:inline">
                              {GROUP_OPTIONS.find((o) => o.value === groupBy)?.label}
                            </span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#1a1a1a] border-white/[0.08] text-white min-w-[160px]"
                        >
                          <DropdownMenuLabel className="text-white/50 text-xs uppercase tracking-wide">
                            Grouping
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          <DropdownMenuRadioGroup
                            value={groupBy}
                            onValueChange={(v) => setGroupBy(v as GroupKind)}
                          >
                            {GROUP_OPTIONS.map((o) => (
                              <DropdownMenuRadioItem
                                key={o.value}
                                value={o.value}
                                className="text-sm text-white/80 focus:bg-white/[0.06] focus:text-white"
                              >
                                {o.label}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <div className="h-8 px-1 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`size-7 flex items-center justify-center rounded-full transition-colors ${
                          viewMode === "grid" ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                        }`}
                        title="Grid"
                      >
                        <LayoutGrid className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`size-7 flex items-center justify-center rounded-full transition-colors ${
                          viewMode === "list" ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                        }`}
                        title="List"
                      >
                        <List className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode("calendar")}
                        className={`size-7 flex items-center justify-center rounded-full transition-colors ${
                          viewMode === "calendar" ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                        }`}
                        title="Calendar"
                      >
                        <CalendarDays className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode("map")}
                        className={`size-7 flex items-center justify-center rounded-full transition-colors ${
                          viewMode === "map" ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                        }`}
                        title="Map"
                      >
                        <MapPin className="size-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const id = createEmptyFolder(String(folder.id))
                        toast.success("Subfolder created")
                        setTimeout(() => navigateToSubfolder(id), 150)
                      }}
                      className="h-8 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5"
                    >
                      <FolderPlus className="size-3.5" />
                      <span className="hidden lg:inline">Subfolder</span>
                    </button>
                  </div>

                  {/* Bulk action bar */}
                  <AnimatePresence>
                    {selected.size > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mx-5 sm:mx-6 mb-3 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center gap-2 flex-wrap"
                      >
                        <span className="text-[12px] text-white font-medium">
                          {selected.size} selected
                        </span>
                        <span className="text-white/30">·</span>
                        <button
                          onClick={() => {
                            const ids = Array.from(selected)
                            for (const id of ids) toggleFileFavorite(String(folder.id), id)
                            toast.success(`Favorited ${ids.length}`)
                          }}
                          className="h-7 px-2.5 rounded-full text-[12px] text-white/80 hover:text-white hover:bg-white/[0.08] flex items-center gap-1"
                        >
                          <Star className="size-3.5" />
                          Favorite
                        </button>
                        <button
                          onClick={() =>
                            setBulkRenameOpen({
                              folderId: String(folder.id),
                              fileIds: Array.from(selected),
                            })
                          }
                          className="h-7 px-2.5 rounded-full text-[12px] text-white/80 hover:text-white hover:bg-white/[0.08] flex items-center gap-1"
                        >
                          <Edit3 className="size-3.5" />
                          Rename
                        </button>
                        <button
                          onClick={() =>
                            setBulkEditOpen({
                              folderId: String(folder.id),
                              fileIds: Array.from(selected),
                            })
                          }
                          className="h-7 px-2.5 rounded-full text-[12px] text-white/80 hover:text-white hover:bg-white/[0.08] flex items-center gap-1"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        {selected.size === 2 && (
                          <button
                            onClick={() => {
                              const [a, b] = Array.from(selected)
                              openCompare(String(folder.id), a, b)
                            }}
                            className="h-7 px-2.5 rounded-full text-[12px] text-white/80 hover:text-white hover:bg-white/[0.08] flex items-center gap-1"
                          >
                            <GitCompare className="size-3.5" />
                            Compare
                          </button>
                        )}
                        <MoveToPopover
                          excludeIds={[String(folder.id)]}
                          onSelect={(destId) => {
                            if (!destId) return
                            bulkMoveFiles(String(folder.id), Array.from(selected), destId)
                            toast.success(`Moved ${selected.size} files`)
                            setSelected(new Set())
                          }}
                          trigger={
                            <button className="h-7 px-2.5 rounded-full text-[12px] text-white/80 hover:text-white hover:bg-white/[0.08] flex items-center gap-1">
                              <ArrowRightLeft className="size-3.5" />
                              Move
                            </button>
                          }
                        />
                        <button
                          onClick={() => {
                            bulkDeleteFiles(String(folder.id), Array.from(selected))
                            toast.success(`Deleted ${selected.size}`)
                            setSelected(new Set())
                          }}
                          className="h-7 px-2.5 rounded-full text-[12px] text-white/80 hover:text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                        <button
                          onClick={() => setSelected(new Set())}
                          className="h-7 px-2.5 rounded-full text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06] ml-auto"
                        >
                          Clear
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Subfolders */}
                  {filteredSubfolders.length > 0 && (
                    <div className="px-5 sm:px-6 pb-4">
                      <div className="text-[11px] uppercase tracking-wider text-white/40 mb-3">
                        Subfolders ({filteredSubfolders.length})
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                        {filteredSubfolders.map((sub, i) => (
                          <SubfolderDropTarget key={sub.id} folderId={String(sub.id)}>
                            <div className="shrink-0">
                              <ProjectFolder
                                project={sub}
                                index={i}
                                onClick={() => navigateToSubfolder(String(sub.id))}
                                onRemove={() => {
                                  deleteFolder(String(sub.id))
                                  toast.success("Moved to trash")
                                }}
                                onCancel={() => deleteFolder(String(sub.id))}
                                onRename={(t) => renameFolder(String(sub.id), t)}
                              />
                            </div>
                          </SubfolderDropTarget>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload */}
                  <div className="px-5 sm:px-6 pb-4">
                    <FileUploadZone folderId={String(folder.id)} compact />
                  </div>

                  {/* Files */}
                  <div className="px-5 sm:px-6 pb-6">
                    <div className="text-[11px] uppercase tracking-wider text-white/40 mb-3 flex items-center justify-between">
                      <span>Files ({filteredFiles.length})</span>
                      {filteredFiles.length > 0 && viewMode !== "calendar" && (
                        <button
                          onClick={() => {
                            const allIds = filteredFiles.map((f) => f.id)
                            const allSelected = allIds.every((id) => selected.has(id))
                            if (allSelected) {
                              setSelected((prev) => {
                                const next = new Set(prev)
                                for (const id of allIds) next.delete(id)
                                return next
                              })
                            } else {
                              setSelected((prev) => {
                                const next = new Set(prev)
                                for (const id of allIds) next.add(id)
                                return next
                              })
                            }
                          }}
                          className="text-[10px] text-white/40 hover:text-white"
                        >
                          {filteredFiles.every((f) => selected.has(f.id)) ? "Deselect all" : "Select all"}
                        </button>
                      )}
                    </div>

                    {viewMode === "calendar" ? (
                      <FolderCalendarView folderId={String(folder.id)} files={filteredFiles} />
                    ) : viewMode === "map" ? (
                      <MapView folderId={String(folder.id)} files={filteredFiles} />
                    ) : filteredFiles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/[0.08] py-10 text-center">
                        <p className="text-sm text-white/40">
                          {innerSearch || fileFilter !== "all"
                            ? "No files match your filters."
                            : "No files yet — upload some above."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {groupedFiles.map((group) => (
                          <div key={`${groupBy}-${group.key}`}>
                            {groupBy !== "none" && (
                              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
                                <span>{group.key}</span>
                                <span className="text-white/30">{group.items.length}</span>
                                <span className="flex-1 h-px bg-white/[0.04]" />
                              </div>
                            )}
                            {viewMode === "grid" ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {group.items.map((file) => {
                                  const isCover = folder.coverFileId === file.id
                                  return (
                                    <FileGridItem
                                      key={file.id}
                                      folderId={String(folder.id)}
                                      file={file}
                                      isSelected={selected.has(file.id)}
                                      isCover={isCover}
                                      onToggleSelect={() => toggleSelect(file.id)}
                                      onClick={() =>
                                        file.type === "image" && openLightbox(String(folder.id), file.id)
                                      }
                                      onEdit={() => {
                                        setEditingFileId(file.id)
                                        setFileNameDraft(file.name)
                                        setFileDescDraft(file.description ?? "")
                                      }}
                                    >
                                      {/* Hover actions */}
                                      <div className="absolute inset-x-0 bottom-0 p-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleFileFavorite(String(folder.id), file.id)
                                          }}
                                          className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-yellow-300 backdrop-blur-sm"
                                          title="Favorite"
                                        >
                                          <Star className={`size-3 ${file.favorite ? "fill-yellow-300 text-yellow-300" : ""}`} />
                                        </button>
                                        {file.type === "image" && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setFolderCover(
                                                String(folder.id),
                                                isCover ? undefined : file.id,
                                              )
                                              toast.success(isCover ? "Cover cleared" : "Set as cover")
                                            }}
                                            className={`size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm ${
                                              isCover ? "ring-1 ring-white" : ""
                                            }`}
                                            title="Set as cover"
                                          >
                                            <ImagePlus className="size-3" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            togglePinFile(String(folder.id), file.id)
                                            toast.success(file.pinned ? "Unpinned" : "Pinned to top")
                                          }}
                                          className={`size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm ${
                                            file.pinned ? "text-sky-300" : "text-white/70 hover:text-sky-200"
                                          }`}
                                          title="Pin file"
                                        >
                                          <Pin className="size-3" />
                                        </button>
                                        {file.type === "image" && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setImageSearchTarget({ folderId: String(folder.id), fileId: file.id })
                                            }}
                                            className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm"
                                            title="Find similar"
                                          >
                                            <SearchIcon className="size-3" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const tags = aiAutoTagFile(file)
                                            setFileAiTags(String(folder.id), file.id, tags)
                                            if (file.type === "image") {
                                              setFileOcr(String(folder.id), file.id, aiOcrFile(file))
                                            }
                                            toast.success(`AI tagged with ${tags.length} labels`)
                                          }}
                                          className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-violet-200 backdrop-blur-sm"
                                          title="AI tag"
                                        >
                                          <Sparkles className="size-3" />
                                        </button>
                                        <MoveToPopover
                                          excludeIds={[String(folder.id)]}
                                          onSelect={(destId) => {
                                            if (!destId) return
                                            moveFile(String(folder.id), file.id, destId)
                                            toast.success("Moved")
                                          }}
                                          trigger={
                                            <button
                                              onClick={(e) => e.stopPropagation()}
                                              className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm"
                                              title="Move"
                                            >
                                              <ArrowRightLeft className="size-3" />
                                            </button>
                                          }
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingFileId(file.id)
                                            setFileNameDraft(file.name)
                                            setFileDescDraft(file.description ?? "")
                                          }}
                                          className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm"
                                          title="Edit"
                                        >
                                          <Pencil className="size-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDownload(file)
                                          }}
                                          className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm"
                                          title="Download"
                                        >
                                          <Download className="size-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            deleteFile(String(folder.id), file.id)
                                            toast.success("Removed")
                                          }}
                                          className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-500/40 text-white/70 hover:text-white backdrop-blur-sm"
                                          title="Delete"
                                        >
                                          <Trash2 className="size-3" />
                                        </button>
                                      </div>
                                      {editingFileId === file.id && (
                                        <FileInlineEditorOverlay
                                          nameDraft={fileNameDraft}
                                          descDraft={fileDescDraft}
                                          onNameChange={setFileNameDraft}
                                          onDescChange={setFileDescDraft}
                                          onCancel={() => setEditingFileId(null)}
                                          onSave={() => {
                                            const trimmedName = fileNameDraft.trim() || file.name
                                            if (trimmedName !== file.name) {
                                              renameFile(String(folder.id), file.id, trimmedName)
                                            }
                                            if (fileDescDraft !== (file.description ?? "")) {
                                              updateFileMetadata(String(folder.id), file.id, {
                                                description: fileDescDraft,
                                              })
                                            }
                                            setEditingFileId(null)
                                            toast.success("File updated")
                                          }}
                                        />
                                      )}
                                    </FileGridItem>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                {group.items.map((file, i) => {
                                  const Icon = FILE_ICONS[file.type] ?? FileIcon
                                  const isSelected = selected.has(file.id)
                                  return (
                                    <div
                                      key={file.id}
                                      className={`group flex items-center gap-3 px-3 py-2 transition-colors ${
                                        i > 0 ? "border-t border-white/[0.04]" : ""
                                      } ${isSelected ? "bg-sky-500/[0.08]" : "hover:bg-white/[0.03]"}`}
                                    >
                                      <button
                                        onClick={() => toggleSelect(file.id)}
                                        className={`size-5 rounded flex items-center justify-center ${
                                          isSelected
                                            ? "bg-sky-500 text-white"
                                            : "bg-white/[0.06] text-white/40 hover:text-white"
                                        }`}
                                      >
                                        {isSelected ? <Check className="size-3" /> : null}
                                      </button>
                                      <div
                                        className="size-9 rounded-md bg-black/40 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
                                        onClick={() =>
                                          file.type === "image" && openLightbox(String(folder.id), file.id)
                                        }
                                      >
                                        {file.type === "image" ? (
                                          <img
                                            src={file.url}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <Icon className="size-4 text-white/40" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[13px] text-white/85 truncate flex items-center gap-1.5">
                                          {file.favorite && (
                                            <Star className="size-3 text-yellow-300 fill-yellow-300 shrink-0" />
                                          )}
                                          {file.name}
                                        </div>
                                        {file.description && (
                                          <div className="text-[11px] text-white/40 truncate">
                                            {file.description}
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-white/40 hidden sm:block">
                                        {formatBytes(file.size)}
                                      </span>
                                      <span className="text-[11px] text-white/40 hidden md:block uppercase">
                                        {file.type}
                                      </span>
                                      <span className="text-[11px] text-white/40 hidden lg:block">
                                        {formatDate(file.uploadedAt)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Delete folder confirm */}
            <AnimatePresence>
              {confirmDeleteFolder && (
                <motion.div
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-5 max-w-sm mx-4"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                  >
                    <h3 className="text-base font-semibold text-white mb-1">Move to trash?</h3>
                    <p className="text-[13px] text-white/50">
                      "{folder.title}" and {itemCount} item{itemCount === 1 ? "" : "s"} will be moved to the trash.
                    </p>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setConfirmDeleteFolder(false)}
                        className="px-3 py-1.5 rounded-full text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteFolder}
                        className="px-3 py-1.5 rounded-full text-[13px] font-medium text-white"
                        style={{ backgroundColor: "oklch(0.5801 0.227 25.12)" }}
                      >
                        Move to trash
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ActionPill({
  active,
  onClick,
  icon,
  label,
}: {
  active?: boolean
  onClick?: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`h-7 px-2.5 rounded-full text-[12px] flex items-center gap-1.5 transition-colors border ${
        active
          ? "bg-white/[0.1] text-white border-white/[0.15]"
          : "bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border-white/[0.06]"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function FileInlineEditorOverlay({
  nameDraft,
  descDraft,
  onNameChange,
  onDescChange,
  onCancel,
  onSave,
}: {
  nameDraft: string
  descDraft: string
  onNameChange: (v: string) => void
  onDescChange: (v: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full bg-[#1a1a1a] border border-white/[0.1] rounded-lg p-2 space-y-1.5">
        <input
          value={nameDraft}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-white/20"
          placeholder="File name"
          autoFocus
        />
        <input
          value={descDraft}
          onChange={(e) => onDescChange(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white/80 focus:outline-none focus:border-white/20"
          placeholder="Description"
        />
        <div className="flex gap-1 justify-end">
          <button onClick={onCancel} className="px-2 py-0.5 text-[11px] text-white/50 hover:text-white">
            Cancel
          </button>
          <button onClick={onSave} className="px-2 py-0.5 text-[11px] font-medium text-black bg-white rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
