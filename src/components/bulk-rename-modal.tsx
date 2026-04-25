"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { localizeNumber, localizeTitle } from "@/lib/localize"
import { applyPattern, RENAME_TOKENS } from "@/lib/rename-pattern"
import { AnimatePresence, motion } from "framer-motion"
import { X, ArrowRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

export function BulkRenameModal() {
  const { bulkRenameOpen, setBulkRenameOpen, getFolder, bulkRenameFiles } = useFolders()
  const { t, lang } = useT()
  const [pattern, setPattern] = useState("{name}-{n2}")

  const folder = bulkRenameOpen ? getFolder(bulkRenameOpen.folderId) : undefined
  const targets = useMemo(() => {
    if (!folder || !bulkRenameOpen) return []
    const set = new Set(bulkRenameOpen.fileIds)
    return (folder.files ?? []).filter((f) => set.has(f.id))
  }, [folder, bulkRenameOpen])

  useEffect(() => {
    if (bulkRenameOpen) setPattern("{name}-{n2}")
  }, [bulkRenameOpen])

  const handleApply = () => {
    if (!bulkRenameOpen) return
    bulkRenameFiles(bulkRenameOpen.folderId, bulkRenameOpen.fileIds, pattern)
    toast.success(t("crossRename.toastDone", { n: localizeNumber(bulkRenameOpen.fileIds.length, lang) }))
    setBulkRenameOpen(null)
  }

  return (
    <AnimatePresence>
      {bulkRenameOpen && folder && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setBulkRenameOpen(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[640px] max-h-[80vh] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center">
              <div>
                <h3 className="text-[15px] font-semibold text-white">{t("bulkRename.title")}</h3>
                <p className="text-[12px] text-white/40">
                  {targets.length === 1
                    ? t("bulkRename.subtitleOne", {
                        count: localizeNumber(targets.length, lang),
                        folder: localizeTitle(folder, t),
                      })
                    : t("bulkRename.subtitle", {
                        count: localizeNumber(targets.length, lang),
                        folder: localizeTitle(folder, t),
                      })}
                </p>
              </div>
              <button
                onClick={() => setBulkRenameOpen(null)}
                className="ms-auto size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">{t("bulkRename.pattern")}</label>
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[14px] text-white font-mono focus:outline-none focus:border-white/20"
                placeholder="{name}-{n2}"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {RENAME_TOKENS.map((tok) => (
                  <button
                    key={tok.token}
                    onClick={() => setPattern((p) => p + tok.token)}
                    className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-white/70 hover:text-white font-mono"
                    title={t(tok.descKey)}
                  >
                    {tok.token}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{t("bulkRename.preview")}</div>
              <div className="space-y-1">
                {targets.map((file, i) => {
                  const next = applyPattern(pattern, file, i)
                  const changed = next !== file.name
                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.02] text-[12px]"
                    >
                      <span className="text-white/40 truncate flex-1 font-mono">{file.name}</span>
                      <ArrowRight className="size-3 text-white/30 shrink-0" />
                      <span
                        className={`truncate flex-1 font-mono ${
                          changed ? "text-white" : "text-white/40"
                        }`}
                      >
                        {next}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                onClick={() => setBulkRenameOpen(null)}
                className="px-3 py-1.5 rounded-full text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                {t("action.cancel")}
              </button>
              <button
                onClick={handleApply}
                disabled={!pattern.trim()}
                className="px-3 py-1.5 rounded-full text-[13px] font-medium text-black bg-white hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {t("bulkRename.applyN", { count: localizeNumber(targets.length, lang) })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
