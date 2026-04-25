"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import type { TranslationKey } from "@/lib/i18n-dict"
import { formatBytesLocalized, formatDateLocalized, localizeNumber, localizeTag, localizeTitle } from "@/lib/localize"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronLeft, ChevronRight, X, Star, Download, Trash2, Info,
  RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Pipette, PenLine, MessageCircle,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { extractPalette, getDimensions, pickColorAt } from "@/lib/color-palette"
import { library } from "@/lib/library"
import { ColorPaletteBar } from "./color-palette-bar"
import { ExifPanel } from "./exif-panel"
import { AnnotationsCanvas } from "./annotations-canvas"
import { VideoPlayerInline } from "./video-player-inline"
import { PdfPreview } from "./pdf-preview"
import { FileCommentsThread } from "./file-comments"

export function ImageLightbox() {
  const {
    lightbox,
    closeLightbox,
    getFolder,
    toggleFileFavorite,
    deleteFile,
    openLightbox,
    rotateFile,
    flipFile,
    setFilePalette,
    setFileDimensions,
    setFileExif,
    setFileAnnotations,
  } = useFolders()
  const { t, lang } = useT()
  const formatBytes = (n?: number) => (n ? formatBytesLocalized(n, t, lang) : "")
  const formatDate = (iso?: string) => {
    if (!iso) return ""
    try {
      return formatDateLocalized(new Date(iso), t, lang)
    } catch {
      return iso
    }
  }
  const [showInfo, setShowInfo] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [annotationsVisible, setAnnotationsVisible] = useState(true)
  const [eyedropperOn, setEyedropperOn] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const folder = lightbox ? getFolder(lightbox.folderId) : undefined
  const files = useMemo(
    () => (folder?.files ?? []).filter((f) => f.type === "image" || f.type === "video" || f.type === "document"),
    [folder],
  )
  const currentIndex = useMemo(
    () => (lightbox ? files.findIndex((f) => f.id === lightbox.fileId) : -1),
    [lightbox, files],
  )
  const current = currentIndex >= 0 ? files[currentIndex] : null

  const goNext = useCallback(() => {
    if (!lightbox || files.length === 0) return
    const next = (currentIndex + 1) % files.length
    openLightbox(lightbox.folderId, files[next].id)
  }, [lightbox, files, currentIndex, openLightbox])

  const goPrev = useCallback(() => {
    if (!lightbox || files.length === 0) return
    const prev = (currentIndex - 1 + files.length) % files.length
    openLightbox(lightbox.folderId, files[prev].id)
  }, [lightbox, files, currentIndex, openLightbox])

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (eyedropperOn) {
          setEyedropperOn(false)
          return
        }
        closeLightbox()
      }
      else if (e.key === "ArrowRight") goNext()
      else if (e.key === "ArrowLeft") goPrev()
      else if (e.key === "i" || e.key === "I") setShowInfo((s) => !s)
      else if (e.key === "c" || e.key === "C") setShowComments((s) => !s)
      else if (e.key === "f" || e.key === "F") {
        if (current) toggleFileFavorite(lightbox.folderId, current.id)
      } else if (e.key === "r" || e.key === "R") {
        if (current && lightbox) rotateFile(lightbox.folderId, current.id, e.shiftKey ? -90 : 90)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightbox, goNext, goPrev, closeLightbox, current, toggleFileFavorite, rotateFile, eyedropperOn])

  // Lazy-extract palette / dimensions / EXIF on first lightbox open per file.
  // EXIF is read from the SQLite store (populated at upload time by the main
  // process via exifr); palette + dimensions are computed in the renderer.
  // Geo coordinates already arrive on the file record from the main process.
  useEffect(() => {
    if (!current || !lightbox) return
    if (current.type !== "image") return
    if (!current.palette) {
      void extractPalette(current.url, 5).then((p) => {
        if (p.length > 0) setFilePalette(lightbox.folderId, current.id, p)
      })
    }
    if (!current.dimensions) {
      void getDimensions(current.url).then((d) => {
        if (d) setFileDimensions(lightbox.folderId, current.id, d)
      })
    }
    if (!current.exif) {
      void library.files
        .getExif(current.id)
        .then((res) => {
          const flat = res?.data ? flattenExif(res.data) : {}
          setFileExif(lightbox.folderId, current.id, flat)
        })
        .catch(() => {
          setFileExif(lightbox.folderId, current.id, {})
        })
    }
  }, [current, lightbox, setFilePalette, setFileDimensions, setFileExif])

  const handleEyedrop = useCallback(
    async (e: React.PointerEvent) => {
      if (!eyedropperOn || !current || !imgRef.current) return
      const rect = imgRef.current.getBoundingClientRect()
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100
      if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return
      const hex = await pickColorAt(current.url, xPercent, yPercent)
      if (hex) {
        try {
          await navigator.clipboard.writeText(hex)
          toast.success(`Picked ${hex} (copied)`)
        } catch {
          toast.success(`Picked ${hex}`)
        }
      }
      setEyedropperOn(false)
    },
    [eyedropperOn, current],
  )

  const handleDownload = () => {
    if (!current) return
    const a = document.createElement("a")
    a.href = current.url
    a.download = current.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDelete = () => {
    if (!lightbox || !current) return
    deleteFile(lightbox.folderId, current.id)
    toast.success(t("lightbox.fileRemoved"))
    if (files.length <= 1) {
      closeLightbox()
    } else {
      goNext()
    }
  }

  return (
    <AnimatePresence>
      {lightbox && current && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={closeLightbox}
          />

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 z-10 px-5 py-4 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-white truncate">{current.name}</div>
              <div className="text-[11px] text-white/50 truncate flex items-center gap-2">
                <span>{folder?.title}</span>
                <span className="text-white/30">·</span>
                <span>
                  {currentIndex + 1} / {files.length}
                </span>
                {current.size && (
                  <>
                    <span className="text-white/30">·</span>
                    <span>{formatBytes(current.size)}</span>
                  </>
                )}
              </div>
            </div>
            {current.type === "image" && (
              <>
                <button
                  onClick={() => rotateFile(lightbox.folderId, current.id, -90)}
                  className="size-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
                  title={t("lightbox.rotateLeft")}
                >
                  <RotateCcw className="size-4" />
                </button>
                <button
                  onClick={() => rotateFile(lightbox.folderId, current.id, 90)}
                  className="size-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
                  title={t("lightbox.rotateRight")}
                >
                  <RotateCw className="size-4" />
                </button>
                <button
                  onClick={() => flipFile(lightbox.folderId, current.id, "h")}
                  className={`size-9 flex items-center justify-center rounded-full ${
                    current.flipH ? "bg-white/[0.1] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                  }`}
                  title={t("lightbox.flipHTitle")}
                >
                  <FlipHorizontal className="size-4" />
                </button>
                <button
                  onClick={() => flipFile(lightbox.folderId, current.id, "v")}
                  className={`size-9 flex items-center justify-center rounded-full ${
                    current.flipV ? "bg-white/[0.1] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                  }`}
                  title={t("lightbox.flipVTitle")}
                >
                  <FlipVertical className="size-4" />
                </button>
                <button
                  onClick={() => setEyedropperOn((v) => !v)}
                  className={`size-9 flex items-center justify-center rounded-full ${
                    eyedropperOn ? "bg-emerald-500/20 text-emerald-300" : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                  }`}
                  title={t("lightbox.eyedropper")}
                >
                  <Pipette className="size-4" />
                </button>
                <button
                  onClick={() => setAnnotationsVisible((v) => !v)}
                  className={`size-9 flex items-center justify-center rounded-full ${
                    annotationsVisible ? "bg-white/[0.08] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                  }`}
                  title={t("lightbox.annotationsTitle")}
                >
                  <PenLine className="size-4" />
                </button>
                <span className="w-px h-5 bg-white/10 mx-0.5" />
              </>
            )}
            <button
              onClick={() => setShowComments((s) => !s)}
              className={`size-9 flex items-center justify-center rounded-full ${
                showComments ? "bg-white/[0.1] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.08]"
              }`}
              title={t("lightbox.commentsBtn")}
            >
              <MessageCircle className="size-4" />
              {(current.comments?.length ?? 0) > 0 && (
                <span className="absolute size-1.5 rounded-full bg-sky-400 -translate-x-2 -translate-y-2.5" />
              )}
            </button>
            <button
              onClick={() => toggleFileFavorite(lightbox.folderId, current.id)}
              className={`size-9 flex items-center justify-center rounded-full transition-colors ${
                current.favorite
                  ? "text-yellow-300 bg-yellow-300/10"
                  : "text-white/60 hover:text-white hover:bg-white/[0.08]"
              }`}
              title={t("lightbox.favBtn")}
            >
              <Star className={`size-4 ${current.favorite ? "fill-yellow-300" : ""}`} />
            </button>
            <button
              onClick={() => setShowInfo((s) => !s)}
              className={`size-9 flex items-center justify-center rounded-full transition-colors ${
                showInfo ? "text-white bg-white/[0.1]" : "text-white/60 hover:text-white hover:bg-white/[0.08]"
              }`}
              title={t("lightbox.infoBtn")}
            >
              <Info className="size-4" />
            </button>
            <button
              onClick={handleDownload}
              className="size-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
              title={t("action.download")}
            >
              <Download className="size-4" />
            </button>
            <button
              onClick={handleDelete}
              className="size-9 flex items-center justify-center rounded-full text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title={t("action.delete")}
            >
              <Trash2 className="size-4" />
            </button>
            <button
              onClick={closeLightbox}
              className="size-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label={t("lightbox.close")}
              title={t("lightbox.closeTitle")}
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Image area */}
          <motion.div
            className="relative max-w-[90vw] max-h-[80vh] flex items-center justify-center"
            key={current.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            ref={containerRef}
          >
            {current.type === "image" ? (
              <div className="relative" onPointerDown={handleEyedrop}>
                <img
                  ref={imgRef}
                  src={current.url}
                  alt={current.name}
                  className={`max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl ${
                    eyedropperOn ? "cursor-crosshair" : ""
                  }`}
                  style={{
                    transform: `rotate(${current.rotation ?? 0}deg) scaleX(${current.flipH ? -1 : 1}) scaleY(${current.flipV ? -1 : 1})`,
                    transition: "transform 0.25s ease",
                  }}
                />
                {imgRef.current && current.type === "image" && (
                  <AnnotationsCanvas
                    annotations={current.annotations ?? []}
                    onChange={(a) => setFileAnnotations(lightbox.folderId, current.id, a)}
                    visible={annotationsVisible}
                    onToggleVisible={setAnnotationsVisible}
                    width={imgRef.current.naturalWidth}
                    height={imgRef.current.naturalHeight}
                  />
                )}
              </div>
            ) : current.type === "video" ? (
              <div className="w-[80vw] h-[70vh] max-w-[1200px]">
                <VideoPlayerInline url={current.url} fileId={current.id} />
              </div>
            ) : current.type === "document" ? (
              <div className="w-[80vw] h-[80vh] max-w-[1000px]">
                <PdfPreview url={current.url} name={current.name} />
              </div>
            ) : null}
          </motion.div>

          {/* Prev / next */}
          {files.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goPrev()
                }}
                className="absolute left-3 sm:left-6 size-12 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/[0.08] backdrop-blur-md transition-colors"
                aria-label={t("lightbox.prev")}
                title={t("lightbox.prevTitle")}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
                className="absolute right-3 sm:right-6 size-12 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/[0.08] backdrop-blur-md transition-colors"
                aria-label={t("lightbox.next")}
                title={t("lightbox.nextTitle")}
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {/* Info panel */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                className="absolute right-0 top-0 bottom-0 w-[320px] bg-[#1a1a1a]/95 backdrop-blur-xl border-l border-white/[0.06] z-20"
                initial={{ x: 320 }}
                animate={{ x: 0 }}
                exit={{ x: 320 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-5 pt-20 space-y-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-white">{t("lightbox.fileDetails")}</h3>
                  </div>
                  <div className="space-y-3 text-[12px]">
                    <Detail label={t("lightbox.detailName")} value={current.name} />
                    <Detail label={t("lightbox.detailType")} value={t(`fileFilter.${current.type}` as TranslationKey)} />
                    <Detail label={t("lightbox.detailSize")} value={formatBytes(current.size) || "—"} />
                    <Detail label={t("lightbox.detailUploaded")} value={formatDate(current.uploadedAt)} />
                    <Detail label={t("lightbox.detailFolder")} value={folder ? localizeTitle(folder, t) : "—"} />
                    {current.description && <Detail label={t("lightbox.detailDescription")} value={current.description} multi />}
                    {current.tags && current.tags.length > 0 && (
                      <div>
                        <div className="text-white/40 text-[11px] mb-1">{t("lightbox.detailTags")}</div>
                        <div className="flex flex-wrap gap-1">
                          {current.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] text-white/70"
                            >
                              {localizeTag(tag, t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {current.aiTags && current.aiTags.length > 0 && (
                      <div>
                        <div className="text-white/40 text-[11px] mb-1">{t("lightbox.detailAiTags")}</div>
                        <div className="flex flex-wrap gap-1">
                          {current.aiTags.map((tag) => (
                            <span
                              key={tag.tag}
                              className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-200"
                            >
                              {localizeTag(tag.tag, t)}{" "}
                              <span className="text-violet-300/60 font-mono text-[9px]">
                                {localizeNumber(tag.confidence, lang)}%
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {current.palette && current.palette.length > 0 && (
                      <div>
                        <div className="text-white/40 text-[11px] mb-1">{t("lightbox.detailPalette")}</div>
                        <ColorPaletteBar palette={current.palette} size="md" />
                      </div>
                    )}
                    {current.geo && (
                      <Detail
                        label={t("lightbox.detailLocation")}
                        value={`${current.geo.lat.toFixed(3)}, ${current.geo.lng.toFixed(3)}`}
                      />
                    )}
                    {current.ocrText && (
                      <div>
                        <div className="text-white/40 text-[11px] mb-1">{t("lightbox.detailOcr")}</div>
                        <p className="text-[11px] text-white/70 italic bg-white/[0.03] border border-white/[0.06] rounded p-2">
                          {current.ocrText}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <ExifPanel exif={current.exif} dimensions={current.dimensions} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comments panel */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-[320px] bg-[#1a1a1a]/95 backdrop-blur-xl border-r border-white/[0.06] z-20 flex flex-col"
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 pt-20 pb-3 border-b border-white/[0.06]">
                  <h3 className="text-[14px] font-semibold text-white">{t("lightbox.discussion")}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <FileCommentsThread folderId={lightbox.folderId} fileId={current.id} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom thumbnail strip */}
          {files.length > 1 && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4 z-10">
              <div className="flex justify-center gap-2 px-4 overflow-x-auto">
                {files.map((f, i) => (
                  <button
                    key={f.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      openLightbox(lightbox.folderId, f.id)
                    }}
                    className={`shrink-0 size-12 rounded-md overflow-hidden border-2 transition-all ${
                      i === currentIndex
                        ? "border-white scale-110"
                        : "border-transparent opacity-50 hover:opacity-100"
                    }`}
                  >
                    <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Detail({ label, value, multi }: { label: string; value: string; multi?: boolean }) {
  return (
    <div>
      <div className="text-white/40 text-[11px] mb-0.5">{label}</div>
      <div className={`text-white/85 ${multi ? "" : "truncate"}`}>{value}</div>
    </div>
  )
}

const EXIF_FIELDS: Array<[string, string]> = [
  ["Make", "Camera make"],
  ["Model", "Camera model"],
  ["LensModel", "Lens"],
  ["FNumber", "Aperture"],
  ["ExposureTime", "Shutter"],
  ["ISO", "ISO"],
  ["FocalLength", "Focal length"],
  ["WhiteBalance", "White balance"],
  ["DateTimeOriginal", "Taken"],
]

function flattenExif(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, label] of EXIF_FIELDS) {
    const v = data[key]
    if (v == null) continue
    const s = formatExifValue(key, v)
    if (s) out[label] = s
  }
  return out
}

function formatExifValue(key: string, value: unknown): string {
  if (key === "FNumber" && typeof value === "number") return `f/${value}`
  if (key === "ExposureTime" && typeof value === "number") {
    return value < 1 ? `1/${Math.round(1 / value)}` : `${value}s`
  }
  if (key === "FocalLength" && typeof value === "number") return `${Math.round(value)}mm`
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return ""
}
