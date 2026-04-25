"use client"

import { useFolders } from "@/contexts/folder-context"
import { useEffect, useMemo, useRef, useState } from "react"
import { X, Plus } from "lucide-react"

interface TagInputProps {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  size?: "sm" | "md"
}

export function TagInput({ value, onChange, placeholder = "Add a tag...", size = "md" }: TagInputProps) {
  const { allTags } = useFolders()
  const [draft, setDraft] = useState("")
  const [showSuggest, setShowSuggest] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase()
    if (!q) return allTags.filter((t) => !value.includes(t)).slice(0, 8)
    return allTags.filter((t) => t.toLowerCase().includes(q) && !value.includes(t)).slice(0, 8)
  }, [allTags, draft, value])

  useEffect(() => {
    setActive(0)
  }, [draft])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSuggest(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (!t || value.includes(t)) return
    onChange([...value, t])
    setDraft("")
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (showSuggest && suggestions[active]) addTag(suggestions[active])
      else if (draft.trim()) addTag(draft)
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1])
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(suggestions.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === "," ) {
      e.preventDefault()
      if (draft.trim()) addTag(draft)
    } else if (e.key === "Escape") {
      setShowSuggest(false)
    }
  }

  const padding = size === "sm" ? "px-2 py-1" : "px-3 py-1.5"
  const fontSize = size === "sm" ? "text-[11px]" : "text-[12px]"

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={`flex items-center gap-1.5 flex-wrap rounded-full bg-white/[0.03] border border-white/[0.08] ${padding}`}
      >
        {value.map((t) => (
          <span
            key={t}
            className={`px-2 py-0.5 rounded-full bg-white/[0.06] ${fontSize} text-white/80 flex items-center gap-1`}
          >
            {t}
            <button
              onClick={() => removeTag(t)}
              className="text-white/40 hover:text-white"
              aria-label={`Remove ${t}`}
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setShowSuggest(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className={`flex-1 min-w-[80px] bg-transparent border-none ${fontSize} text-white placeholder:text-white/30 focus:outline-none`}
        />
      </div>
      {showSuggest && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 z-50 rounded-lg bg-[#1a1a1a] border border-white/[0.08] shadow-2xl max-h-[180px] overflow-y-auto py-1">
          {suggestions.map((s, idx) => (
            <button
              key={s}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              onMouseEnter={() => setActive(idx)}
              className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between transition-colors ${
                idx === active ? "bg-white/[0.06] text-white" : "text-white/70 hover:bg-white/[0.04]"
              }`}
            >
              <span>{s}</span>
              <Plus className="size-3 text-white/30" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
