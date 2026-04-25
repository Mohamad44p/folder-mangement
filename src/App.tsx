import { useState, useEffect, useCallback } from "react"
import { ProjectFolder } from "@/components/project-folder"
import { Toaster } from "sonner"
import { FullpageLoader } from "@/components/fullpage-loader"
import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { useSettings } from "@/contexts/settings-context"
import { useDraggable, useDropTarget } from "@/contexts/dnd-context"
import { motion } from "framer-motion"
import { NewProjectSlot } from "@/components/new-project-slot"
import { FolderToolbar } from "@/components/folder-toolbar"
import { FolderDetailDialog } from "@/components/folder-detail-dialog"
import { GlobalSearchPalette } from "@/components/global-search-palette"
import { FolderSidebar } from "@/components/folder-sidebar"
import { ImageLightbox } from "@/components/image-lightbox"
import { TrashView } from "@/components/trash-view"
import { StatsFooter } from "@/components/stats-footer"
import { FolderTemplatePicker } from "@/components/folder-template-picker"
import { BulkRenameModal } from "@/components/bulk-rename-modal"
import { BulkEditModal } from "@/components/bulk-edit-modal"
import { DuplicateFinderModal } from "@/components/duplicate-finder-modal"
import { ShareFolderModal } from "@/components/share-folder-modal"
import { SmartFolderEditor } from "@/components/smart-folder-editor"
import { SmartFolderView } from "@/components/smart-folder-view"
import { SlideshowMode } from "@/components/slideshow-mode"
import { CompareMode } from "@/components/compare-mode"
import { WorkspacesModal } from "@/components/workspaces-modal"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import { CrossFolderRenameModal } from "@/components/cross-folder-rename-modal"
import { ActivityHeatmapModal } from "@/components/activity-heatmap-modal"
import { ExportModal, ImportModal } from "@/components/import-export-modal"
import { ImageSearchModal } from "@/components/image-search-modal"
import { OnboardingTour } from "@/components/onboarding-tour"
import { FolderContextMenu } from "@/components/folder-context-menu"
import { LibraryPicker } from "@/components/library-picker"
import { VirtualFolderGrid } from "@/components/virtual-folder-grid"
import { UpdateToast } from "@/components/update-toast"
import { toast } from "sonner"
import type { Project } from "@/lib/data"

const VIRTUALIZE_THRESHOLD = 100

function CardDndWrapper({
  project,
  children,
}: {
  project: Project
  children: React.ReactNode
}) {
  const { moveFile, moveFolder, uploadFiles } = useFolders()
  const { t } = useT()
  const id = String(project.id)
  const drag = useDraggable({ kind: "folder", folderId: id, folderTitle: project.title })
  const drop = useDropTarget({
    id: `card-${id}`,
    accept: ["file", "folder", "os-files"],
    onDropItem: (item) => {
      if (item.kind === "file") {
        moveFile(item.folderId, item.fileId, id)
        toast.success("File moved")
      } else if (item.kind === "folder" && item.folderId !== id) {
        moveFolder(item.folderId, id)
        toast.success("Folder nested")
      }
    },
    onDropFiles: (files) => {
      uploadFiles(id, files)
      toast.success(
        files.length === 1 ? `Uploading ${files[0].name}` : `Uploading ${files.length} files`,
      )
    },
    canDrop: (item) => (item.kind === "folder" ? item.folderId !== id : true),
  })

  return (
    <div
      {...drop.dropProps}
      className={`relative rounded-2xl ${drop.isOver ? "accent-drop-ring" : ""}`}
    >
      <div {...drag.dragProps}>{children}</div>
      {drop.isOver && (
        <div className="absolute inset-0 rounded-2xl accent-drop-fill pointer-events-none flex items-center justify-center z-10">
          <div className="px-3 py-1.5 rounded-full accent-bg text-black text-[12px] font-medium">
            {t("dnd.dropToAdd")}
          </div>
        </div>
      )}
    </div>
  )
}

