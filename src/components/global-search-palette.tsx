"use client"

import { useFolders, type SearchHit } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import type { TranslationKey } from "@/lib/i18n-dict"
import { localizeTitle } from "@/lib/localize"
import { matchesFile, parseQuery, type ParsedQuery } from "@/lib/search-syntax"
import { AnimatePresence, motion } from "framer-motion"
import {
  Search,
  X,
  Folder,
  Image as ImageIcon,
  FileText,
  Film,
  File as FileIcon,
  BookmarkPlus,
  Bookmark,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

function hasAnyFilter(q: ParsedQuery): boolean {
  return (
    !!q.text ||
    q.tags.length > 0 ||
    q.types.length > 0 ||
    !!q.size ||
    !!q.before ||
    !!q.after ||
    !!q.nameContains ||
    q.favoriteOnly
  )
}

function formatBytesShort(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${bytes}B`
}

function highlight(text: string, q: string): ReactNode {
  if (!q) return text
  const lower = text.toLowerCase()
  const lq = q.toLowerCase()
  const idx = lower.indexOf(lq)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/20 text-yellow-200 rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function fileIconFor(name?: string) {
  if (!name) return FileIcon
  const lower = name.toLowerCase()
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/.test(lower)) return ImageIcon
  if (/\.(mp4|mov|webm|mkv)$/.test(lower)) return Film
  if (/\.(pdf|docx?|txt|md|csv|xlsx?|pptx?)$/.test(lower)) return FileText
  return FileIcon
}

export function GlobalSearchPalette() {
  const {
    paletteOpen,
    setPaletteOpen,
    folders,
    openFolder,
    getFolder,
    navigateToSubfolder,
    buildPathTitles,
    savedSearches,
    addSavedSearch,
    deleteSavedSearch,
  } = useFolders()
  const { t } = useT()
  const [query, setQuery] = useState("")
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const TOKEN_HELP: { token: TranslationKey; desc: TranslationKey }[] = [
    { token: "palette.token.tagToken", desc: "palette.token.tagDesc" },
    { token: "palette.token.type", desc: "palette.token.typeDesc" },
    { token: "palette.token.size", desc: "palette.token.sizeDesc" },
    { token: "palette.token.sizeLt", desc: "palette.token.sizeLtDesc" },
    { token: "palette.token.before", desc: "palette.token.beforeDesc" },
    { token: "palette.token.after", desc: "palette.token.afterDesc" },
    { token: "palette.token.name", desc: "palette.token.nameDesc" },
    { token: "palette.token.fav", desc: "palette.token.favDesc" },
  ]

  const parsed = useMemo(() => parseQuery(query), [query])

  const results: SearchHit[] = useMemo(() => {
    if (!hasAnyFilter(parsed)) return []
    const textNeedle = parsed.text.toLowerCase()
    const hits: SearchHit[] = []
    for (const f of folders) {
      if (f.deletedAt) continue
      const path = buildPathTitles(String(f.id)).map((title) => title)

      // Folder-level matching uses only the tokens that make sense for a
      // folder (text + tags). File-only tokens (size, type, date, …) gate
      // out the folder result so a `type:image` query doesn't surface the
      // containing folder as a hit.
      const folderTextHit =
        textNeedle.length > 0 &&
        (f.title.toLowerCase().includes(textNeedle) ||
          (f.description ?? "").toLowerCase().includes(textNeedle))
      const folderTagHit =
        parsed.tags.length > 0 &&
        parsed.tags.every((tg) => (f.tags ?? []).map((x) => x.toLowerCase()).includes(tg))
      const folderMatches = folderTextHit || folderTagHit

      const fileOnlyFilters =
        parsed.types.length > 0 ||
        !!parsed.size ||
        !!parsed.before ||
        !!parsed.after ||
        !!parsed.nameContains ||
        parsed.favoriteOnly

      if (folderMatches && !fileOnlyFilters) {
        hits.push({
          kind: "folder",
          folderId: String(f.id),
          folderTitle: localizeTitle(f, t),
          matchedField: textNeedle ? "title" : "tag",
          snippet: localizeTitle(f, t),
          pathTitles: path,
        })
      }

      for (const file of f.files ?? []) {
        // FolderFile in renderer state does not carry `caption` (it lives in
        // SQLite alongside ocr_text but isn't projected up to the UI yet),
        // so omit it from the matcher input.
        const ok = matchesFile(parsed, {
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: file.uploadedAt,
          description: file.description,
          ocrText: file.ocrText,
          favorite: file.favorite,
          tags: file.tags,
        })
        if (!ok) continue
        // The shared matcher does not know about file tags as free-text
        // haystacks. Preserve the legacy palette behaviour where typing
        // a bare word like "vacation" also matches files tagged "vacation".
        if (
          textNeedle &&
          !file.name.toLowerCase().includes(textNeedle) &&
          !(file.description ?? "").toLowerCase().includes(textNeedle) &&
          !(file.ocrText ?? "").toLowerCase().includes(textNeedle) &&
          !(file.tags ?? []).some((tg) => tg.toLowerCase().includes(textNeedle))
        ) {
          continue
        }

        hits.push({
          kind: "file",
          folderId: String(f.id),
          folderTitle: localizeTitle(f, t),
          fileId: file.id,
          fileName: file.name,
          fileUrl: file.url,
          matchedField: "file",
          snippet: file.name,
          pathTitles: [...path, file.name],
        })
      }
    }
    return hits.slice(0, 60)
  }, [folders, parsed, buildPathTitles, t])

  // Open via Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen(!paletteOpen)
      }
      if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [paletteOpen, setPaletteOpen])

  useEffect(() => {
    if (paletteOpen) {
      setQuery("")
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [paletteOpen])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-result-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIdx])

  const handleSelect = (hit: SearchHit) => {
    const path: string[] = []
    let current = getFolder(hit.folderId)
    const guard = new Set<string>()
    while (current && !guard.has(String(current.id))) {
      guard.add(String(current.id))
      path.unshift(String(current.id))
      if (!current.parentId) break
      current = getFolder(current.parentId)
    }
    if (path.length === 0) {
      setPaletteOpen(false)
      return
    }
    openFolder(path[0])
    for (let i = 1; i < path.length; i++) navigateToSubfolder(path[i])
    setPaletteOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const hit = results[activeIdx]
      if (hit) handleSelect(hit)
    }
  }

  const showSavedSearches = !query && savedSearches.length > 0
  const showHelp = !query

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPaletteOpen(false)}
          />
          <motion.div
            className="relative w-full max-w-[640px] rounded-2xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2 px-4 border-b border-white/[0.06]">
              <Search className="size-4 text-white/40 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("palette.placeholder")}
                className="flex-1 h-12 bg-transparent border-none text-[14px] text-white placeholder:text-white/30 focus:outline-none"
              />
              {query.trim() && (
                <button
                  onClick={() => {
                    addSavedSearch(query.slice(0, 40), query)
                    toast.success(t("palette.savedToast"))
                  }}
                  className="px-2 h-7 rounded-full text-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 hover:text-white flex items-center gap-1"
                  title={t("palette.saveSearchTitle")}
                >
                  <BookmarkPlus className="size-3" />
                  {t("palette.saveSearch")}
                </button>
              )}
              <button
                onClick={() => setPaletteOpen(false)}
                className="size-7 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Active filter chips */}
            {(parsed.tags.length > 0 ||
              parsed.types.length > 0 ||
              parsed.size ||
              parsed.favoriteOnly) && (
              <div className="px-4 py-2 border-b border-white/[0.06] flex flex-wrap gap-1">
                {parsed.tags.map((tg) => (
                  <span
                    key={`t-${tg}`}
                    className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-200 font-mono"
                  >
                    tag:{tg}
                  </span>
                ))}
                {parsed.types.map((tp) => (
                  <span
                    key={`ty-${tp}`}
                    className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-200 font-mono"
                  >
                    type:{tp}
                  </span>
                ))}
                {parsed.size && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200 font-mono">
                    size:{parsed.size.op}
                    {formatBytesShort(parsed.size.bytes)}
                  </span>
                )}
                {parsed.favoriteOnly && (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] text-yellow-200 font-mono">
                    fav
                  </span>
                )}
              </div>
            )}

            <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
              {showSavedSearches && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                    <Bookmark className="size-2.5" />
                    {t("palette.searches")}
                  </div>
                  {savedSearches.map((s) => (
                    <div
                      key={s.id}
                      className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04]"
                    >
                      <button
                        onClick={() => setQuery(s.query)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <div className="size-7 rounded-md bg-white/[0.06] flex items-center justify-center">
                          <Bookmark className="size-3 text-white/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-white truncate">{s.name}</div>
                          <div className="text-[10px] text-white/40 truncate font-mono">{s.query}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => deleteSavedSearch(s.id)}
                        className="opacity-0 group-hover:opacity-100 size-7 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showHelp && (
                <div className="px-3 py-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{t("palette.tipsHeader")}</div>
                  <div className="space-y-1">
                    {TOKEN_HELP.map((h) => (
                      <button
                        key={h.token}
                        onClick={() => setQuery(t(h.token))}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-white/[0.03] text-left"
                      >
                        <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[11px] font-mono text-white/80">
                          {t(h.token)}
                        </code>
                        <span className="text-[11px] text-white/50">{t(h.desc)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {query && results.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-white/40">{t("palette.empty")}</p>
                </div>
              )}

              {results.map((hit, idx) => {
                const Icon = hit.kind === "file" ? fileIconFor(hit.fileName) : Folder
                const active = idx === activeIdx
                const text = hit.kind === "file" ? hit.fileName ?? "" : hit.folderTitle
                return (
                  <button
                    key={`${hit.kind}-${hit.folderId}-${hit.fileId ?? "f"}-${idx}`}
                    data-result-idx={idx}
                    onClick={() => handleSelect(hit)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="size-8 rounded-md bg-white/[0.06] flex items-center justify-center shrink-0">
                      {hit.kind === "file" && hit.fileUrl &&
                      (hit.fileUrl.startsWith("data:image") ||
                        /\.(png|jpe?g|gif|webp|svg)$/i.test(hit.fileUrl)) ? (
                        <img src={hit.fileUrl} alt="" className="size-8 rounded-md object-cover" />
                      ) : (
                        <Icon className="size-4 text-white/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white truncate">
                        {highlight(text, parsed.text)}
                      </div>
                      <div className="text-[11px] text-white/40 truncate flex items-center gap-1">
                        {hit.pathTitles.slice(0, -1).map((p, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <span className="text-white/20">/</span>}
                            <span>{p}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-white/30 shrink-0">
                      {t(hit.kind === "file" ? "palette.kindFile" : "palette.kindFolder")}
                    </span>
                  </button>
                )
              })}
            </div>

            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/30">
                <span>
                  {results.length === 1
                    ? t("palette.resultsCountOne")
                    : t("palette.resultsCount", { n: results.length })}
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono">↑↓</kbd>
                  <span>{t("palette.navigate")}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono">⏎</kbd>
                  <span>{t("palette.open")}</span>
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
