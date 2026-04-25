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
import { useT } from "@/contexts/i18n-context"
import {
  formatBytesLocalized,
  formatDateLocalized,
  localizeNumber,
  localizeTitle,
  localizeTag,
} from "@/lib/localize"
import type { TranslationKey } from "@/lib/i18n-dict"
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
import { ReactionsBar } from "./reactions-bar"
import { MapView } from "./map-view"
import { aiDescribeFolder, aiSuggestCover } from "@/lib/ai-helpers"
import { library } from "@/lib/library"
import { Lock, Unlock, Sparkles, MapPin, Wand2, Search as SearchIcon } from "lucide-react"

const FILE_ICONS = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  other: FileIcon,
} as const

const FILE_SORTS: { value: FileSortKey; key: TranslationKey }[] = [
  { value: "date-desc", key: "fileSort.dateDesc" },
  { value: "date-asc", key: "fileSort.dateAsc" },
  { value: "name-asc", key: "fileSort.nameAsc" },
  { value: "name-desc", key: "fileSort.nameDesc" },
  { value: "size-desc", key: "fileSort.sizeDesc" },
  { value: "size-asc", key: "fileSort.sizeAsc" },
  { value: "type", key: "fileSort.type" },
]

const FILE_FILTERS: { value: FileFilterKind; key: TranslationKey }[] = [
  { value: "all", key: "fileFilter.all" },
  { value: "favorites", key: "fileFilter.favorites" },
  { value: "image", key: "fileFilter.image" },
  { value: "video", key: "fileFilter.video" },
  { value: "document", key: "fileFilter.document" },
  { value: "other", key: "fileFilter.other" },
]

const GROUP_OPTIONS: { value: GroupKind; key: TranslationKey }[] = [
  { value: "none", key: "group.none" },
  { value: "type", key: "group.byType" },
  { value: "date", key: "group.byDate" },
]

const FILE_TYPE_GROUP_KEYS: Record<string, TranslationKey> = {
  image: "fileGroup.images",
  video: "fileGroup.videos",
  document: "fileGroup.documents",
  other: "fileGroup.others",
}

type TabKey = "files" | "notes" | "activity"

type Tfn = (key: TranslationKey, vars?: Record<string, string | number>) => string

function dateGroupKey(iso: string, t: Tfn): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((+now - +d) / (1000 * 60 * 60 * 24))
    if (diffDays < 1) return t("fileGroup.today")
    if (diffDays < 7) return t("fileGroup.thisWeek")
    if (diffDays < 30) return t("fileGroup.thisMonth")
    if (d.getFullYear() === now.getFullYear()) {
      const m = d.getMonth() + 1
      return t(`month.${m}` as TranslationKey)
    }
    return d.getFullYear().toString()
  } catch {
    return t("fileGroup.other")
  }
}

