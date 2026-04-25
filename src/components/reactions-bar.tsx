"use client"

import { useFolders } from "@/contexts/folder-context"
import { Smile } from "lucide-react"
import { useState } from "react"

const REACTIONS = ["👍", "❤️", "🔥", "👀", "✨", "🎯", "🚀"]

export function ReactionsBar({ folderId, fileId, compact }: { folderId: string; fileId: string; compact?: boolean }) {
  const { getFolder, toggleFileReaction } = useFolders()
  const file = getFolder(folderId)?.files?.find((f) => f.id === fileId)
  const [pickerOpen, setPickerOpen] = useState(false)
  if (!file) return null
  const reactions = file.reactions ?? []
  const counts = new Map<string, number>()
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from(counts.entries()).map(([emoji, count]) => {
        const mine = reactions.some((r) => r.emoji === emoji && r.by === "You")
        return (
          <button
            key={emoji}
            onClick={() => toggleFileReaction(folderId, fileId, emoji)}
            className={`h-6 px-1.5 rounded-full text-[11px] flex items-center gap-1 transition-colors border ${
              mine
                ? "bg-sky-500/15 border-sky-400/30 text-sky-200"
                : "bg-white/[0.04] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <span>{emoji}</span>
            <span className="font-mono">{count}</span>
          </button>
        )
      })}
      <div className="relative">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className={`size-6 rounded-full flex items-center justify-center transition-colors border ${
            pickerOpen
              ? "bg-white/[0.1] border-white/[0.15] text-white"
              : "bg-white/[0.04] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Smile className="size-3" />
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full mb-1 left-0 z-30 rounded-lg bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-1 flex gap-0.5">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  toggleFileReaction(folderId, fileId, emoji)
                  setPickerOpen(false)
                }}
                className="size-7 rounded hover:bg-white/[0.08] text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
