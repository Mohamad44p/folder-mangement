"use client"

import * as Popover from "@radix-ui/react-popover"
import { useFolders } from "@/contexts/folder-context"
import { Calendar, X } from "lucide-react"

function relTime(iso?: string): string {
  if (!iso) return "Set due date"
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((+d - +now) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Due today"
    if (diffDays === 1) return "Due tomorrow"
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
    if (diffDays < 7) return `Due in ${diffDays}d`
    return `Due ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
  } catch {
    return "Set due date"
  }
}

export function DueDatePicker({ folderId }: { folderId: string }) {
  const { getFolder, setFolderDueDate } = useFolders()
  const folder = getFolder(folderId)
  const due = folder?.dueDate
  const overdue =
    due &&
    (() => {
      try {
        return new Date(due).getTime() < Date.now() - 86400000
      } catch {
        return false
      }
    })()
  const soon =
    due &&
    (() => {
      try {
        const diff = new Date(due).getTime() - Date.now()
        return diff > 0 && diff < 86400000 * 3
      } catch {
        return false
      }
    })()

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={`h-7 px-2.5 rounded-full text-[12px] flex items-center gap-1.5 transition-colors border ${
            overdue
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : soon
                ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                : due
                  ? "bg-white/[0.04] border-white/[0.06] text-white/70"
                  : "bg-white/[0.04] border-white/[0.06] text-white/70 hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Calendar className="size-3.5" />
          <span>{relTime(due)}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[300] rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-3"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Due date</div>
          <input
            type="date"
            value={due ? due.slice(0, 10) : ""}
            onChange={(e) =>
              setFolderDueDate(folderId, e.target.value ? new Date(e.target.value).toISOString() : undefined)
            }
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-white/20"
          />
          {due && (
            <button
              onClick={() => setFolderDueDate(folderId, undefined)}
              className="ml-2 px-2 py-1.5 text-[11px] text-white/60 hover:text-red-400 inline-flex items-center gap-1"
            >
              <X className="size-3" />
              Clear
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
