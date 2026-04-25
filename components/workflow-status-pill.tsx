"use client"

import * as Popover from "@radix-ui/react-popover"
import { useFolders } from "@/contexts/folder-context"
import { WORKFLOW_STATUSES, type WorkflowStatus } from "@/lib/data"
import { Workflow, Check } from "lucide-react"

export function WorkflowStatusPill({ folderId }: { folderId: string }) {
  const { getFolder, setFolderStatus } = useFolders()
  const folder = getFolder(folderId)
  const status = folder?.status
  const def = status ? WORKFLOW_STATUSES.find((s) => s.value === status) : undefined

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="h-7 px-2.5 rounded-full text-[12px] flex items-center gap-1.5 transition-colors border"
          style={
            def
              ? {
                  backgroundColor: `${def.color}20`,
                  borderColor: `${def.color}50`,
                  color: def.color,
                }
              : undefined
          }
        >
          <Workflow className="size-3.5" />
          <span>{def?.label ?? "Status"}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[300] w-[200px] rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-1.5"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 px-2 py-1">Status</div>
          <button
            onClick={() => setFolderStatus(folderId, undefined)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.06] text-white/60 text-[12px]"
          >
            <span className="size-2 rounded-full bg-white/20" />
            None
            {!status && <Check className="size-3 ml-auto" />}
          </button>
          {WORKFLOW_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFolderStatus(folderId, s.value)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.06] text-white/80 text-[12px]"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
              {status === s.value && <Check className="size-3 ml-auto" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
