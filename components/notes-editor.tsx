"use client"

import { renderMarkdown } from "@/lib/markdown"
import { Eye, Edit3 } from "lucide-react"
import { useState } from "react"

interface NotesEditorProps {
  value: string
  onSave: (next: string) => void
}

export function NotesEditor({ value, onSave }: NotesEditorProps) {
  const [draft, setDraft] = useState(value)
  const [mode, setMode] = useState<"view" | "edit">(value ? "view" : "edit")
  const [dirty, setDirty] = useState(false)

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-white/40">Notes</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setMode("view")}
            className={`h-6 px-2 rounded text-[11px] flex items-center gap-1 transition-colors ${
              mode === "view" ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <Eye className="size-3" />
            View
          </button>
          <button
            onClick={() => setMode("edit")}
            className={`h-6 px-2 rounded text-[11px] flex items-center gap-1 transition-colors ${
              mode === "edit" ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <Edit3 className="size-3" />
            Edit
          </button>
        </div>
      </div>
      <div className="px-3 py-3 min-h-[120px]">
        {mode === "edit" ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setDirty(e.target.value !== value)
              }}
              placeholder="# Heading\n**bold** *italic* `code` [link](url)\n- list item"
              rows={8}
              className="w-full bg-transparent border-none text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none resize-y"
            />
            {dirty && (
              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-white/[0.04]">
                <button
                  onClick={() => {
                    setDraft(value)
                    setDirty(false)
                  }}
                  className="px-3 py-1 rounded-full text-[11px] text-white/60 hover:text-white hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSave(draft)
                    setDirty(false)
                    setMode("view")
                  }}
                  className="px-3 py-1 rounded-full text-[11px] font-medium text-black bg-white hover:bg-white/90"
                >
                  Save
                </button>
              </div>
            )}
          </>
        ) : draft.trim() ? (
          <div>{renderMarkdown(draft)}</div>
        ) : (
          <p className="text-[13px] text-white/30 italic">No notes yet. Switch to Edit to add some.</p>
        )}
      </div>
    </div>
  )
}
