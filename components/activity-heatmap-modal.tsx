"use client"

import { useFolders } from "@/contexts/folder-context"
import { AnimatePresence, motion } from "framer-motion"
import { X, Activity, ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"

function buildYearGrid(year: number) {
  const days: { date: string; iso: string }[] = []
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const cursor = new Date(start)
  while (cursor <= end) {
    days.push({
      date: cursor.toISOString().slice(0, 10),
      iso: cursor.toISOString(),
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function ActivityHeatmapModal() {
  const { heatmapModalOpen, setHeatmapModalOpen, getActivityHeatmap } = useFolders()
  const [year, setYear] = useState(new Date().getFullYear())

  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const day of getActivityHeatmap(year)) map.set(day.date, day.count)
    return map
  }, [getActivityHeatmap, year])

  const days = buildYearGrid(year)
  const max = Math.max(1, ...Array.from(data.values()))

  const intensity = (count: number) => {
    if (count === 0) return "rgba(255,255,255,0.04)"
    const t = Math.min(1, count / max)
    if (t < 0.25) return "rgba(56, 189, 248, 0.25)"
    if (t < 0.5) return "rgba(56, 189, 248, 0.5)"
    if (t < 0.75) return "rgba(56, 189, 248, 0.75)"
    return "rgba(56, 189, 248, 1)"
  }

  // Group days into weeks (53 weeks max)
  const weeks: typeof days[] = []
  let week: typeof days = []
  const firstDow = new Date(year, 0, 1).getDay()
  for (let i = 0; i < firstDow; i++) week.push({ date: "", iso: "" })
  for (const d of days) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length) weeks.push(week)

  const totalActivity = Array.from(data.values()).reduce((acc, n) => acc + n, 0)

  return (
    <AnimatePresence>
      {heatmapModalOpen && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setHeatmapModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[860px] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="size-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Activity className="size-4 text-sky-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-white">Activity heatmap</h3>
                <p className="text-[12px] text-white/40">
                  {totalActivity} actions in {year}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-full p-0.5">
                <button
                  onClick={() => setYear(year - 1)}
                  className="size-7 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="px-2 text-[12px] text-white font-mono">{year}</span>
                <button
                  onClick={() => setYear(year + 1)}
                  className="size-7 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
              <button
                onClick={() => setHeatmapModalOpen(false)}
                className="size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-x-auto">
              <div className="flex gap-1">
                {weeks.map((wk, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {wk.map((d, di) => {
                      if (!d.date) return <div key={di} className="size-3" />
                      const count = data.get(d.date) ?? 0
                      return (
                        <div
                          key={di}
                          className="size-3 rounded-sm"
                          style={{ backgroundColor: intensity(count) }}
                          title={`${d.date}: ${count} action${count === 1 ? "" : "s"}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-[10px] text-white/40">
                <span>Less</span>
                {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                  <div
                    key={t}
                    className="size-3 rounded-sm"
                    style={{ backgroundColor: intensity(t * max) }}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
