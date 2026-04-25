"use client"

import * as Popover from "@radix-ui/react-popover"
import { useFolders } from "@/contexts/folder-context"
import { FOLDER_COLORS, FOLDER_ICONS } from "@/lib/data"
import { Check } from "lucide-react"
import type { ReactNode } from "react"

interface FolderDecoratorPopoverProps {
  folderId: string
  trigger: ReactNode
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}

export function FolderDecoratorPopover({
  folderId,
  trigger,
  align = "start",
  side = "bottom",
}: FolderDecoratorPopoverProps) {
  const { getFolder, setFolderColor, setFolderIcon } = useFolders()
  const folder = getFolder(folderId)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          side={side}
          sideOffset={6}
          className="z-[300] w-[280px] rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-3"
        >
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Icon</div>
              <div className="grid grid-cols-8 gap-1">
                {FOLDER_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setFolderIcon(folderId, emoji)}
                    className={`size-7 flex items-center justify-center rounded-md transition-colors ${
                      folder?.icon === emoji ? "bg-white/[0.1] ring-1 ring-white/30" : "hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="text-base">{emoji}</span>
                  </button>
                ))}
                <button
                  onClick={() => setFolderIcon(folderId, undefined)}
                  className="size-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-white/40 text-[10px]"
                  title="Clear icon"
                >
                  ✕
                </button>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Color</div>
              <div className="grid grid-cols-8 gap-1.5">
                {FOLDER_COLORS.map((c) => {
                  const active = folder?.color === c.value
                  return (
                    <button
                      key={c.id}
                      onClick={() => setFolderColor(folderId, c.value)}
                      className={`size-7 rounded-full flex items-center justify-center transition-all ${
                        active ? "ring-2 ring-white scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    >
                      {active && <Check className="size-3 text-white" />}
                    </button>
                  )
                })}
                <button
                  onClick={() => setFolderColor(folderId, undefined)}
                  className="size-7 rounded-full border border-dashed border-white/[0.2] text-white/40 text-[10px] hover:bg-white/[0.04] flex items-center justify-center"
                  title="Clear color"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