function FileGridItem({
  folderId,
  file,
  isSelected,
  isCover,
  onToggleSelect,
  onClick,
  onEdit: _onEdit,
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
  const { t, lang } = useT()

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
        aria-label={t("folder.selectAll")}
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
            {t("detail.cover")}
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
          <span className="text-[10px] text-white/40">
            {file.size ? formatBytesLocalized(file.size, t, lang) : ""}
          </span>
          <span className="text-[10px] text-white/40 uppercase">
            {t(`fileFilter.${file.type}` as TranslationKey)}
          </span>
        </div>
        {file.aiTags && file.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {file.aiTags.slice(0, 3).map((tag) => (
              <span
                key={tag.tag}
                className="px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[9px] text-violet-200"
              >
                {localizeTag(tag.tag, t)}
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
  const { t } = useT()
  const drop = useDropTarget({
    id: `sub-${folderId}`,
    accept: ["file", "folder"],
    onDropItem: (item) => {
      if (item.kind === "file") {
        moveFile(item.folderId, item.fileId, folderId)
        toast.success(t("toast.fileMoved2"))
      } else if (item.kind === "folder" && item.folderId !== folderId) {
        moveFolder(item.folderId, folderId)
        toast.success(t("toast.folderNested"))
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
            {t("detail.dropToMove")}
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
  const { t, lang } = useT()
  const formatBytes = (n?: number) => (n ? formatBytesLocalized(n, t, lang) : "")
  const formatDate = (iso: string) => {
    try {
      return formatDateLocalized(new Date(iso), t, lang)
    } catch {
      return iso
    }
  }

  const isOpen = openFolderId !== null
  const folder = openFolderId ? getFolder(openFolderId) : undefined
  const subfolders = useMemo(
    () => (openFolderId ? getSubfolders(openFolderId) : []),
    [openFolderId, getSubfolders],
  )

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
    // Intentionally only re-run on folder switch — we don't want every
    // mutation of the open folder to wipe in-progress edit drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        toast.success(
          selected.size === 1
            ? t("toast.deletedNFile", { n: selected.size })
            : t("toast.deletedNFiles", { n: selected.size }),
        )
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
    t,
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
    if (groupBy === "none") return [{ key: t("fileFilter.all"), items: filteredFiles }]
    const groups = new Map<string, FolderFile[]>()
    for (const f of filteredFiles) {
      const key =
        groupBy === "type"
          ? t(FILE_TYPE_GROUP_KEYS[f.type] ?? "fileGroup.others")
          : dateGroupKey(f.uploadedAt, t)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(f)
    }
    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }))
  }, [filteredFiles, groupBy, t])

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
      .map((f) => ({
        id: String(f!.id),
        title: localizeTitle({ id: String(f!.id), title: f!.title }, t),
        icon: f!.icon,
      }))
  }, [navigationStack, getFolder, t])

  if (!folder) return null

  const handleSaveTitle = () => {
    const newTitle = titleDraft.trim()
    if (newTitle && newTitle !== folder.title) {
      renameFolder(String(folder.id), newTitle)
      toast.success(t("toast.renamed"))
    }
    setTitleEditing(false)
  }

  const handleSaveTags = () => {
    const parsed = tagsDraft
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
    updateFolderMetadata(String(folder.id), { tags: parsed })
    setTagsEditing(false)
    toast.success(t("toast.tagsUpdated"))
  }

  const handleDeleteFolder = () => {
    const id = String(folder.id)
    closeFolder()
    setTimeout(() => {
      deleteFolder(id)
      toast.success(t("toast.movedToTrashShort"))
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
                  title={t("detail.currentlyShared")}
                >
                  <Share2 className="size-3" />
                  {t("detail.shared")}
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
                          backgroundColor: folder.color ?? "var(--surface-input-hover)",
                          border: "1px solid var(--border-strong)",
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
                        {localizeTitle(folder, t)}
                      </button>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[12px] text-white/40 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Files className="size-3" />
                        {itemCount === 1
                          ? t("detail.itemOne", { count: localizeNumber(itemCount, lang) })
                          : t("detail.itemMany", { count: localizeNumber(itemCount, lang) })}
                      </span>
                      {totalSize > 0 && <span>· {formatBytes(totalSize)}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(folder.createdAt)}
                      </span>
                      {folder.updatedAt && folder.updatedAt !== folder.createdAt && (
                        <span className="text-white/30">
                          · {t("detail.updatedSuffix", { date: formatDate(folder.updatedAt) })}
                        </span>
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
                      toast.success(t(folder.favorite ? "action.unfavorite" : "action.favorited"))
                    }}
                    icon={
                      <Star className={`size-3.5 ${folder.favorite ? "fill-yellow-300 text-yellow-300" : ""}`} />
                    }
                    label={t(folder.favorite ? "action.favorited" : "action.favorite")}
                  />
                  <ActionPill
                    active={!!folder.pinned}
                    onClick={() => {
                      toggleFolderPin(String(folder.id))
                      toast.success(t(folder.pinned ? "action.unpin" : "action.pinned"))
                    }}
                    icon={<Pin className={`size-3.5 ${folder.pinned ? "text-sky-300" : ""}`} />}
                    label={t(folder.pinned ? "action.pinned" : "action.pin")}
                  />
                  <FolderDecoratorPopover
                    folderId={String(folder.id)}
                    trigger={
                      <button className="h-7 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5">
                        <Palette className="size-3.5" />
                        <span className="hidden sm:inline">{t("action.decorate")}</span>
                      </button>
                    }
                  />
                  <ActionPill
                    onClick={() => {
                      const newId = duplicateFolder(String(folder.id))
                      if (newId) toast.success(t("toast.duplicated"))
                    }}
                    icon={<Copy className="size-3.5" />}
                    label={t("action.duplicate")}
                  />
                  <MoveToPopover
                    excludeIds={moveExcludeIds}
                    allowRoot
                    onSelect={(destId) => {
                      moveFolder(String(folder.id), destId)
                      toast.success(t(destId ? "action.moved" : "action.movedToRoot"))
                    }}
                    trigger={
                      <button className="h-7 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5">
                        <ArrowRightLeft className="size-3.5" />
                        <span className="hidden sm:inline">{t("action.move")}</span>
                      </button>
                    }
                  />
                  <ActionPill
                    onClick={() => setShareDialogOpen(String(folder.id))}
                    icon={<Share2 className="size-3.5" />}
                    label={t("action.share")}
                  />
                  {(folder.files?.length ?? 0) > 0 && (
                    <ActionPill
                      onClick={() => startSlideshow(String(folder.id))}
                      icon={<Play className="size-3.5" />}
                      label={t("action.slideshow")}
                    />
                  )}
                  <ActionPill
                    onClick={() => {
                      // First write a fast factual description from the data
                      // we already have, then upgrade it with a real LLM
                      // call when an AI key is configured.
                      const factual = aiDescribeFolder(folder, subfolders)
                      updateFolderMetadata(String(folder.id), { description: factual })
                      const tid = toast.loading(t("toast.aiDescribeDone"))
                      void library.ai
                        .describeFolder(String(folder.id))
                        .then((res) => {
                          if (res.description) {
                            updateFolderMetadata(String(folder.id), {
                              description: res.description,
                            })
                          }
                          toast.dismiss(tid)
                          toast.success(t("toast.aiDescribeDone"))
                        })
                        .catch((err) => {
                          toast.dismiss(tid)
                          // Local description already saved; surface the
                          // provider error but don't block the UX.
                          toast.message((err as Error).message ?? t("toast.aiNoKey"))
                        })
                    }}
                    icon={<Wand2 className="size-3.5" />}
                    label={t("action.aiDescribe")}
                  />
                  <ActionPill
                    onClick={() => {
                      const cover = aiSuggestCover(folder)
                      if (cover) {
                        setFolderCover(String(folder.id), cover)
                        toast.success(t("toast.coverSuggested"))
                      } else {
                        toast.error(t("toast.noImageFiles"))
                      }
                    }}
                    icon={<Sparkles className="size-3.5" />}
                    label={t("action.suggestCover")}
                  />
                  <ActionPill
                    active={!!folder.locked}
                    onClick={() => {
                      setFolderLocked(String(folder.id), !folder.locked)
                      toast.success(t(folder.locked ? "action.unlocked" : "action.locked"))
                    }}
                    icon={folder.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                    label={t(folder.locked ? "action.locked" : "action.lock")}
                  />
                  <button
                    onClick={() => setConfirmDeleteFolder(true)}
                    disabled={folder.locked}
                    className="h-7 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 ml-auto disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="hidden sm:inline">{t("action.delete")}</span>
                  </button>
                </div>

                {/* Status / Due / Custom fields row */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <WorkflowStatusPill folderId={String(folder.id)} />
                  <DueDatePicker folderId={String(folder.id)} />
                </div>

                {/* Description */}
                {folder.description && (
                  <p className="mt-4 text-[13px] text-white/60 px-3">
                    {(() => {
                      const seedKey = `seedDesc.${folder.id}` as TranslationKey
                      const localized = t(seedKey)
                      return localized && localized !== seedKey ? localized : folder.description
                    })()}
                  </p>
                )}

                {/* Tags */}
                <div className="mt-2">
                  {tagsEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={tagsDraft}
                        onChange={(e) => setTagsDraft(e.target.value)}
                        placeholder={t("detail.tagsPlaceholder")}
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
                        <span className="text-[12px] text-white/30 italic">{t("folder.addTags")}</span>
                      ) : (
                        (folder.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] text-white/70"
                          >
                            {localizeTag(tag, t)}
                          </span>
                        ))
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="px-5 sm:px-6 border-t border-white/[0.04] flex items-center gap-0">
                {(["files", "notes", "activity"] as TabKey[]).map((tk) => {
                  const TabIcon = tk === "files" ? Files : tk === "notes" ? StickyNote : Activity
                  const active = tab === tk
                  const count =
                    tk === "files"
                      ? folder.files?.length ?? 0
                      : tk === "activity"
                        ? folder.activity?.length ?? 0
                        : 0
                  const labelKey: TranslationKey =
                    tk === "files" ? "detail.tabFiles" : tk === "notes" ? "detail.tabNotes" : "detail.tabActivity"
                  return (
                    <button
                      key={tk}
                      onClick={() => setTab(tk)}
                      className={`px-3 py-2.5 text-[12px] flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${
                        active
                          ? "text-white border-white/80"
                          : "text-white/50 border-transparent hover:text-white/80"
                      }`}
                    >
                      <TabIcon className="size-3.5" />
                      <span>{t(labelKey)}</span>
                      {count > 0 && (
                        <span className="text-[10px] text-white/40 font-mono">{localizeNumber(count, lang)}</span>
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
                        placeholder={t("detail.searchPlaceholder")}
                        className="w-full h-8 pl-8 pr-3 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5">
                          <Filter className="size-3.5" />
                          <span className="hidden md:inline">
                            {(() => {
                              const opt = FILE_FILTERS.find((o) => o.value === fileFilter)
                              return opt ? t(opt.key) : ""
                            })()}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#1a1a1a] border-white/[0.08] text-white min-w-[160px]"
                      >
                        <DropdownMenuLabel className="text-white/50 text-xs uppercase tracking-wide">
                          {t("group.fileType")}
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
                              {t(o.key)}
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
                            {(() => {
                              const opt = FILE_SORTS.find((o) => o.value === fileSort)
                              return opt ? t(opt.key) : ""
                            })()}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#1a1a1a] border-white/[0.08] text-white min-w-[180px]"
                      >
                        <DropdownMenuLabel className="text-white/50 text-xs uppercase tracking-wide">
                          {t("toolbar.sort")}
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
                              {t(o.key)}
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
                              {(() => {
                                const opt = GROUP_OPTIONS.find((o) => o.value === groupBy)
                                return opt ? t(opt.key) : ""
                              })()}
                            </span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#1a1a1a] border-white/[0.08] text-white min-w-[160px]"
                        >
                          <DropdownMenuLabel className="text-white/50 text-xs uppercase tracking-wide">
                            {t("group.label")}
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
                                {t(o.key)}
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
                        title={t("view.gridLabel")}
                      >
                        <LayoutGrid className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`size-7 flex items-center justify-center rounded-full transition-colors ${
                          viewMode === "list" ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                        }`}
                        title={t("view.listLabel")}
                      >
                        <List className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode("calendar")}
                        className={`size-7 flex items-center justify-center rounded-full transition-colors ${
                          viewMode === "calendar" ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                        }`}
                        title={t("view.calendarLabel")}
                      >
                        <CalendarDays className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode("map")}
                        className={`size-7 flex items-center justify-center rounded-full transition-colors ${
                          viewMode === "map" ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                        }`}
                        title={t("view.mapLabel")}
                      >
                        <MapPin className="size-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const id = createEmptyFolder(String(folder.id))
                        toast.success(t("detail.subfolderCreated"))
                        setTimeout(() => navigateToSubfolder(id), 150)
                      }}
                      className="h-8 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5"
                    >
                      <FolderPlus className="size-3.5" />
                      <span className="hidden lg:inline">{t("detail.subfolder")}</span>
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
                          {t("bulk.selected", { n: localizeNumber(selected.size, lang) })}
                        </span>
                        <span className="text-white/30">·</span>
                        <button
                          onClick={() => {
                            const ids = Array.from(selected)
                            for (const id of ids) toggleFileFavorite(String(folder.id), id)
                            toast.success(t("toast.bulkFavorited", { n: localizeNumber(ids.length, lang) }))
                          }}
                          className="h-7 px-2.5 rounded-full text-[12px] text-white/80 hover:text-white hover:bg-white/[0.08] flex items-center gap-1"
                        >
                          <Star className="size-3.5" />
                          {t("bulk.favorite")}
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
                          {t("bulk.rename")}
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
                          {t("bulk.edit")}
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
                            {t("bulk.compare")}
                          </button>
                        )}
                        <MoveToPopover
                          excludeIds={[String(folder.id)]}
                          onSelect={(destId) => {
                            if (!destId) return
                            bulkMoveFiles(String(folder.id), Array.from(selected), destId)
                            toast.success(t("toast.bulkMoved", { n: localizeNumber(selected.size, lang) }))
                            setSelected(new Set())
                          }}
                          trigger={
                            <button className="h-7 px-2.5 rounded-full text-[12px] text-white/80 hover:text-white hover:bg-white/[0.08] flex items-center gap-1">
                              <ArrowRightLeft className="size-3.5" />
                              {t("bulk.move")}
                            </button>
                          }
                        />
                        <button
                          onClick={() => {
                            bulkDeleteFiles(String(folder.id), Array.from(selected))
                            toast.success(t("toast.bulkDeleted", { n: localizeNumber(selected.size, lang) }))
                            setSelected(new Set())
                          }}
                          className="h-7 px-2.5 rounded-full text-[12px] text-white/80 hover:text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                        >
                          <Trash2 className="size-3.5" />
                          {t("bulk.delete")}
                        </button>
                        <button
                          onClick={() => setSelected(new Set())}
                          className="h-7 px-2.5 rounded-full text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06] ms-auto"
                        >
                          {t("bulk.clear")}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Subfolders */}
                  {filteredSubfolders.length > 0 && (
                    <div className="px-5 sm:px-6 pb-4">
                      <div className="text-[11px] uppercase tracking-wider text-white/40 mb-3">
                        {t("detail.subfoldersCount", { count: localizeNumber(filteredSubfolders.length, lang) })}
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
                                  toast.success(t("toast.movedToTrashShort"))
                                }}
                                onCancel={() => deleteFolder(String(sub.id))}
                                onRename={(newTitle) => renameFolder(String(sub.id), newTitle)}
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
                      <span>{t("detail.filesCount", { count: localizeNumber(filteredFiles.length, lang) })}</span>
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
                          {filteredFiles.every((f) => selected.has(f.id))
                            ? t("folder.deselectAll")
                            : t("folder.selectAll")}
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
                            ? t("detail.noFilesMatch")
                            : t("detail.noFilesYet")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {groupedFiles.map((group) => (
                          <div key={`${groupBy}-${group.key}`}>
                            {groupBy !== "none" && (
                              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
                                <span>{group.key}</span>
                                <span className="text-white/30">{localizeNumber(group.items.length, lang)}</span>
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
                                          title={t("action.favorite")}
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
                                              toast.success(t(isCover ? "detail.coverCleared" : "detail.setAsCover"))
                                            }}
                                            className={`size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm ${
                                              isCover ? "ring-1 ring-white" : ""
                                            }`}
                                            title={t("detail.setAsCover")}
                                          >
                                            <ImagePlus className="size-3" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            togglePinFile(String(folder.id), file.id)
                                            toast.success(t(file.pinned ? "action.unpin" : "action.pinToTop"))
                                          }}
                                          className={`size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm ${
                                            file.pinned ? "text-sky-300" : "text-white/70 hover:text-sky-200"
                                          }`}
                                          title={t("action.pinFile")}
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
                                            title={t("action.findSimilar")}
                                          >
                                            <SearchIcon className="size-3" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (file.type !== "image") {
                                              toast.message(t("toast.aiOnlyImages"))
                                              return
                                            }
                                            const tid = toast.loading(t("toast.taggingShort"))
                                            void Promise.allSettled([
                                              library.ai.autoTag(file.id),
                                              library.ai.ocr(file.id),
                                            ]).then(([tagsRes, ocrRes]) => {
                                              toast.dismiss(tid)
                                              if (tagsRes.status === "fulfilled") {
                                                setFileAiTags(
                                                  String(folder.id),
                                                  file.id,
                                                  tagsRes.value.tags,
                                                )
                                                toast.success(
                                                  t("toast.aiTaggedN", {
                                                    n: localizeNumber(
                                                      tagsRes.value.tags.length,
                                                      lang,
                                                    ),
                                                  }),
                                                )
                                              } else {
                                                toast.error(
                                                  (tagsRes.reason as Error)?.message ??
                                                    t("toast.aiNoKey"),
                                                )
                                              }
                                              if (ocrRes.status === "fulfilled") {
                                                setFileOcr(
                                                  String(folder.id),
                                                  file.id,
                                                  ocrRes.value.text,
                                                )
                                              }
                                            })
                                          }}
                                          className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-violet-200 backdrop-blur-sm"
                                          title={t("action.aiTag")}
                                        >
                                          <Sparkles className="size-3" />
                                        </button>
                                        <MoveToPopover
                                          excludeIds={[String(folder.id)]}
                                          onSelect={(destId) => {
                                            if (!destId) return
                                            moveFile(String(folder.id), file.id, destId)
                                            toast.success(t("action.moved"))
                                          }}
                                          trigger={
                                            <button
                                              onClick={(e) => e.stopPropagation()}
                                              className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm"
                                              title={t("action.move")}
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
                                          title={t("action.edit")}
                                        >
                                          <Pencil className="size-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDownload(file)
                                          }}
                                          className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm"
                                          title={t("action.download")}
                                        >
                                          <Download className="size-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            deleteFile(String(folder.id), file.id)
                                            toast.success(t("toast.fileRemoved"))
                                          }}
                                          className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-500/40 text-white/70 hover:text-white backdrop-blur-sm"
                                          title={t("action.delete")}
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
                                            toast.success(t("toast.fileUpdated"))
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
                                        {t(`fileFilter.${file.type}` as TranslationKey)}
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
                    <h3 className="text-base font-semibold text-white mb-1">{t("confirm.deleteFolder")}</h3>
                    <p className="text-[13px] text-white/50">
                      {t("confirm.deleteFolderDesc", {
                        title: localizeTitle(folder, t),
                        count: localizeNumber(itemCount, lang),
                      })}
                    </p>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setConfirmDeleteFolder(false)}
                        className="px-3 py-1.5 rounded-full text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06]"
                      >
                        {t("action.cancel")}
                      </button>
                      <button
                        onClick={handleDeleteFolder}
                        className="px-3 py-1.5 rounded-full text-[13px] font-medium text-white"
                        style={{ backgroundColor: "oklch(0.5801 0.227 25.12)" }}
                      >
                        {t("action.moveToTrash")}
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
  const { t } = useT()
  return (
    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full bg-[#1a1a1a] border border-white/[0.1] rounded-lg p-2 space-y-1.5">
        <input
          value={nameDraft}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-white/20"
          placeholder={t("detail.fileNamePlaceholder")}
          autoFocus
        />
        <input
          value={descDraft}
          onChange={(e) => onDescChange(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white/80 focus:outline-none focus:border-white/20"
          placeholder={t("detail.descPlaceholder")}
        />
        <div className="flex gap-1 justify-end">
          <button onClick={onCancel} className="px-2 py-0.5 text-[11px] text-white/50 hover:text-white">
            {t("action.cancel")}
          </button>
          <button onClick={onSave} className="px-2 py-0.5 text-[11px] font-medium text-black bg-white rounded">
            {t("action.save")}
          </button>
        </div>
      </div>
    </div>
  )
}
