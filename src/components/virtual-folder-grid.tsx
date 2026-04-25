import { useEffect, useMemo, useRef, useState } from "react"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { ProjectFolder } from "@/components/project-folder"
import { FolderContextMenu } from "@/components/folder-context-menu"
import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { useDraggable, useDropTarget } from "@/contexts/dnd-context"
import { toast } from "sonner"
import type { Project } from "@/lib/data"

interface Props {
  projects: Project[]
  estimatedRowHeight?: number
  onRemove: (projectId: string) => void
  onClick: (projectId: string) => void
  onRename: (projectId: string, newTitle: string) => void
}

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
    id: `vcard-${id}`,
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

function useColCount(): number {
  const [cols, setCols] = useState(() => {
    if (typeof window === "undefined") return 3
    if (window.innerWidth >= 1024) return 3
    if (window.innerWidth >= 640) return 2
    return 1
  })
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setCols(3)
      else if (window.innerWidth >= 640) setCols(2)
      else setCols(1)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return cols
}

/**
 * Renders the folder grid with row-based windowing. Activates for libraries
 * with hundreds of folders where the standard motion-animated grid starts to
 * stutter. Animations are dropped — only visible rows are mounted.
 */
export function VirtualFolderGrid({
  projects,
  estimatedRowHeight = 280,
  onRemove,
  onClick,
  onRename,
}: Props) {
  const cols = useColCount()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  const rows = useMemo(() => {
    const out: Project[][] = []
    for (let i = 0; i < projects.length; i += cols) {
      out.push(projects.slice(i, i + cols))
    }
    return out
  }, [projects, cols])

  useEffect(() => {
    if (!containerRef.current) return
    setScrollMargin(containerRef.current.offsetTop)
  }, [])

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => estimatedRowHeight,
    overscan: 4,
    scrollMargin,
  })

  return (
    <div ref={containerRef} className="w-full">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index]
          if (!rowItems) return null
          return (
            <div
              key={virtualRow.key}
              data-row={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 right-0 grid gap-4 sm:gap-6"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                paddingBottom: 24,
              }}
            >
              {rowItems.map((project, idx) => {
                const id = String(project.id)
                return (
                  <FolderContextMenu key={id} folderId={id}>
                    <CardDndWrapper project={project}>
                      <ProjectFolder
                        project={project}
                        index={virtualRow.index * cols + idx}
                        onRemove={() => onRemove(id)}
                        onCancel={() => onRemove(id)}
                        onClick={() => onClick(id)}
                        onRename={(newTitle) => onRename(id, newTitle)}
                      />
                    </CardDndWrapper>
                  </FolderContextMenu>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
