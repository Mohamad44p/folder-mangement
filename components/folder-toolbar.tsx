"use client"

import { useFolders, type FilterKind, type SortKey } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { Search, SlidersHorizontal, ArrowDownUp, FolderPlus, Command, X, Hash, Star, LayoutTemplate } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { TranslationKey } from "@/lib/i18n-dict"

const SORT_OPTIONS: { value: SortKey; key: TranslationKey }[] = [
  { value: "created-desc", key: "sort.newestFirst" },
  { value: "created-asc", key: "sort.oldestFirst" },
  { value: "updated-desc", key: "sort.recentlyUpdated" },
  { value: "name-asc", key: "sort.nameAsc" },
  { value: "name-desc", key: "sort.nameDesc" },
  { value: "count-desc", key: "sort.mostItems" },
]

const FILTER_OPTIONS: { value: FilterKind; key: TranslationKey }[] = [
  { value: "all", key: "filter.all" },
  { value: "favorites", key: "filter.favorites" },
  { value: "non-empty", key: "filter.nonEmpty" },
  { value: "empty", key: "filter.empty" },
  { value: "with-images", key: "filter.withImages" },
]

export function FolderToolbar() {
  const {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    filterKind,
    setFilterKind,
    createEmptyFolder,
    setPaletteOpen,
    setTemplatePickerOpen,
    allTags,
    selectedTags,
    toggleTag,
    clearTags,
  } = useFolders()
  const { t } = useT()

  return (
    <div className="space-y-3 mb-5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("toolbar.searchPlaceholder")}
            className="w-full h-9 ps-9 pe-9 rounded-full bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-2 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={t("toolbar.clear")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setFilterKind(filterKind === "favorites" ? "all" : "favorites")}
          className={`h-9 px-3 rounded-full border text-[13px] transition-colors flex items-center gap-1.5 ${
            filterKind === "favorites"
              ? "bg-yellow-300/10 border-yellow-300/30 text-yellow-200"
              : "bg-white/[0.04] border-white/[0.06] text-white/70 hover:text-white hover:bg-white/[0.08]"
          }`}
          aria-label={t("toolbar.favorites")}
        >
          <Star className={`size-3.5 ${filterKind === "favorites" ? "fill-yellow-300 text-yellow-300" : ""}`} />
          <span className="hidden sm:inline">{t("toolbar.favorites")}</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-9 px-3 rounded-full bg-white/[0.04] border border-white/[0.06] text-[13px] text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center gap-1.5"
              aria-label={t("toolbar.filter")}
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden md:inline">
                {t(FILTER_OPTIONS.find((o) => o.value === filterKind)?.key ?? "filter.all")}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/[0.08] text-white min-w-[180px]">
            <DropdownMenuLabel className="text-white/50 text-xs uppercase tracking-wide">{t("toolbar.filter")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuRadioGroup value={filterKind} onValueChange={(v) => setFilterKind(v as FilterKind)}>
              {FILTER_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem
                  key={opt.value}
                  value={opt.value}
                  className="text-sm text-white/80 focus:bg-white/[0.06] focus:text-white"
                >
                  {t(opt.key)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-9 px-3 rounded-full bg-white/[0.04] border border-white/[0.06] text-[13px] text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center gap-1.5"
              aria-label={t("toolbar.sort")}
            >
              <ArrowDownUp className="size-3.5" />
              <span className="hidden md:inline">{t(SORT_OPTIONS.find((o) => o.value === sortKey)?.key ?? "sort.newestFirst")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/[0.08] text-white min-w-[200px]">
            <DropdownMenuLabel className="text-white/50 text-xs uppercase tracking-wide">{t("toolbar.sort")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem
                  key={opt.value}
                  value={opt.value}
                  className="text-sm text-white/80 focus:bg-white/[0.06] focus:text-white"
                >
                  {t(opt.key)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => setPaletteOpen(true)}
          className="h-9 px-3 rounded-full bg-white/[0.04] border border-white/[0.06] text-[13px] text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center gap-1.5"
          aria-label={t("toolbar.searchAll")}
          title={t("toolbar.searchAll")}
        >
          <Command className="size-3.5" />
          <span className="hidden lg:inline">{t("toolbar.searchAll")}</span>
          <kbd className="hidden lg:inline-flex items-center justify-center h-4 px-1 rounded bg-white/[0.08] text-[10px] text-white/60 font-mono">⌘K</kbd>
        </button>

        <button
          onClick={() => setTemplatePickerOpen(true)}
          className="h-9 px-3 rounded-full bg-white/[0.04] border border-white/[0.06] text-[13px] text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center gap-1.5"
          aria-label={t("toolbar.template")}
        >
          <LayoutTemplate className="size-3.5" />
          <span className="hidden md:inline">{t("toolbar.template")}</span>
        </button>

        <button
          onClick={() => createEmptyFolder(null)}
          className="h-9 px-3 rounded-full bg-white text-black text-[13px] font-medium hover:bg-white/90 transition-colors flex items-center gap-1.5"
          aria-label={t("toolbar.new")}
        >
          <FolderPlus className="size-3.5" />
          <span className="hidden sm:inline">{t("toolbar.new")}</span>
        </button>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-white/40 px-1 flex items-center gap-1">
            <Hash className="size-2.5" />
            {t("toolbar.tags")}
          </span>
          {allTags.slice(0, 12).map((tag) => {
            const active = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`h-6 px-2 rounded-full text-[11px] transition-colors border ${
                  active
                    ? "bg-sky-500/10 border-sky-400/30 text-sky-200"
                    : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                }`}
              >
                {tag}
              </button>
            )
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={clearTags}
              className="h-6 px-2 rounded-full text-[11px] text-white/40 hover:text-white"
            >
              {t("toolbar.clear")}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
