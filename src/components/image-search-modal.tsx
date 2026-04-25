"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { localizeNumber, localizeTitle } from "@/lib/localize"
import { aiVisualSimilar } from "@/lib/ai-helpers"
import { AnimatePresence, motion } from "framer-motion"
import { X, Sparkles, ExternalLink } from "lucide-react"
import { useMemo } from "react"

export function ImageSearchModal() {
  const {
    imageSearchTarget,
    setImageSearchTarget,
    folders,
    getFolder,
    openLightbox,
    openFolder,
  } = useFolders()
  const { t, lang } = useT()

  const target = imageSearchTarget
  const file = useMemo(() => {
    if (!target) return null
    const folder = getFolder(target.folderId)
    return folder?.files?.find((f) => f.id === target.fileId) ?? null
  }, [target, getFolder])

  const matches = useMemo(() => {
    if (!file) return []
    return aiVisualSimilar(file, folders)
  }, [file, folders])

  return (
    <AnimatePresence>
      {target && file && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setImageSearchTarget(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[820px] max-h-[85vh] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <img
                src={file.url}
                alt=""
                className="size-12 rounded-lg object-cover bg-black/40 border border-white/[0.06]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-white font-medium truncate flex items-center gap-2">
                  <Sparkles className="size-3.5 text-violet-300" />
                  {t("imageSearch.similarTo", { name: file.name })}
                </div>
                <div className="text-[11px] text-white/40">
                  {matches.length === 1
                    ? t("imageSearch.subtitleOne")
                    : t("imageSearch.subtitleN", { n: localizeNumber(matches.length, lang) })}
                </div>
              </div>
              <button
                onClick={() => setImageSearchTarget(null)}
                className="size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {matches.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-white/40">{t("imageSearch.empty2")}</p>
                  <p className="text-[12px] text-white/30 mt-1">{t("imageSearch.emptyDesc")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {matches.map((m) => {
                    const folder = getFolder(m.folderId)
                    const matchFile = folder?.files?.find((f) => f.id === m.fileId)
                    if (!matchFile || !folder) return null
                    return (
                      <div
                        key={`${m.folderId}-${m.fileId}`}
                        className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-white/[0.14] transition-colors group"
                      >
                        <button
                          onClick={() => openLightbox(m.folderId, m.fileId)}
                          className="aspect-[4/5] relative bg-black/40 overflow-hidden block w-full"
                        >
                          {matchFile.type === "image" ? (
                            <img
                              src={matchFile.url}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : null}
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] text-violet-200 border border-violet-500/30">
                            {t("imageSearch.matchScore", { score: localizeNumber(Math.min(99, m.score), lang) })}
                          </div>
                        </button>
                        <div className="p-2.5">
                          <p className="text-[12px] text-white/80 truncate">{matchFile.name}</p>
                          <button
                            onClick={() => {
                              openFolder(m.folderId)
                              setImageSearchTarget(null)
                            }}
                            className="text-[10px] text-white/40 hover:text-white truncate flex items-center gap-1"
                          >
                            <ExternalLink className="size-2.5" />
                            {localizeTitle(folder, t)}
                          </button>
                          <p className="text-[10px] text-white/30 mt-0.5">{m.reason}</p>
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
