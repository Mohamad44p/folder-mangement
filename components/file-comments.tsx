"use client"

import { useFolders } from "@/contexts/folder-context"
import type { FileComment } from "@/lib/data"
import { MessageCircle, Send, Trash2, AtSign } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

interface MentionInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  mentions: string[]
  placeholder?: string
}

function MentionInput({ value, onChange, onSubmit, mentions, placeholder }: MentionInputProps) {
  const [showSuggest, setShowSuggest] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const lastAt = useMemo(() => {
    const m = /@(\w*)$/.exec(value)
    return m ? { token: m[0], q: m[1].toLowerCase(), start: value.length - m[0].length } : null
  }, [value])

  const suggestions = useMemo(() => {
    if (!lastAt) return []
    return mentions.filter((n) => n.toLowerCase().includes(lastAt.q)).slice(0, 5)
  }, [lastAt, mentions])

  useEffect(() => {
    setShowSuggest(!!lastAt && suggestions.length > 0)
  }, [lastAt, suggestions])

  const apply = (name: string) => {
    if (!lastAt) return
    const before = value.slice(0, lastAt.start)
    onChange(`${before}@${name} `)
    setShowSuggest(false)
  }

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder ?? "Add a comment... use @ to mention"}
        onKeyDown={(e) => {
          if (showSuggest) {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActive((i) => Math.min(suggestions.length - 1, i + 1))
              return
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((i) => Math.max(0, i - 1))
              return
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault()
              apply(suggestions[active])
              return
            }
            if (e.key === "Escape") {
              setShowSuggest(false)
              return
            }
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onSubmit()
          }
        }}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
      />
      {showSuggest && (
        <div className="absolute left-2 bottom-full mb-1 z-30 rounded-lg bg-[#1a1a1a] border border-white/[0.08] shadow-2xl py-1 min-w-[160px]">
          {suggestions.map((n, i) => (
            <button
              key={n}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(n)}
              onMouseEnter={() => setActive(i)}
              className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 ${
                i === active ? "bg-white/[0.06] text-white" : "text-white/70 hover:bg-white/[0.04]"
              }`}
            >
              <AtSign className="size-3 text-white/40" />
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function renderText(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g)
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="text-sky-300 bg-sky-500/10 px-1 rounded">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

function relTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.round(diff / 60_000)
    if (min < 1) return "just now"
    if (min < 60) return `${min}m ago`
    return `${Math.round(min / 60)}h ago`
  } catch {
    return ""
  }
}

export function FileCommentsThread({
  folderId,
  fileId,
}: {
  folderId: string
  fileId: string
}) {
  const { getFolder, addFileComment, removeFileComment } = useFolders()
  const folder = getFolder(folderId)
  const file = folder?.files?.find((f) => f.id === fileId)
  const [draft, setDraft] = useState("")

  const mentions = useMemo(() => {
    const set = new Set<string>(["You"])
    folder?.share?.sharedWith.forEach((p) => set.add(p.name))
    return Array.from(set)
  }, [folder])

  if (!file) return null
  const comments = file.comments ?? []

  const submit = () => {
    if (!draft.trim()) return
    addFileComment(folderId, fileId, draft.trim())
    setDraft("")
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 mb-2">
        <MessageCircle className="size-3" />
        <span>Comments</span>
        {comments.length > 0 && <span className="text-white/30">{comments.length}</span>}
      </div>
      <div className="space-y-1.5">
        {comments.length === 0 && (
          <p className="text-[12px] text-white/30 italic">No comments yet.</p>
        )}
        {comments.map((c) => (
          <CommentRow key={c.id} comment={c} onDelete={() => removeFileComment(folderId, fileId, c.id)} />
        ))}
      </div>
      <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
        <MentionInput value={draft} onChange={setDraft} onSubmit={submit} mentions={mentions} />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/30">⌘⏎ to send</span>
          <button
            onClick={submit}
            disabled={!draft.trim()}
            className="px-3 py-1 rounded-full bg-white text-black text-[11px] font-medium hover:bg-white/90 disabled:opacity-40 flex items-center gap-1"
          >
            <Send className="size-3" />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function CommentRow({ comment, onDelete }: { comment: FileComment; onDelete: () => void }) {
  const initial = comment.author.charAt(0).toUpperCase()
  return (
    <div className="group flex gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.02]">
      <div
        className="size-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
        style={{
          background: `linear-gradient(135deg, hsl(${(comment.author.charCodeAt(0) * 13) % 360}, 60%, 40%), hsl(${(comment.author.charCodeAt(0) * 17 + 60) % 360}, 60%, 40%))`,
        }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-medium text-white">{comment.author}</span>
          <span className="text-[10px] text-white/40">{relTime(comment.timestamp)}</span>
        </div>
        <div className="text-[12px] text-white/80 break-words">{renderText(comment.text)}</div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 size-5 flex items-center justify-center rounded text-white/30 hover:text-red-400"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  )
}
