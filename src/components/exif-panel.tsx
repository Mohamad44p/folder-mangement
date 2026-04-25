"use client"

import { useT } from "@/contexts/i18n-context"
import { localizeNumber } from "@/lib/localize"
import type { TranslationKey } from "@/lib/i18n-dict"
import { Camera } from "lucide-react"

export function ExifPanel({ exif, dimensions }: { exif?: Record<string, string>; dimensions?: { width: number; height: number } }) {
  const { t, lang } = useT()
  if (!exif && !dimensions) return null
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
        <Camera className="size-3" />
        {t("exif.cameraInfo")}
      </div>
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04]">
        {dimensions && (
          <Row
            label={t("exif.dimensions")}
            value={`${localizeNumber(dimensions.width, lang)} × ${localizeNumber(dimensions.height, lang)}`}
          />
        )}
        {exif &&
          Object.entries(exif).map(([k, v]) => (
            // The map key is a TranslationKey (see flattenExif in image-lightbox);
            // legacy records may still contain a literal label, in which case
            // t() falls back to the key string itself.
            <Row key={k} label={t(k as TranslationKey)} value={v} />
          ))}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className="text-[12px] text-white/85 font-mono">{value}</span>
    </div>
  )
}
