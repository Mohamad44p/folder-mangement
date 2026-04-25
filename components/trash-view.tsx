"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { formatDateLocalized, localizeNumber, localizeTitle } from "@/lib/localize"
import { AnimatePresence, motion } from "framer-motion"
import { Trash2, X, RotateCcw, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function TrashView() {
  const { trashOpen, setTrashOpen, getTrashed, restoreFolder, permanentlyDeleteFolder, emptyTrash } = useFolders()
  const { t, lang } = useT()
  const trashed = getTrashed()
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const formatDate = (iso: string) => {
    try {
      return formatDateLocalized(new Date(iso), t, lang)
    } catch {
      return iso
    }
  }

  const handleClose = () => {
    setTrashOpen(false)
    setConfirmEmpty(false)
  }

  return (
    <AnimatePresence>
      {trashOpen && (
        <motion.div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            className="relative w-full max-w-[640px] max-h-[80vh] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="size-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                <Trash2 className="size-4 text-white/60" />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-white">{t("trash.title")}</h3>
                <p className="text-[12px] text-white/40">
                  {trashed.length === 1
                    ? t("trash.subtitleOne")
                    : t("trash.subtitle", { count: localizeNumber(trashed.length, lang) })}
                </p>
              </div>
              {trashed.length > 0 && (
                <button
                  onClick={() => setConfirmEmpty(true)}
                  className="h-8 px-3 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[12px] text-red-300 hover:text-red-200 transition-colors flex items-center gap-1.5"
                >
                  <AlertTriangle className="size-3.5" />
                  {t("trash.emptyButton")}
                </button>
              )}
              <button
                onClick={handleClose}
                className="size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {trashed.length === 0 ? (
                <div className="text-center py-16">
                  <div className="size-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                    <Trash2 className="size-5 text-white/30" />
                  </div>
                  <p className="text-sm text-white/50">{t("trash.empty")}</p>
                  <p className="text-[12px] text-white/30 mt-1">{t("trash.emptyDesc")}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {trashed.map((f) => {
                    const fileCount = f.files?.length ?? 0
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                      >
                        <div
                          className="size-9 rounded-md flex items-center justify-center text-base shrink-0"
                          style={{
                            backgroundColor: f.color ?? "rgba(255,255,255,0.06)",
                          }}
                        >
                          {f.icon ?? "📁"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-white truncate">{localizeTitle(f, t)}</div>
                          <div className="text-[11px] text-white/40 truncate">
                            {fileCount === 1
                              ? t("trash.deletedAtOne", { date: formatDate(f.deletedAt ?? "") })
                              : t("trash.deletedAt", {
                                  date: formatDate(f.deletedAt ?? ""),
                                  count: localizeNumber(fileCount, lang),
                                })}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            restoreFolder(String(f.id))
                            toast.success(t("toast.restored"))
                          }}
                          className="h-7 px-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-white/70 hover:text-white border border-white/[0.06] flex items-center gap-1.5"
                        >
                          <RotateCcw className="size-3" />
                          {t("trash.restore")}
                        </button>
                        <button
                          onClick={() => {
                            permanentlyDeleteFolder(String(f.id))
                            toast.success(t("toast.permanentlyDeleted"))
                          }}
                          className="h-7 px-2.5 rounded-full hover:bg-red-500/10 text-[12px] text-white/50 hover:text-red-400 flex items-center gap-1.5"
                        >
                          <Trash2 className="size-3" />
                          {t("trash.permanent")}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Empty trash confirmation */}
            <AnimatePresence>
              {confirmEmpty && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-2xl"
                >
                  <motion.div
                    className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-5 max-w-sm mx-4"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                  >
                    <h3 className="text-base font-semibold text-white mb-1">{t("trash.confirmEmpty")}</h3>
                    <p className="text-[13px] text-white/50">
                      {trashed.length === 1
                        ? t("trash.confirmEmptyDescOne")
                        : t("trash.confirmEmptyDesc", { count: localizeNumber(trashed.length, lang) })}
                    </p>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setConfirmEmpty(false)}
                        className="px-3 py-1.5 rounded-full text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        {t("action.cancel")}
                      </button>
                      <button
                        onClick={() => {
                          emptyTrash()
                          setConfirmEmpty(false)
                          toast.success(t("trash.toastEmptied"))
                        }}
                        className="px-3 py-1.5 rounded-full text-[13px] font-medium text-white transition-colors"
                        style={{ backgroundColor: "oklch(0.5801 0.227 25.12)" }}
                      >
                        {t("trash.emptyButton")}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
