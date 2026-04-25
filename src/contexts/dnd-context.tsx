"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

export type DragItem =
  | { kind: "file"; folderId: string; fileId: string; fileName: string }
  | { kind: "folder"; folderId: string; folderTitle: string }

interface DndContextType {
  dragging: DragItem | null
  setDragging: (item: DragItem | null) => void
  hoverDropId: string | null
  setHoverDropId: (id: string | null) => void
}

const DndContext = createContext<DndContextType | null>(null)

export function DndProvider({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState<DragItem | null>(null)
  const [hoverDropId, setHoverDropId] = useState<string | null>(null)
  return (
    <DndContext.Provider value={{ dragging, setDragging, hoverDropId, setHoverDropId }}>
      {children}
    </DndContext.Provider>
  )
}

export function useDnd() {
  const ctx = useContext(DndContext)
  if (!ctx) throw new Error("useDnd must be used within a DndProvider")
  return ctx
}

const DRAG_MIME = "application/x-folder-mgr-item"

export function useDraggable(item: DragItem | null) {
  const { setDragging } = useDnd()

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!item) return
      e.stopPropagation()
      e.dataTransfer.effectAllowed = "move"
      try {
        e.dataTransfer.setData(DRAG_MIME, JSON.stringify(item))
        e.dataTransfer.setData("text/plain", item.kind === "file" ? item.fileName : item.folderTitle)
      } catch {}
      setDragging(item)
    },
    [item, setDragging],
  )

  const handleDragEnd = useCallback(() => {
    setDragging(null)
  }, [setDragging])

  return {
    dragProps: {
      draggable: !!item,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  }
}

export interface DropTargetOptions {
  accept: ("file" | "folder" | "os-files")[]
  onDropItem?: (item: DragItem) => void
  onDropFiles?: (files: FileList) => void
  /** Unique ID so we can highlight the right target */
  id?: string
  /** Reject drops by returning false */
  canDrop?: (item: DragItem) => boolean
}

export function useDropTarget(opts: DropTargetOptions) {
  const { dragging, hoverDropId, setHoverDropId } = useDnd()
  const accepts = opts.accept

  const matchesItem =
    dragging &&
    (dragging.kind === "file" ? accepts.includes("file") : accepts.includes("folder")) &&
    (!opts.canDrop || opts.canDrop(dragging))

  const isOver = !!opts.id && hoverDropId === opts.id

  const onDragOver = (e: React.DragEvent) => {
    const hasOSFiles = e.dataTransfer.types.includes("Files")
    if (matchesItem || (accepts.includes("os-files") && hasOSFiles)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      if (opts.id && hoverDropId !== opts.id) setHoverDropId(opts.id)
    }
  }

  const onDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the element entirely
    const related = e.relatedTarget as Node | null
    if (related && (e.currentTarget as Node).contains(related)) return
    if (opts.id && hoverDropId === opts.id) setHoverDropId(null)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (opts.id) setHoverDropId(null)
    // OS files first
    if (accepts.includes("os-files") && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      opts.onDropFiles?.(e.dataTransfer.files)
      return
    }
    try {
      const data = e.dataTransfer.getData(DRAG_MIME)
      if (data) {
        const item = JSON.parse(data) as DragItem
        if (
          (item.kind === "file" && accepts.includes("file")) ||
          (item.kind === "folder" && accepts.includes("folder"))
        ) {
          if (!opts.canDrop || opts.canDrop(item)) {
            opts.onDropItem?.(item)
          }
        }
      }
    } catch {}
  }

  return {
    dropProps: { onDragOver, onDragLeave, onDrop },
    isOver,
    canAccept: !!matchesItem,
    isDragging: !!dragging,
  }
}
