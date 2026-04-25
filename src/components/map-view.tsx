"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import type { FolderFile } from "@/lib/data"
import { useMemo, useState } from "react"

interface MapViewProps {
  folderId: string
  files: FolderFile[]
}

// Lat/Lng → percentage on equirectangular map
function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * 100,
    y: ((90 - lat) / 180) * 100,
  }
}

export function MapView({ folderId, files }: MapViewProps) {
  const { openLightbox } = useFolders()
  const { t } = useT()
  const [hover, setHover] = useState<string | null>(null)

  const points = useMemo(
    () =>
      files
        .filter((f) => f.geo)
        .map((f) => ({ file: f, point: project(f.geo!.lat, f.geo!.lng) })),
    [files],
  )

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.08] py-10 text-center">
        <p className="text-sm text-white/40">{t("map.empty")}</p>
        <p className="text-[12px] text-white/30 mt-1">{t("map.emptyDesc")}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-[#0c1020] relative aspect-[2/1]">
      {/* Stylized world map (continent silhouettes via simple SVG paths) */}
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="var(--svg-grid)" strokeWidth="0.1" />
          </pattern>
        </defs>
        <rect width="100" height="50" fill="url(#grid)" />
        {/* Equator */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="var(--svg-line)" strokeWidth="0.2" />
        {/* Prime meridian */}
        <line x1="50" y1="0" x2="50" y2="50" stroke="var(--svg-line)" strokeWidth="0.2" />
        {/* Stylized continent blobs */}
        <g fill="var(--svg-fill)" stroke="var(--svg-stroke)" strokeWidth="0.1">
          <ellipse cx="22" cy="20" rx="8" ry="9" />
          <ellipse cx="20" cy="35" rx="5" ry="9" />
          <ellipse cx="50" cy="20" rx="9" ry="8" />
          <ellipse cx="55" cy="35" rx="6" ry="6" />
          <ellipse cx="75" cy="22" rx="10" ry="8" />
          <ellipse cx="82" cy="38" rx="5" ry="4" />
        </g>
      </svg>

      {/* Pins */}
      {points.map(({ file, point }) => (
        <button
          key={file.id}
          onMouseEnter={() => setHover(file.id)}
          onMouseLeave={() => setHover(null)}
          onClick={() => file.type === "image" && openLightbox(folderId, file.id)}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <div className="relative">
            <div
              className={`size-3 rounded-full bg-sky-400 shadow-lg shadow-sky-500/40 transition-transform ${
                hover === file.id ? "scale-150" : "scale-100"
              }`}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full bg-sky-400 animate-ping opacity-30" />
          </div>
          {hover === file.id && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-black/90 border border-white/[0.08] text-[10px] text-white whitespace-nowrap z-10">
              <div className="font-medium">{file.name}</div>
              <div className="text-white/50 font-mono">
                {file.geo!.lat.toFixed(2)}, {file.geo!.lng.toFixed(2)}
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
