"use client"

import { useFolders } from "@/contexts/folder-context"

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function StorageChart({ compact }: { compact?: boolean }) {
  const { getStorageBreakdown, openFolder } = useFolders()
  const slices = getStorageBreakdown()
  if (slices.length === 0) {
    return (
      <div className={`text-center text-white/30 text-[11px] ${compact ? "py-2" : "py-6"}`}>
        No storage used yet.
      </div>
    )
  }

  const total = slices.reduce((acc, s) => acc + s.bytes, 0)

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-wider">
        <span>Storage by folder</span>
        <span className="text-white/60 font-mono normal-case">{formatBytes(total)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden flex">
        {slices.slice(0, 8).map((s) => (
          <div
            key={s.folderId}
            className="h-full"
            style={{
              flexGrow: s.bytes,
              backgroundColor: s.color ?? "#3f3f3f",
            }}
            title={`${s.title}: ${formatBytes(s.bytes)}`}
          />
        ))}
      </div>
      <div className={`space-y-1 ${compact ? "" : "mt-2"}`}>
        {slices.slice(0, compact ? 4 : 6).map((s) => {
          const pct = total > 0 ? Math.round((s.bytes / total) * 100) : 0
          return (
            <button
              key={s.folderId}
              onClick={() => openFolder(s.folderId)}
              className="w-full flex items-center gap-2 group text-left"
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color ?? "#3f3f3f" }}
              />
              <span className="text-[11px] text-white/60 group-hover:text-white truncate flex-1">
                {s.title}
              </span>
              <span className="text-[10px] text-white/40 font-mono">{pct}%</span>
              {!compact && (
                <span className="text-[10px] text-white/40 font-mono w-14 text-right">
                  {formatBytes(s.bytes)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
