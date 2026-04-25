"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { localizeNumber, localizeTitle } from "@/lib/localize"
import { AnimatePresence, motion } from "framer-motion"
import { Pause, Play, ChevronLeft, ChevronRight, X, Gauge } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export function SlideshowMode() {
  const { slideshow, stopSlideshow, getFolder } = useFolders()
  const { t, lang } = useT()
  const SPEEDS = [
    { ms: 2000, label: localizeNumber(2, lang) + (lang === "ar" ? "ث" : "s") },
    { ms: 4000, label: localizeNumber(4, lang) + (lang === "ar" ? "ث" : "s") },
    { ms: 6000, label: localizeNumber(6, lang) + (lang === "ar" ? "ث" : "s") },
    { ms: 10_000, label: localizeNumber(10, lang) + (lang === "ar" ? "ث" : "s") },
  ]
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speedMs, setSpeedMs] = useState(4000)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const folder = slideshow ? getFolder(slideshow.folderId) : undefined
  const images = useMemo(
    () => (folder?.files ?? []).filter((f) => f.type === "image"),
    [folder],
  )
  const current = images[idx]

  useEffect(() => {
    if (slideshow) setIdx(0)
  }, [slideshow])

  useEffect(() => {
    if (!slideshow || images.length <= 1 || !playing) return
    intervalRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % images.length)
    }, speedMs)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [slideshow, images.length, playing, speedMs])

  const goNext = useCallback(() => {
    if (images.length === 0) return
    setIdx((i) => (i + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    if (images.length === 0) return
    setIdx((i) => (i - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    if (!slideshow) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopSlideshow()
      else if (e.key === "ArrowRight") goNext()
      else if (e.key === "ArrowLeft") goPrev()
      else if (e.key === " ") {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [slideshow, stopSlideshow, goNext, goPrev])

  if (!slideshow || !current) {
    return (
      <AnimatePresence>
        {slideshow && images.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[420] flex items-center justify-center bg-black/95"
          >
            <div className="text-center">
              <p className="text-white/70 text-sm">{t("slideshow.noImages")}</p>
              <button
                onClick={stopSlideshow}
                className="mt-3 px-3 py-1.5 rounded-full text-[12px] bg-white/[0.08] text-white"
              >
                {t("action.close")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {slideshow && (
        <motion.div
          className="fixed inset-0 z-[420] bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Image with Ken Burns */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: 1, scale: 1.06 }}
              exit={{ opacity: 0, scale: 1.08 }}
              transition={{ opacity: { duration: 0.6 }, scale: { duration: speedMs / 1000, ease: "linear" } }}
            >
              <img
                src={current.url}
                alt={current.name}
                className="max-w-full max-h-full object-contain"
              />
            </motion.div>
          </AnimatePresence>

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 px-5 py-4 z-10 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] text-white truncate">{current.name}</div>
              <div className="text-[11px] text-white/40 truncate">
                {t("slideshow.subtitle", {
                  folder: folder ? localizeTitle(folder, t) : "",
                  i: localizeNumber(idx + 1, lang),
                  n: localizeNumber(images.length, lang),
                })}
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 rounded-full px-2 border border-white/[0.06]">
              <Gauge className="size-3 text-white/40" />
              {SPEEDS.map((s) => (
                <button
                  key={s.ms}
                  onClick={() => setSpeedMs(s.ms)}
                  className={`px-2 py-1 text-[11px] rounded-full transition-colors ${
                    speedMs === s.ms ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="size-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/[0.06]"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button
              onClick={stopSlideshow}
              className="size-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/[0.06]"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Prev/next */}
          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/[0.06]"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/[0.06]"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {/* Progress bar */}
          {playing && images.length > 1 && (
            <motion.div
              key={current.id + "-progress"}
              className="absolute bottom-0 left-0 h-0.5 bg-white/80"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: speedMs / 1000, ease: "linear" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
