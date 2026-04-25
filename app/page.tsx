"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import confetti from "canvas-confetti"
import { ProjectFolder } from "@/components/project-folder"
import { Toaster } from "sonner"
import { FullpageLoader } from "@/components/fullpage-loader"
import { useGeneration } from "@/contexts/generation-context"
import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
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
import { toast } from "sonner"
import type { Project } from "@/lib/data"

const PROJECT_CONFIGS = [
  {
    title: "How to Design a Fashion Brand",
    clipCount: 6,
    images: [
      "/newbrand-portrait-1.png",
      "/newbrand-portrait-2.png",
      "/newbrand-portrait-3.png",
      "/newbrand-portrait-4.png",
      "/newbrand-portrait-5.png",
    ],
  },
  {
    title: "Starting a Modern Company in New York",
    clipCount: 8,
    images: [
      "/brand-portrait-1.png",
      "/brand-portrait-2.png",
      "/brand-portrait-3.png",
      "/brand-portrait-4.png",
      "/brand-portrait-5.png",
    ],
  },
]

function CardDndWrapper({
  project,
  children,
}: {
  project: Project
  children: React.ReactNode
}) {
  const { moveFile, moveFolder, uploadFiles } = useFolders()
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
      className={`relative rounded-2xl ${drop.isOver ? "ring-2 ring-sky-400/60 ring-offset-2 ring-offset-[#191919]" : ""}`}
    >
      <div {...drag.dragProps}>{children}</div>
      {drop.isOver && (
        <div className="absolute inset-0 rounded-2xl bg-sky-400/10 pointer-events-none flex items-center justify-center z-10">
          <div className="px-3 py-1.5 rounded-full bg-sky-500 text-white text-[12px] font-medium">
            Drop to add
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClipsPage() {
  const { startGeneration } = useGeneration()
  const {
    createFolder,
    deleteFolder,
    renameFolder,
    setFolderGenerating,
    getDisplayFolders,
    openFolder,
    searchQuery,
    selectedTags,
    filterKind,
  } = useFolders()
  const { t } = useT()

  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const nextProjectIndexRef = useRef(0)
  const mainRef = useRef<HTMLElement>(null)

  const allProjects = getDisplayFolders()

  const handleCreateProject = useCallback(() => {
    const configIndex = nextProjectIndexRef.current
    const config = PROJECT_CONFIGS[configIndex]
    nextProjectIndexRef.current = (configIndex + 1) % PROJECT_CONFIGS.length

    const id = createFolder({
      title: config.title,
      clipCount: config.clipCount,
      images: config.images,
      isGenerating: true,
      progress: 0,
      createdAt: new Date().toISOString(),
      isEmpty: false,
    })

    startGeneration(id, () => {
      setFolderGenerating(id, false)
    })
  }, [createFolder, startGeneration, setFolderGenerating])

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

  if (isLoading) {
    return <FullpageLoader duration={2000} />
  }

  const hasActiveFilters = !!searchQuery || selectedTags.length > 0 || filterKind !== "all"

  return (
    <div className="min-h-screen bg-[#191919] flex">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#1A1A1A",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#fff",
            borderRadius: "12px",
          },
        }}
      />

      <FolderSidebar />

      <div
        className="flex-1 transition-all duration-700 ease-out min-w-0"
        style={{
          opacity: showContent ? 1 : 0,
          transform: showContent ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
        }}
      >
        <main ref={mainRef} className="flex-1 min-h-screen p-4 pt-12 sm:p-6 sm:pt-14 md:p-8 md:pt-16">
          <div className="mx-auto w-full max-w-[288px] sm:max-w-[600px] lg:max-w-[912px]">
            <div className="flex items-center justify-between h-12 mb-6">
              <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">{t("app.title")}</h1>
              <button
                className="text-sm font-medium text-black rounded-full hover:bg-white/90 transition-colors py-1.5 bg-card-foreground px-3 whitespace-nowrap"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = (rect.left + rect.width / 2) / window.innerWidth
                  const y = (rect.top + rect.height / 2) / window.innerHeight

                  const colors = ["#ffffff", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3"]

                  confetti({
                    particleCount: 40,
                    spread: 50,
                    origin: { x, y },
                    colors,
                    startVelocity: 20,
                    gravity: 0.6,
                    scalar: 0.8,
                    drift: 0,
                    ticks: 150,
                    shapes: ["circle"],
                    disableForReducedMotion: true,
                  })

                  setTimeout(() => {
                    confetti({
                      particleCount: 25,
                      spread: 70,
                      origin: { x, y: y - 0.05 },
                      colors,
                      startVelocity: 15,
                      gravity: 0.5,
                      scalar: 0.6,
                      drift: 0,
                      ticks: 120,
                      shapes: ["circle"],
                      disableForReducedMotion: true,
                    })
                  }, 100)
                }}
              >
                {t("app.startTrial")}
              </button>
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
