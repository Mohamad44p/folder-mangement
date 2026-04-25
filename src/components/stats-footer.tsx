"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { formatBytesLocalized, localizeNumber } from "@/lib/localize"
import { Folder, Files, HardDrive, Star, Trash2 } from "lucide-react"

export function StatsFooter() {
  const { getStats, setTrashOpen } = useFolders()
  const { t, lang } = useT()
  const stats = getStats()

  return (
    <div className="mt-8 pt-5 border-t border-white/[0.04] flex items-center gap-4 flex-wrap text-[12px] text-white/40">
      <div className="flex items-center gap-1.5">
        <Folder className="size-3" />
        <span className="font-mono text-white/70">{localizeNumber(stats.totalFolders, lang)}</span>
        <span>{t("footer.folders")}</span>
        {stats.totalSubfolders > 0 && (
          <span className="text-white/30">
            +<span className="font-mono text-white/60">{localizeNumber(stats.totalSubfolders, lang)}</span> {t("footer.subfolders")}
          </span>
        )}
      </div>
      <span className="text-white/20">·</span>
      <div className="flex items-center gap-1.5">
        <Files className="size-3" />
        <span className="font-mono text-white/70">{localizeNumber(stats.totalFiles, lang)}</span>
        <span>{t("footer.files")}</span>
      </div>
      <span className="text-white/20">·</span>
      <div className="flex items-center gap-1.5">
        <HardDrive className="size-3" />
        <span className="font-mono text-white/70">{formatBytesLocalized(stats.totalSize, t, lang)}</span>
      </div>
      {stats.favoritesCount > 0 && (
        <>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-1.5">
            <Star className="size-3 text-yellow-300/60" />
            <span className="font-mono text-white/70">{localizeNumber(stats.favoritesCount, lang)}</span>
            <span>{t("footer.favorites")}</span>
          </div>
        </>
      )}
      {stats.trashCount > 0 && (
        <button
          onClick={() => setTrashOpen(true)}
          className="ms-auto flex items-center gap-1.5 hover:text-white/80 transition-colors"
        >
          <Trash2 className="size-3" />
          <span className="font-mono">{localizeNumber(stats.trashCount, lang)}</span>
          <span>{t("footer.inTrash")}</span>
        </button>
      )}
    </div>
  )
}
