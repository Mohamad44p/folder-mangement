"use client"

import { useFolders } from "@/contexts/folder-context"
import { CheckSquare, Square, Plus, Trash2, ListChecks } from "lucide-react"
import { useState } from "react"

export function FolderChecklist({ folderId }: { folderId: string }) {
  const { getFolder, addChecklistItem, toggleChecklistItem, removeChecklistItem } = useFolders()
  const folder = getFolder(folderId)
  const items = folder?.checklist ?? []
  const [draft, setDraft] = useState("")
  const completed = items.filter((i) => i.done).length
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ListChecks className="size-3 text-white/50" />
        <span className="text-[10px] uppercase tracking-wider text-white/40">Checklist</span>
        {items.length > 0 && (
          <span className="text-[10px] text-white/50 font-mono ml-auto">
            {completed}/{items.length}
          </span>
        )}
      </div>
      {items.length > 0 && (
        <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className="h-full bg-emerald-400/80 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.id} className="group flex items-center gap-2 px-1 py-0.5 rounded hover:bg-white/[0.03]">
            <button
              onClick={() => toggleChecklistItem(folderId, it.id)}
              className="shrink-0 text-white/60 hover:text-white"
            >
              {it.done ? (
                <CheckSquare className="size-4 text-emerald-400" />
              ) : (
                <Square className="size-4" />
              )}
            </button>
            <span
              className={`flex-1 text-[12px] ${
                it.done ? "text-white/40 line-through" : "text-white/80"
              }`}
            >
              {it.text}
            </span>
            <button
              onClick={() => removeChecklistItem(folderId, it.id)}
              className="opacity-0 group-hover:opacity-100 size-5 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an item..."
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              addChecklistItem(folderId, draft.trim())
              setDraft("")
            }
          }}
        />
        <button
          onClick={() => {
            if (!draft.trim()) return
            addChecklistItem(folderId, draft.trim())
            setDraft("")
          }}
          className="size-6 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06]"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  )
}
