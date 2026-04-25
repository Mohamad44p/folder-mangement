"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { localizeTitle } from "@/lib/localize"
import { AnimatePresence, motion } from "framer-motion"
import { X, Star, ArrowLeftRight, RefreshCcw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

type Layout = "side" | "slider"

export function CompareMode() {
  const { compare, closeCompare, getFolder, toggleFileFavorite } = useFolders()
  const { t } = useT()
  const [layout, setLayout] = useState<Layout>("side")
  const [splitPos, setSplitPos] = useState(50) // for slider mode

  const folder = compare ? getFolder(compare.folderId) : undefined
  const a = useMemo(
    () => (folder?.files ?? []).find((f) => f.id === compare?.fileIdA),
    [folder, compare],
  )
  const b = useMemo(
    () => (folder?.files ?? []).find((f) => f.id === compare?.fileIdB),
    [folder, compare],
  )

  useEffect(() => {
    if (!compare) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCompare()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [compare, closeCompare])

  return (
    <AnimatePresence>
      {compare && a && b && (
        <motion.div
          className="fixed inset-0 z-[410] bg-black/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 z-10 px-5 py-4 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] text-white truncate">{t("compare.title")}</div>
              <div className="text-[11px] text-white/50 truncate">
                {t("compare.subtitle", {
                  folder: folder ? localizeTitle(folder, t) : "",
                  a: a.name,
                  b: b.name,
                })}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-black/50 rounded-full p-1 border border-white/[0.06]">
              <button
                onClick={() => setLayout("side")}
                className={`px-3 py-1 rounded-full text-[12px] transition-colors flex items-center gap-1.5 ${
                  layout === "side" ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <ArrowLeftRight className="size-3" />
                {t("compare.sideBySide")}
              </button>
              <button
                onClick={() => setLayout("slider")}
                className={`px-3 py-1 rounded-full text-[12px] transition-colors flex items-center gap-1.5 ${
                  layout === "slider" ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <RefreshCcw className="size-3" />
                {t("compare.slider")}
              </button>
            </div>
            <button
              onClick={closeCompare}
              className="size-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/[0.06]"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Comparison area */}
          <div className="absolute inset-0 pt-20 pb-24 px-6 flex items-center justify-center">
            {layout === "side" ? (
              <div className="grid grid-cols-2 gap-3 w-full h-full">
                {[a, b].map((file, i) => (
                  <div
                    key={file.id}
                    className="relative rounded-xl border border-white/[0.06] overflow-hidden bg-black/40 flex items-center justify-center"
                  >
                    <img
                      src={file.url}
                      alt={file.name}
                      className="max-w-full max-h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white/80 border border-white/[0.06]">
                      {String.fromCharCode(65 + i)}: {file.name}
                    </div>
                    <button
                      onClick={() => {
                        if (compare) toggleFileFavorite(compare.folderId, file.id)
                        toast.success(t("compare.toggledFav", { name: file.name }))
                      }}
                      className={`absolute top-3 right-3 size-8 flex items-center justify-center rounded-full backdrop-blur-md border border-white/[0.06] transition-colors ${
                        file.favorite
                          ? "bg-yellow-300/20 text-yellow-300"
                          : "bg-black/60 text-white/70 hover:text-yellow-200"
                      }`}
                    >
                      <Star className={`size-3.5 ${file.favorite ? "fill-yellow-300" : ""}`} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="relative rounded-xl border border-white/[0.06] overflow-hidden bg-black/40 max-w-[1200px] w-full h-full flex items-center justify-center select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = ((e.clientX - rect.left) / rect.width) * 100
                  setSplitPos(Math.max(0, Math.min(100, x)))
                }}
              >
                <img
                  src={a.url}
                  alt={a.name}
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${splitPos}%` }}
                >
                  <img
                    src={b.url}
                    alt={b.name}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ width: `${100 / (splitPos / 100)}%`, maxWidth: "none" }}
                  />
                </div>
                <div
                  className="absolute top-0 bottom-0 w-px bg-white pointer-events-none"
                  style={{ left: `${splitPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 rounded-full bg-white text-black flex items-center justify-center shadow-2xl">
                    <ArrowLeftRight className="size-3.5" />
                  </div>
                </div>
                <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white/80 border border-white/[0.06]">
                  B: {b.name}
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white/80 border border-white/[0.06]">
                  A: {a.name}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
