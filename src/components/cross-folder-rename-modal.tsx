"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { localizeNumber, localizeTag, localizeTitle } from "@/lib/localize"
import type { TranslationKey } from "@/lib/i18n-dict"
import { applyPattern, RENAME_TOKENS } from "@/lib/rename-pattern"
import type { FolderFile, Project } from "@/lib/data"
import { AnimatePresence, motion } from "framer-motion"
import { X, ArrowRight, Globe } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CrossFolderRenameModal() {
  const { crossFolderRenameOpen, setCrossFolderRenameOpen, folders, allTags, crossFolderRename } =
    useFolders()
  const { t, lang } = useT()
  const [tag, setTag] = useState("")
  const [type, setType] = useState("")
  const [pattern, setPattern] = useState("{name}-{n3}")

  const matcher = useCallback(
    (file: FolderFile, folder: Project) => {
      if (folder.deletedAt) return false
      if (tag && !(file.tags ?? []).includes(tag) && !(folder.tags ?? []).includes(tag)) return false
      if (type && file.type !== type) return false
      return true
    },
    [tag, type],
  )

  const preview = useMemo(() => {
    const out: { folderTitle: string; before: string; after: string }[] = []
    let counter = 0
    for (const folder of folders) {
      if (folder.deletedAt) continue
      const matches = (folder.files ?? []).filter((f) => matcher(f, folder))
      for (const file of matches) {
        if (out.length >= 12) break
        out.push({
          folderTitle: localizeTitle(folder, t),
          before: file.name,
          after: applyPattern(pattern, file, counter),
        })
        counter++
      }
      if (out.length >= 12) break
    }
    return { samples: out, total: counter }
  }, [folders, matcher, pattern, t])

  const handleApply = () => {
    const renamed = crossFolderRename(matcher, pattern)
    toast.success(t("crossRename.toastDone", { n: localizeNumber(renamed, lang) }))
    setCrossFolderRenameOpen(false)
  }

  return (
    <AnimatePresence>
      {crossFolderRenameOpen && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setCrossFolderRenameOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[640px] max-h-[85vh] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="size-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Globe className="size-4 text-sky-300" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">{t("crossRename.title")}</h3>
                <p className="text-[12px] text-white/40">{t("crossRename.subtitle")}</p>
              </div>
              <button
                onClick={() => setCrossFolderRenameOpen(false)}
                className="ms-auto size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-4 border-b border-white/[0.06] grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">{t("crossRename.tag")}</label>
                <Select value={tag || "__any"} onValueChange={(v) => setTag(v === "__any" ? "" : v)}>
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">{t("crossRename.anyTag")}</SelectItem>
                    {allTags.map((tg) => (
                      <SelectItem key={tg} value={tg}>
                        {localizeTag(tg, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">{t("crossRename.type")}</label>
                <Select value={type || "__any"} onValueChange={(v) => setType(v === "__any" ? "" : v)}>
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">{t("crossRename.anyType")}</SelectItem>
                    {(["image", "video", "document", "other"] as const).map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(`fileFilter.${tp}` as TranslationKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">{t("crossRename.pattern")}</label>
                <input
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[14px] text-white font-mono focus:outline-none focus:border-white/20"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {RENAME_TOKENS.map((tok) => (
                    <button
                      key={tok.token}
                      onClick={() => setPattern((p) => p + tok.token)}
                      className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-white/70 font-mono"
                      title={tok.description}
                    >
                      {tok.token}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 flex items-center justify-between">
                <span>
                  {preview.total === 1
                    ? t("crossRename.previewOne", { n: localizeNumber(preview.total, lang) })
                    : t("crossRename.previewN", { n: localizeNumber(preview.total, lang) })}
                </span>
              </div>
              {preview.samples.length === 0 ? (
                <p className="text-[12px] text-white/40 italic">{t("crossRename.noMatches")}</p>
              ) : (
                <div className="space-y-1">
                  {preview.samples.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.02] text-[12px]"
                    >
                      <span className="text-[10px] text-white/40 w-32 truncate">{s.folderTitle}</span>
                      <span className="text-white/40 truncate flex-1 font-mono">{s.before}</span>
                      <ArrowRight className="size-3 text-white/30 shrink-0" />
                      <span className="text-white truncate flex-1 font-mono">{s.after}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                onClick={() => setCrossFolderRenameOpen(false)}
                className="px-3 py-1.5 rounded-full text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06]"
              >
                {t("action.cancel")}
              </button>
              <button
                onClick={handleApply}
                disabled={preview.total === 0}
                className="px-3 py-1.5 rounded-full text-[13px] font-medium text-black bg-white hover:bg-white/90 disabled:opacity-40"
              >
                {t("crossRename.applyN", { n: localizeNumber(preview.total, lang) })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
