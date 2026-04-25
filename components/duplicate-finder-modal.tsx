"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { formatBytesLocalized, localizeNumber, localizeTitle } from "@/lib/localize"
import { AnimatePresence, motion } from "framer-motion"
import { X, Trash2, AlertTriangle, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

export function DuplicateFinderModal() {
  const { duplicateFinderOpen, setDuplicateFinderOpen, getDuplicates, deleteFile, getFolder } = useFolders()
  const { t, lang } = useT()
  const [keepIds, setKeepIds] = useState<Record<string, string>>({})

  const groups = useMemo(() => (duplicateFinderOpen ? getDuplicates() : []), [duplicateFinderOpen, getDuplicates])

  const handleResolveGroup = (groupKey: string, keepId: string, files: { folderId: string; file: { id: string; name: string } }[]) => {
    let removed = 0
    for (const f of files) {
      if (f.file.id !== keepId) {
        deleteFile(f.folderId, f.file.id)
        removed++
      }
    }
    toast.success(
      removed === 1
        ? t("duplicate.toastDeletedOne")
        : t("duplicate.toastDeleted", { n: localizeNumber(removed, lang) }),
    )
    setKeepIds((prev) => {
      const next = { ...prev }
      delete next[groupKey]
      return next
    })
  }

  return (
    <AnimatePresence>
      {duplicateFinderOpen && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDuplicateFinderOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[720px] max-h-[85vh] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Search className="size-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">{t("duplicate.title")}</h3>
                <p className="text-[12px] text-white/40">{t("duplicate.subtitle")}</p>
              </div>
              <button
                onClick={() => setDuplicateFinderOpen(false)}
                className="ms-auto size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {groups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="size-12 rounded-full bg-emerald-500/10 mx-auto flex items-center justify-center mb-2">
                    <span className="text-2xl">✨</span>
                  </div>
                  <p className="text-sm text-white/70">{t("duplicate.empty")}</p>
                  <p className="text-[12px] text-white/40 mt-1">{t("duplicate.emptyDesc")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <AlertTriangle className="size-3.5 text-amber-300" />
                    <p className="text-[12px] text-amber-200/80">
                      {groups.length === 1
                        ? t("duplicate.foundOne")
                        : t("duplicate.foundN", { n: localizeNumber(groups.length, lang) })}
                    </p>
                  </div>
                  {groups.map((group) => {
                    const selected = keepIds[group.key]
                    return (
                      <div
                        key={group.key}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-white/[0.04] flex items-center">
                          <span className="text-[12px] text-white/70">
                            {t("duplicate.copies", {
                              n: localizeNumber(group.files.length, lang),
                              name: group.files[0].file.name,
                            })}
                          </span>
                          <button
                            disabled={!selected}
                            onClick={() => handleResolveGroup(group.key, selected!, group.files)}
                            className="ms-auto px-2.5 py-1 rounded-full text-[11px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 hover:text-red-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Trash2 className="size-3" />
                            {t("duplicate.deleteOthers")}
                          </button>
                        </div>
                        <div className="divide-y divide-white/[0.04]">
                          {group.files.map((f) => {
                            const isKeep = selected === f.file.id
                            const folder = getFolder(f.folderId)
                            const folderTitle = folder ? localizeTitle(folder, t) : f.folderTitle
                            return (
                              <button
                                key={`${f.folderId}-${f.file.id}`}
                                onClick={() =>
                                  setKeepIds((prev) => ({ ...prev, [group.key]: f.file.id }))
                                }
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                                  isKeep ? "bg-emerald-500/5" : "hover:bg-white/[0.03]"
                                }`}
                              >
                                <div className={`size-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                  isKeep ? "border-emerald-400 bg-emerald-400/20" : "border-white/30"
                                }`}>
                                  {isKeep && <div className="size-1.5 rounded-full bg-emerald-300" />}
                                </div>
                                {(f.file.url && f.file.url.startsWith("data:image")) || /\.(png|jpe?g|gif|webp)$/i.test(f.file.url) ? (
                                  <img
                                    src={f.file.url}
                                    alt=""
                                    className="size-9 rounded object-cover bg-black/40"
                                  />
                                ) : (
                                  <div className="size-9 rounded bg-white/[0.06]" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] text-white/85 truncate">{f.file.name}</div>
                                  <div className="text-[10px] text-white/40 truncate">
                                    {folderTitle} · {f.file.size ? formatBytesLocalized(f.file.size, t, lang) : ""}
                                  </div>
                                </div>
                                {isKeep && (
                                  <span className="text-[10px] text-emerald-300 font-medium">{t("duplicate.keep")}</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
