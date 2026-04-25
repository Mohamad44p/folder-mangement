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
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Plus,
  Bookmark,
  Settings,
  Search,
  Pencil,
  X,
  RotateCcw,
  Wrench,
  Activity,
  Keyboard,
  Globe,
  Download,
  Upload,
  LayoutTemplate,
  CirclePlus,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import * as Popover from "@radix-ui/react-popover"
import { describeSmartFolder } from "@/lib/smart-folder-engine"
import { StorageChart } from "./storage-chart"
import { SettingsPopover } from "./settings-popover"
import { WorkspaceSwitcher } from "./workspace-switcher"
import { toast } from "sonner"
import { useT } from "@/contexts/i18n-context"
import { localizeTitle, localizeNumber } from "@/lib/localize"
import type { TranslationKey } from "@/lib/i18n-dict"

const SMART_FOLDER_NAME_KEYS: Record<string, TranslationKey> = {
  "All favorites": "smart.allFavorites",
  "Uploaded this week": "smart.uploadedThisWeek",
  "Large files": "smart.largeFiles",
}

function SectionHeader({
  icon: Icon,
  iconClassName,
  label,
  count,
  action,
}: {
  icon: LucideIcon
  iconClassName?: string
  label: string
  count?: number
  action?: React.ReactNode
}) {
  const { lang } = useT()
  return (
    <div className="flex items-center gap-1.5 mb-2 px-2 h-5">
      <Icon className={`size-3 ${iconClassName ?? "text-white/40"}`} />
      <span className="text-[10px] uppercase tracking-[0.08em] text-white/40 font-semibold">
        {label}
      </span>
      {typeof count === "number" && (
        <span className="text-[10px] text-white/30 font-medium tabular-nums">{localizeNumber(count, lang)}</span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

function NavItem({
  icon,
  label,
  active,
  onClick,
  trailing,
  title,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
  trailing?: React.ReactNode
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`group w-full flex items-center gap-2.5 px-2 h-8 rounded-md transition-colors text-left ${
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/70 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <span
        className={`shrink-0 flex items-center justify-center size-4 ${
          active ? "text-white" : "text-white/50 group-hover:text-white/80"
        }`}
      >
        {icon}
      </span>
      <span className="text-[13px] font-medium truncate flex-1">{label}</span>
      {trailing}
    </button>
  )
}

function CountBadge({ value }: { value: number }) {
  const { lang } = useT()
  return (
    <span className="text-[10px] font-medium px-1.5 h-4 inline-flex items-center justify-center rounded-full bg-white/[0.06] text-white/50 tabular-nums">
      {localizeNumber(value, lang)}
    </span>
  )
}

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
  const { t } = useT()
  const id = String(node.folder.id)
  const localizedFolderTitle = localizeTitle(node.folder, t)
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
        className={`group flex items-center gap-1 pr-2 h-7 rounded-md cursor-pointer transition-colors ${
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
        <span className="text-[12.5px] truncate flex-1">{localizedFolderTitle}</span>
        {node.folder.favorite && (
          <Star className="size-3 text-yellow-300/80 fill-yellow-300/80 shrink-0" />
        )}
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

function ToolsMenu() {
  const {
    setDuplicateFinderOpen,
    setHeatmapModalOpen,
    setCrossFolderRenameOpen,
    setExportModalOpen,
    setImportModalOpen,
    setShortcutsModalOpen,
  } = useFolders()
  const { t } = useT()
  const [open, setOpen] = useState(false)

  const items: { icon: LucideIcon; label: string; onClick: () => void }[] = [
    {
      icon: LayoutTemplate,
      label: t("sidebar.duplicates"),
      onClick: () => setDuplicateFinderOpen(true),
    },
    {
      icon: Activity,
      label: t("sidebar.heatmap"),
      onClick: () => setHeatmapModalOpen(true),
    },
    {
      icon: Globe,
      label: t("sidebar.libraryRename"),
      onClick: () => setCrossFolderRenameOpen(true),
    },
    {
      icon: Download,
      label: t("sidebar.export"),
      onClick: () => setExportModalOpen(true),
    },
    {
      icon: Upload,
      label: t("sidebar.import"),
      onClick: () => setImportModalOpen(true),
    },
    {
      icon: Keyboard,
      label: t("sidebar.shortcuts"),
      onClick: () => setShortcutsModalOpen(true),
    },
  ]

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="w-full flex items-center gap-2.5 px-2 h-8 rounded-md text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors"
          aria-label={t("sidebar.tools")}
        >
          <Wrench className="size-4 text-white/50" />
          <span className="text-[13px] font-medium flex-1 text-left">{t("sidebar.tools")}</span>
          <ChevronRight className="size-3.5 text-white/30" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-[300] w-[228px] rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-1.5"
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className="w-full flex items-center gap-2.5 px-2 h-8 rounded-md text-white/75 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <item.icon className="size-3.5 text-white/50" />
              <span className="text-[13px] font-medium flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
        aria-label={t("sidebar.openSidebar")}
        title={t("sidebar.openSidebar")}
      >
        <PanelLeftOpen className="size-4" />
      </button>
    )
  }

  return (
    <aside className="hidden lg:flex flex-col w-[264px] shrink-0 sticky top-0 h-screen bg-[#141414] border-r border-white/[0.06] overflow-hidden">
      {/* Header: workspace + utility */}
      <div className="flex items-center gap-1 px-2 pt-2.5 pb-2">
        <div className="flex-1 min-w-0">
          <WorkspaceSwitcher />
        </div>
        <SettingsPopover
          trigger={
            <button
              className="size-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Settings"
              title="Theme & density"
            >
              <Settings className="size-3.5" />
            </button>
          }
        />
        <button
          onClick={() => setSidebarOpen(false)}
          className="size-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Close sidebar"
          title="Close sidebar"
        >
          <PanelLeftClose className="size-3.5" />
        </button>
      </div>

      {/* Primary CTA: New folder + Search */}
      <div className="px-3 pb-3 flex items-center gap-1.5">
        <button
          onClick={() => setTemplatePickerOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-white/90 active:scale-[0.98] transition-all shadow-sm"
        >
          <CirclePlus className="size-4" />
          <span>{t("sidebar.newFromTemplate")}</span>
        </button>
        <button
          onClick={() => setPaletteOpen(true)}
          className="size-9 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 hover:text-white transition-colors"
          aria-label={t("sidebar.search")}
          title={`${t("sidebar.search")} (⌘K)`}
        >
          <Search className="size-4" />
        </button>
      </div>

      {/* Scrollable middle */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-1 pb-3 scrollbar-thin">
        <div className="space-y-6">
          {/* Smart folders */}
          <div>
            <SectionHeader
              icon={Sparkles}
              iconClassName="text-violet-300/80"
              label={t("sidebar.smart")}
              action={
                <button
                  onClick={() => setSmartFolderEditor({ mode: "new" })}
                  className="size-4 flex items-center justify-center rounded hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors"
                  title="New smart folder"
                  aria-label="New smart folder"
                >
                  <Plus className="size-3" />
                </button>
              }
            />
            {smartFolders.length === 0 ? (
              <button
                onClick={() => setSmartFolderEditor({ mode: "new" })}
                className="w-full text-left px-2 py-1.5 rounded-md text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-colors"
              >
                + Create your first smart folder
              </button>
            ) : (
              <div className="space-y-px">
                {smartFolders.map((s) => {
                  const smartKey = SMART_FOLDER_NAME_KEYS[s.name]
                  const smartLabel = smartKey ? t(smartKey) : s.name
                  return (
                  <div key={s.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => openSmartFolder(s.id)}
                      className="flex-1 flex items-center gap-2.5 px-2 h-8 rounded-md text-white/70 hover:bg-white/[0.04] hover:text-white text-left transition-colors"
                      title={describeSmartFolder(s)}
                    >
                      <span className="text-sm shrink-0 w-4 text-center">{s.icon}</span>
                      <span className="text-[13px] font-medium truncate flex-1">{smartLabel}</span>
                    </button>
                    <button
                      onClick={() => setSmartFolderEditor({ mode: "edit", id: s.id })}
                      className="opacity-0 group-hover:opacity-100 size-6 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                      title="Edit"
                      aria-label="Edit smart folder"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      onClick={() => {
                        deleteSmartFolder(s.id)
                        toast.success("Smart folder deleted")
                      }}
                      className="opacity-0 group-hover:opacity-100 size-6 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      aria-label="Delete smart folder"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Saved searches */}
          {savedSearches.length > 0 && (
            <div>
              <SectionHeader
                icon={Bookmark}
                label={t("sidebar.savedSearches")}
                count={savedSearches.length}
              />
              <div className="space-y-px">
                {savedSearches.map((s) => (
                  <div key={s.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSearchQuery(s.query)
                        setPaletteOpen(true)
                      }}
                      className="flex-1 flex items-center gap-2.5 px-2 h-8 rounded-md text-white/70 hover:bg-white/[0.04] hover:text-white text-left transition-colors"
                    >
                      <Bookmark className="size-3.5 text-white/50 shrink-0" />
                      <span className="text-[13px] font-medium truncate flex-1">{s.name}</span>
                    </button>
                    <button
                      onClick={() => {
                        deleteSavedSearch(s.id)
                        toast.success("Removed")
                      }}
                      className="opacity-0 group-hover:opacity-100 size-6 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      aria-label="Remove saved search"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favorites */}
          {favs.length > 0 && (
            <div>
              <SectionHeader
                icon={Star}
                iconClassName="text-yellow-300/80 fill-yellow-300/80"
                label={t("sidebar.favorites")}
                count={favs.length}
              />
              <div className="space-y-px">
                {favs.map((f) => (
                  <NavItem
                    key={f.id}
                    icon={<span className="text-sm">{f.icon ?? "📁"}</span>}
                    label={localizeTitle(f, t)}
                    active={openFolderId === String(f.id)}
                    onClick={() => openFolder(String(f.id))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recents */}
          {recents.length > 0 && (
            <div>
              <SectionHeader
                icon={Clock}
                label={t("sidebar.recent")}
                count={recents.length}
              />
              <div className="space-y-px">
                {recents.slice(0, 5).map((f) => (
                  <NavItem
                    key={f.id}
                    icon={<span className="text-sm">{f.icon ?? "📁"}</span>}
                    label={localizeTitle(f, t)}
                    active={openFolderId === String(f.id)}
                    onClick={() => openFolder(String(f.id))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All folders tree */}
          <div>
            <SectionHeader
              icon={Folder}
              label={t("sidebar.allFolders")}
              count={stats.totalFolders + stats.totalSubfolders}
            />
            <div className="space-y-px">
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

          {/* Reopen last closed */}
          {recentlyClosed.length > 0 && (
            <button
              onClick={reopenLastClosed}
              className="w-full flex items-center gap-2.5 px-2 h-8 rounded-md text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors"
            >
              <RotateCcw className="size-4 text-white/50 shrink-0" />
              <span className="text-[13px] font-medium flex-1 text-left truncate">
                {t("sidebar.reopen", {
                  name: (() => {
                    const f = getFolder(recentlyClosed[0])
                    return f ? localizeTitle(f, t) : "..."
                  })(),
                })}
              </span>
              <kbd className="text-[10px] px-1.5 h-4 inline-flex items-center rounded bg-white/[0.06] text-white/40 font-mono">
                ⌘⇧T
              </kbd>
            </button>
          )}
        </div>
      </div>

      {/* Footer: tools, trash, storage */}
      <div className="border-t border-white/[0.06] px-2 pt-2 pb-2.5 space-y-2">
        <div className="space-y-px">
          <ToolsMenu />
          <NavItem
            icon={<Trash2 className="size-4" />}
            label={t("sidebar.trash")}
            onClick={() => setTrashOpen(true)}
            trailing={stats.trashCount > 0 ? <CountBadge value={stats.trashCount} /> : undefined}
          />
        </div>
        <div className="px-1 pt-1.5 border-t border-white/[0.04]">
          <StorageChart compact />
        </div>
      </div>
    </aside>
  )
}
