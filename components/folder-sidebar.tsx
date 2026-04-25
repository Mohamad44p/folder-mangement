"use client"

import { useFolders, type FolderTreeNode } from "@/contexts/folder-context"
import { useDropTarget } from "@/contexts/dnd-context"
import {
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  Trash2,
  Folder,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  FolderPlus,
  Hash,
  Sparkles,
  Plus,
  Bookmark,
  Settings,
  LayoutTemplate,
  Search,
  Pencil,
  X,
} from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { describeSmartFolder } from "@/lib/smart-folder-engine"
import { StorageChart } from "./storage-chart"
import { SettingsPopover } from "./settings-popover"
import { WorkspaceSwitcher } from "./workspace-switcher"
import { toast } from "sonner"
import { Activity, Keyboard, Globe, Download, Upload, RotateCcw } from "lucide-react"
import { useT } from "@/contexts/i18n-context"

function TreeItem({
  node,
  depth,
  expandedIds,
  toggleExpand,
}: {
  node: FolderTreeNode
  depth: number
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
}) {
  const { openFolder, openFolderId, moveFile, moveFolder } = useFolders()
  const id = String(node.folder.id)
  const isExpanded = expandedIds.has(id)
  const isActive = openFolderId === id
  const hasChildren = node.children.length > 0

  const drop = useDropTarget({
    id: `tree-${id}`,
    accept: ["file", "folder"],
    onDropItem: (item) => {
      if (item.kind === "file") {
        moveFile(item.folderId, item.fileId, id)
        toast.success("File moved")
      } else if (item.kind === "folder" && item.folderId !== id) {
        moveFolder(item.folderId, id)
        toast.success("Folder nested")
      }
    },
    canDrop: (item) => (item.kind === "folder" ? item.folderId !== id : true),
  })

  return (
    <div>
      <div
        {...drop.dropProps}
        className={`group flex items-center gap-1 pr-2 py-1 rounded-md cursor-pointer transition-colors ${
          drop.isOver
            ? "bg-sky-500/15 ring-1 ring-sky-400/40"
            : isActive
              ? "bg-white/[0.08] text-white"
              : "text-white/70 hover:bg-white/[0.04] hover:text-white"
        }`}
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={() => openFolder(id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) toggleExpand(id)
          }}
          className={`size-4 flex items-center justify-center rounded shrink-0 ${
            hasChildren ? "hover:bg-white/[0.1]" : "opacity-0"
          }`}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="size-3 text-white/40" />
            ) : (
              <ChevronRight className="size-3 text-white/40" />
            )
          ) : null}
        </button>
        <span className="text-xs shrink-0 w-4 flex items-center justify-center">
          {node.folder.icon ?? (isExpanded ? "📂" : "📁")}
        </span>
        <span className="text-[12px] truncate flex-1">{node.folder.title}</span>
        {node.folder.favorite && <Star className="size-3 text-yellow-300/80 fill-yellow-300/80 shrink-0" />}
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeItem
                key={child.folder.id}
                node={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FolderSidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    getFolderTree,
    getFavorites,
    getRecents,
    getStats,
    setTrashOpen,
    openFolder,
    openFolderId,
    setTemplatePickerOpen,
    setDuplicateFinderOpen,
    smartFolders,
    openSmartFolder,
    setSmartFolderEditor,
    deleteSmartFolder,
    savedSearches,
    deleteSavedSearch,
    setPaletteOpen,
    setSearchQuery,
    recentlyClosed,
    reopenLastClosed,
    setShortcutsModalOpen,
    setHeatmapModalOpen,
    setExportModalOpen,
    setImportModalOpen,
    setCrossFolderRenameOpen,
    getFolder,
  } = useFolders()
  const { t } = useT()

  const tree = getFolderTree()
  const favs = getFavorites()
  const recents = getRecents()
  const stats = getStats()

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const node of tree) s.add(String(node.folder.id))
    return s
  })

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 size-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] backdrop-blur-md transition-colors"
        aria-label="Open sidebar"
        title="Open sidebar"
      >
        <PanelLeftOpen className="size-4" />
      </button>
    )
  }

  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 sticky top-0 h-screen bg-[#141414] border-r border-white/[0.06] overflow-hidden">
      {/* Header with workspace switcher */}
      <div className="flex items-center justify-between gap-2 px-2 py-2 border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <WorkspaceSwitcher />
        </div>
        <div className="flex items-center gap-0.5">
          <SettingsPopover
            trigger={
              <button
                className="size-7 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label="Settings"
                title="Theme & density"
              >
                <Settings className="size-3.5" />
              </button>
            }
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="size-7 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-3 pt-3 space-y-1.5">
        <button
          onClick={() => setTemplatePickerOpen(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[12px] text-white/80 hover:text-white"
        >
          <FolderPlus className="size-3.5" />
          {t("sidebar.newFromTemplate")}
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-[11px] text-white/60 hover:text-white"
          >
            <Search className="size-3" />
            {t("sidebar.search")}
          </button>
          <button
            onClick={() => setDuplicateFinderOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-[11px] text-white/60 hover:text-white"
          >
            <LayoutTemplate className="size-3" />
            {t("sidebar.duplicates")}
          </button>
          <button
            onClick={() => setHeatmapModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-[11px] text-white/60 hover:text-white"
          >
            <Activity className="size-3" />
            {t("sidebar.heatmap")}
          </button>
          <button
            onClick={() => setCrossFolderRenameOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-[11px] text-white/60 hover:text-white"
          >
            <Globe className="size-3" />
            {t("sidebar.libraryRename")}
          </button>
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-[11px] text-white/60 hover:text-white"
          >
            <Download className="size-3" />
            {t("sidebar.export")}
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-[11px] text-white/60 hover:text-white"
          >
            <Upload className="size-3" />
            {t("sidebar.import")}
          </button>
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="col-span-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-[11px] text-white/60 hover:text-white"
          >
            <Keyboard className="size-3" />
            {t("sidebar.shortcuts")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {/* Smart folders */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Sparkles className="size-3 text-violet-300/80" />
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
              {t("sidebar.smart")}
            </span>
            <button
              onClick={() => setSmartFolderEditor({ mode: "new" })}
              className="ml-auto size-4 flex items-center justify-center rounded hover:bg-white/[0.06] text-white/40 hover:text-white"
              title="New smart folder"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <div className="space-y-0.5">
            {smartFolders.map((s) => (
              <div key={s.id} className="group flex items-center gap-1">
                <button
                  onClick={() => openSmartFolder(s.id)}
                  className="flex-1 flex items-center gap-2 px-2 py-1 rounded-md text-white/70 hover:bg-white/[0.04] hover:text-white text-left"
                  title={describeSmartFolder(s)}
                >
                  <span className="text-xs shrink-0">{s.icon}</span>
                  <span className="text-[12px] truncate flex-1">{s.name}</span>
                </button>
                <button
                  onClick={() => setSmartFolderEditor({ mode: "edit", id: s.id })}
                  className="opacity-0 group-hover:opacity-100 size-5 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.06]"
                  title="Edit"
                >
                  <Pencil className="size-2.5" />
                </button>
                <button
                  onClick={() => {
                    deleteSmartFolder(s.id)
                    toast.success("Smart folder deleted")
                  }}
                  className="opacity-0 group-hover:opacity-100 size-5 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Saved searches */}
        {savedSearches.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <Bookmark className="size-3 text-white/40" />
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                {t("sidebar.savedSearches")}
              </span>
              <span className="text-[10px] text-white/30 ml-auto">{savedSearches.length}</span>
            </div>
            <div className="space-y-0.5">
              {savedSearches.map((s) => (
                <div key={s.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSearchQuery(s.query)
                      setPaletteOpen(true)
                    }}
                    className="flex-1 flex items-center gap-2 px-2 py-1 rounded-md text-white/70 hover:bg-white/[0.04] hover:text-white text-left"
                  >
                    <Bookmark className="size-3 text-white/40 shrink-0" />
                    <span className="text-[12px] truncate flex-1">{s.name}</span>
                  </button>
                  <button
                    onClick={() => {
                      deleteSavedSearch(s.id)
                      toast.success("Removed")
                    }}
                    className="opacity-0 group-hover:opacity-100 size-5 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Favorites */}
        {favs.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <Star className="size-3 text-yellow-300/80 fill-yellow-300/80" />
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{t("sidebar.favorites")}</span>
              <span className="text-[10px] text-white/30 ml-auto">{favs.length}</span>
            </div>
            <div className="space-y-0.5">
              {favs.map((f) => (
                <button
                  key={f.id}
                  onClick={() => openFolder(String(f.id))}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-md transition-colors text-left ${
                    openFolderId === String(f.id)
                      ? "bg-white/[0.08] text-white"
                      : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <span className="text-xs shrink-0">{f.icon ?? "📁"}</span>
                  <span className="text-[12px] truncate flex-1">{f.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recents */}
        {recents.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <Clock className="size-3 text-white/40" />
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{t("sidebar.recent")}</span>
              <span className="text-[10px] text-white/30 ml-auto">{recents.length}</span>
            </div>
            <div className="space-y-0.5">
              {recents.slice(0, 5).map((f) => (
                <button
                  key={f.id}
                  onClick={() => openFolder(String(f.id))}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-md transition-colors text-left ${
                    openFolderId === String(f.id)
                      ? "bg-white/[0.08] text-white"
                      : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <span className="text-xs shrink-0">{f.icon ?? "📁"}</span>
                  <span className="text-[12px] truncate flex-1">{f.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All folders tree */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Folder className="size-3 text-white/40" />
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{t("sidebar.allFolders")}</span>
            <span className="text-[10px] text-white/30 ml-auto">
              {stats.totalFolders + stats.totalSubfolders}
            </span>
          </div>
          <div>
            {tree.map((node) => (
              <TreeItem
                key={node.folder.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
            ))}
          </div>
        </div>

        {/* Recently closed */}
        {recentlyClosed.length > 0 && (
          <div>
            <button
              onClick={reopenLastClosed}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-white/60 hover:bg-white/[0.04] hover:text-white"
            >
              <RotateCcw className="size-3.5" />
              <span className="text-[12px] flex-1 text-start">
                {t("sidebar.reopen", { name: getFolder(recentlyClosed[0])?.title ?? "..." })}
              </span>
              <kbd className="text-[10px] px-1 py-0.5 rounded bg-white/[0.06] text-white/40 font-mono">
                ⌘⇧T
              </kbd>
            </button>
          </div>
        )}

        {/* Trash */}
        <div>
          <button
            onClick={() => setTrashOpen(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-white/60 hover:bg-white/[0.04] hover:text-white"
          >
            <Trash2 className="size-3.5" />
            <span className="text-[12px] flex-1 text-start">{t("sidebar.trash")}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/50">
              {stats.trashCount}
            </span>
          </button>
        </div>
      </div>

      {/* Footer with storage chart */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <StorageChart compact />
      </div>
    </aside>
  )
}
