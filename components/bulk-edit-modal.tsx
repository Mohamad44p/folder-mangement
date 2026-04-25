"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { localizeNumber, localizeTag } from "@/lib/localize"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { TagInput } from "./tag-input"

export function BulkEditModal() {
  const {
    bulkEditOpen,
    setBulkEditOpen,
    getFolder,
    bulkUpdateFiles,
    bulkAddTagsToFiles,
    bulkRemoveTagsFromFiles,
  } = useFolders()
  const { t, lang } = useT()

  const [description, setDescription] = useState("")
  const [touchDescription, setTouchDescription] = useState(false)
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([])
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([])
  const [favoriteState, setFavoriteState] = useState<"keep" | "yes" | "no">("keep")

  const folder = bulkEditOpen ? getFolder(bulkEditOpen.folderId) : undefined
  const targets = useMemo(() => {
    if (!folder || !bulkEditOpen) return []
    const set = new Set(bulkEditOpen.fileIds)
    return (folder.files ?? []).filter((f) => set.has(f.id))
  }, [folder, bulkEditOpen])

  const commonTags = useMemo(() => {
    if (targets.length === 0) return []
    const sets = targets.map((tt) => new Set(tt.tags ?? []))
    const first = Array.from(sets[0])
    return first.filter((tag) => sets.every((s) => s.has(tag)))
  }, [targets])

  useEffect(() => {
    if (bulkEditOpen) {
      setDescription("")
      setTouchDescription(false)
      setTagsToAdd([])
      setTagsToRemove([])
      setFavoriteState("keep")
    }
  }, [bulkEditOpen])

  const handleApply = () => {
    if (!bulkEditOpen) return
    if (touchDescription) {
      bulkUpdateFiles(bulkEditOpen.folderId, bulkEditOpen.fileIds, { description })
    }
    if (tagsToAdd.length > 0) {
      bulkAddTagsToFiles(bulkEditOpen.folderId, bulkEditOpen.fileIds, tagsToAdd)
    }
    if (tagsToRemove.length > 0) {
      bulkRemoveTagsFromFiles(bulkEditOpen.folderId, bulkEditOpen.fileIds, tagsToRemove)
    }
    if (favoriteState !== "keep") {
      bulkUpdateFiles(bulkEditOpen.folderId, bulkEditOpen.fileIds, {
        favorite: favoriteState === "yes",
      })
    }
    toast.success(t("bulkEdit.toastUpdated", { n: localizeNumber(bulkEditOpen.fileIds.length, lang) }))
    setBulkEditOpen(null)
  }

  return (
    <AnimatePresence>
      {bulkEditOpen && folder && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setBulkEditOpen(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[560px] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center">
              <div>
                <h3 className="text-[15px] font-semibold text-white">
                  {t("bulkEdit.title2", { count: localizeNumber(targets.length, lang) })}
                </h3>
                <p className="text-[12px] text-white/40">{t("bulkEdit.subtitle2")}</p>
              </div>
              <button
                onClick={() => setBulkEditOpen(null)}
                className="ms-auto size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
                  <input
                    type="checkbox"
                    checked={touchDescription}
                    onChange={(e) => setTouchDescription(e.target.checked)}
                    className="accent-white"
                  />
                  {t("bulkEdit.description")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setTouchDescription(true)
                  }}
                  rows={2}
                  placeholder={t("bulkEdit.descPlaceholderReplace")}
                  disabled={!touchDescription}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none disabled:opacity-40"
                />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
                  {t("bulkEdit.tagsAdd")}
                </div>
                <TagInput value={tagsToAdd} onChange={setTagsToAdd} placeholder={t("bulkEdit.tagsAddPlaceholder")} />
              </div>

              {commonTags.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
                    {t("bulkEdit.tagsRemoveCommon")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {commonTags.map((tag) => {
                      const willRemove = tagsToRemove.includes(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() =>
                            setTagsToRemove((prev) =>
                              willRemove ? prev.filter((tt) => tt !== tag) : [...prev, tag],
                            )
                          }
                          className={`px-2 py-0.5 rounded-full text-[11px] transition-colors border ${
                            willRemove
                              ? "bg-red-500/20 border-red-500/30 text-red-200 line-through"
                              : "bg-white/[0.04] border-white/[0.06] text-white/70"
                          }`}
                        >
                          {localizeTag(tag, t)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">{t("bulkEdit.favoriteLabel")}</div>
                <div className="flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                  {(["keep", "yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setFavoriteState(v)}
                      className={`flex-1 h-7 rounded-full text-[11px] transition-colors ${
                        favoriteState === v ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                      }`}
                    >
                      {v === "keep" ? t("bulkEdit.favKeep") : v === "yes" ? t("bulkEdit.favMark") : t("bulkEdit.favUnmark")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                onClick={() => setBulkEditOpen(null)}
                className="px-3 py-1.5 rounded-full text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06]"
              >
                {t("action.cancel")}
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1.5 rounded-full text-[13px] font-medium text-black bg-white hover:bg-white/90"
              >
                {t("bulkEdit.applyN", { count: localizeNumber(targets.length, lang) })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
