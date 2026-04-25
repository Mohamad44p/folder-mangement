"use client"

import * as Popover from "@radix-ui/react-popover"
import { useFolders, type FolderTreeNode } from "@/contexts/folder-context"
import { ChevronDown, ChevronRight, Folder, FolderOpen, Home } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

interface MoveToPopoverProps {
  trigger: ReactNode
  onSelect: (destFolderId: string | null) => void
  excludeIds?: string[]
  allowRoot?: boolean
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}

function TreeRow({
  node,
  depth,
  excludeIds,
  expanded,
  toggleExpand,
  onSelect,
}: {
  node: FolderTreeNode
  depth: number
  excludeIds: Set<string>
  expanded: Set<string>
  toggleExpand: (id: string) => void
  onSelect: (id: string) => void
}) {
  const id = String(node.folder.id)
  const isExcluded = excludeIds.has(id)
  const isExpanded = expanded.has(id)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={`group flex items-center gap-1 pr-2 py-1 rounded-md transition-colors ${
          isExcluded
            ? "opacity-30 cursor-not-allowed"
            : "cursor-pointer hover:bg-white/[0.06] text-white/80 hover:text-white"
        }`}
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={() => {
          if (!isExcluded) onSelect(id)
        }}
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
        <span className="text-xs shrink-0">{node.folder.icon ?? (isExpanded ? "📂" : "📁")}</span>
        <span className="text-[12px] truncate">{node.folder.title}</span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              excludeIds={excludeIds}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function MoveToPopover({
  trigger,
  onSelect,
  excludeIds = [],
  allowRoot = false,
  align = "end",
  side = "bottom",
}: MoveToPopoverProps) {
  const { getFolderTree } = useFolders()
  const tree = getFolderTree()
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const node of tree) s.add(String(node.folder.id))
    return s
  })
  const [open, setOpen] = useState(false)

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePick = (id: string | null) => {
    onSelect(id)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          side={side}
          sideOffset={6}
          className="z-[300] w-[280px] rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-2 max-h-[400px] overflow-y-auto"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 px-2 py-1 mb-1">
            Move to...
          </div>
          {allowRoot && (
            <button
              onClick={() => handlePick(null)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.06] text-white/80 hover:text-white text-left"
            >
              <Home className="size-3.5 text-white/50" />
              <span className="text-[12px]">Root</span>
            </button>
          )}
          {tree.length === 0 ? (
            <div className="text-center text-white/40 text-[12px] py-4">No folders to move to.</div>
          ) : (
            tree.map((node) => (
              <TreeRow
                key={node.folder.id}
                node={node}
                depth={0}
                excludeIds={excludeSet}
                expanded={expanded}
                toggleExpand={toggleExpand}
                onSelect={handlePick}
              />
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
