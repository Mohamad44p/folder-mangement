"use client"

import { useFolders } from "@/contexts/folder-context"
import { Folder, Files, HardDrive, Star, Trash2 } from "lucide-react"

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function StatsFooter() {
  const { getStats, setTrashOpen } = useFolders()
  const stats = getStats()

  return (
    <div className="mt-8 pt-5 border-t border-white/[0.04] flex items-center gap-4 flex-wrap text-[12px] text-white/40">
      <div className="flex items-center gap-1.5">
        <Folder className="size-3" />
        <span className="font-mono text-white/70">{stats.totalFolders}</span>
        <span>folders</span>
        {stats.totalSubfolders > 0 && (
          <span className="text-white/30">
            +<span className="font-mono text-white/60">{stats.totalSubfolders}</span> subfolders
          </span>
        )}
      </div>
      <span className="text-white/20">·</span>
      <div className="flex items-center gap-1.5">
        <Files className="size-3" />
        <span className="font-mono text-white/70">{stats.totalFiles}</span>
        <span>files</span>
      </div>
      <span className="text-white/20">·</span>
      <div className="flex items-center gap-1.5">
        <HardDrive className="size-3" />
        <span className="font-mono text-white/70">{formatBytes(stats.totalSize)}</span>
      </div>
      {stats.favoritesCount > 0 && (
        <>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-1.5">
            <Star className="size-3 text-yellow-300/60" />
            <span className="font-mono text-white/70">{stats.favoritesCount}</span>
            <span>favorites</span>
          </div>
        </>
      )}
      {stats.trashCount > 0 && (
        <button
          onClick={() => setTrashOpen(true)}
          className="ml-auto flex items-center gap-1.5 hover:text-white/80 transition-colors"
        >
          <Trash2 className="size-3" />
          <span className="font-mono">{stats.trashCount}</span>
          <span>in trash</span>
        </button>
      )}
    </div>
  )
}