export function App() {
  const {
    createFolder,
    deleteFolder,
    renameFolder,
    getDisplayFolders,
    openFolder,
    searchQuery,
    selectedTags,
    filterKind,
  } = useFolders()
  const { t } = useT()
  const { theme } = useSettings()

  const [libraryReady, setLibraryReady] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (typeof window === "undefined" || !window.api?.app) {
          // Renderer running without electron preload (e.g. plain vite preview).
          // Skip the picker so the existing localStorage-backed UI keeps working.
          if (!cancelled) setLibraryReady(true)
          return
        }
        const has = await window.api.app.hasLibraryPath()
        if (!cancelled) setLibraryReady(has)
      } catch {
        if (!cancelled) setLibraryReady(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const allProjects = getDisplayFolders()

  const handleCreateProject = useCallback(() => {
    createFolder({
      title: t("folder.untitled"),
      fileCount: 0,
      images: [],
      files: [],
      createdAt: new Date().toISOString(),
      isEmpty: true,
    })
  }, [createFolder, t])

  const handleRemoveFolder = useCallback(
    (projectId: string) => {
      deleteFolder(projectId)
    },
    [deleteFolder],
  )

  const handleFolderClick = useCallback(
    (projectId: string) => {
      openFolder(projectId)
    },
    [openFolder],
  )

  const handleRenameProject = useCallback(
    (projectId: string, newTitle: string) => {
      renameFolder(projectId, newTitle)
    },
    [renameFolder],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  if (libraryReady === null) {
    return <FullpageLoader duration={400} />
  }

  if (libraryReady === false) {
    return <LibraryPicker onConfirmed={() => setLibraryReady(true)} />
  }

  if (isLoading) {
    return <FullpageLoader duration={2000} />
  }

  const hasActiveFilters = !!searchQuery || selectedTags.length > 0 || filterKind !== "all"

  // Map our 3-state theme to sonner's 3-state ("system" === our "auto").
  const toasterTheme: "dark" | "light" | "system" =
    theme === "auto" ? "system" : theme
  // Resolve the visible theme for inline color overrides (matchMedia for auto).
  const resolvedTheme: "dark" | "light" =
    theme === "auto"
      ? typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme

  return (
    <div className="min-h-screen bg-[#191919] flex">
      <Toaster
        position="bottom-center"
        theme={toasterTheme}
        toastOptions={{
          style: {
            background: resolvedTheme === "light" ? "#ffffff" : "#1A1A1A",
            border: resolvedTheme === "light" ? "1px solid rgba(0, 0, 0, 0.1)" : "1px solid rgba(255, 255, 255, 0.08)",
            color: resolvedTheme === "light" ? "#18181b" : "#fff",
            borderRadius: "12px",
          },
        }}
      />
      <UpdateToast />

      <FolderSidebar />

      <div
        className="flex-1 transition-all duration-700 ease-out min-w-0"
        style={{
          opacity: showContent ? 1 : 0,
          transform: showContent ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
        }}
      >
        <main className="flex-1 min-h-screen p-4 pt-12 sm:p-6 sm:pt-14 md:p-8 md:pt-16">
          <div className="mx-auto w-full max-w-[288px] sm:max-w-[600px] lg:max-w-[912px]">
            <div className="flex items-center justify-between h-12 mb-6">
              <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">{t("app.title")}</h1>
            </div>

            <FolderToolbar />

            {allProjects.length === 0 && hasActiveFilters ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] py-16 text-center">
                <p className="text-sm text-white/50">
                  {searchQuery
                    ? t("empty.search", { q: searchQuery })
                    : t("empty.folders")}
                </p>
                <p className="text-[12px] text-white/30 mt-1">{t("empty.searchDesc")}</p>
              </div>
            ) : allProjects.length > VIRTUALIZE_THRESHOLD ? (
              <>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-4 sm:mb-6">
                  <NewProjectSlot onClick={handleCreateProject} />
                </div>
                <VirtualFolderGrid
                  projects={allProjects}
                  onRemove={handleRemoveFolder}
                  onClick={handleFolderClick}
                  onRename={handleRenameProject}
                />
              </>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.05, ease: [0.32, 0.72, 0, 1] }}
                >
                  <NewProjectSlot onClick={handleCreateProject} />
                </motion.div>
                {allProjects.map((project, idx) => {
                  return (
                    <motion.div
                      key={project.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min(idx * 0.03, 0.3),
                        ease: [0.32, 0.72, 0, 1],
                        layout: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
                      }}
                    >
                      <FolderContextMenu folderId={String(project.id)}>
                        <CardDndWrapper project={project}>
                          <ProjectFolder
                            project={project}
                            index={idx}
                            onRemove={() => handleRemoveFolder(String(project.id))}
                            onCancel={() => handleRemoveFolder(String(project.id))}
                            onClick={() => handleFolderClick(String(project.id))}
                            onRename={(newTitle) => handleRenameProject(String(project.id), newTitle)}
                          />
                        </CardDndWrapper>
                      </FolderContextMenu>
                    </motion.div>
                  )
                })}
              </div>
            )}

            <StatsFooter />
          </div>
        </main>
      </div>

      <FolderDetailDialog />
      <SmartFolderView />
      <GlobalSearchPalette />
      <ImageLightbox />
      <TrashView />
      <FolderTemplatePicker />
      <BulkRenameModal />
      <BulkEditModal />
      <DuplicateFinderModal />
      <ShareFolderModal />
      <SmartFolderEditor />
      <SlideshowMode />
      <CompareMode />
      <WorkspacesModal />
      <ShortcutsModal />
      <CrossFolderRenameModal />
      <ActivityHeatmapModal />
      <ExportModal />
      <ImportModal />
      <ImageSearchModal />
      <OnboardingTour />
    </div>
  )
}
