"use client"

import { useFolders } from "@/contexts/folder-context"
import type { FolderFile } from "@/lib/data"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"

interface CalendarViewProps {
  folderId: string
  files: FolderFile[]
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function FolderCalendarView({ folderId, files }: CalendarViewProps) {
  const { openLightbox } = useFolders()
  const [cursor, setCursor] = useState(() => {
    if (files.length === 0) return startOfMonth(new Date())
    const dates = files
      .map((f) => {
        try {
          return new Date(f.uploadedAt)
        } catch {
          return null
        }
      })
      .filter(Boolean) as Date[]
    if (!dates.length) return startOfMonth(new Date())
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())))
    return startOfMonth(latest)
  })

  const grouped = useMemo(() => {
    const map = new Map<string, FolderFile[]>()
    for (const f of files) {
      try {
        const d = new Date(f.uploadedAt)
        if (
          d.getFullYear() === cursor.getFullYear() &&
          d.getMonth() === cursor.getMonth()
        ) {
          const key = String(d.getDate())
          if (!map.has(key)) map.set(key, [])
          map.get(key)!.push(f)
        }
      } catch {}
    }
    return map
  }, [files, cursor])

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  const start = startOfMonth(cursor)
  const startWeekday = start.getDay()
  const total = daysInMonth(cursor)
  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-[13px] font-medium text-white">{monthLabel}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="size-7 flex items-center justify-center rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="px-2 h-7 rounded-full text-[11px] hover:bg-white/[0.06] text-white/60 hover:text-white"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="size-7 flex items-center justify-center rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-white/[0.04]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-white/40 text-center"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="aspect-square border-t border-r border-white/[0.04] last:border-r-0 bg-black/20" />
          }
          const dayFiles = grouped.get(String(day)) ?? []
          const cover = dayFiles.find((f) => f.type === "image")
          return (
            <div
              key={i}
              className="aspect-square border-t border-r border-white/[0.04] last:border-r-0 relative group overflow-hidden"
            >
              {cover && (
                <img
                  src={cover.url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-opacity"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute top-1 left-1.5 text-[10px] font-mono text-white/70">{day}</div>
              {dayFiles.length > 0 && (
                <button
                  onClick={() => cover && openLightbox(folderId, cover.id)}
                  className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded-full bg-black/60 text-[9px] text-white/80 border border-white/[0.06]"
                >
                  {dayFiles.length}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
