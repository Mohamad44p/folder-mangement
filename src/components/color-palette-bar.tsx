"use client"

import { Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface ColorPaletteBarProps {
  palette: string[] | undefined
  onPick?: (color: string) => void
  size?: "sm" | "md"
}

export function ColorPaletteBar({ palette, onPick, size = "sm" }: ColorPaletteBarProps) {
  const [copied, setCopied] = useState<string | null>(null)
  if (!palette || palette.length === 0) return null
  const swatchSize = size === "md" ? "size-6" : "size-3"
  return (
    <div className="flex gap-0.5">
      {palette.map((c) => (
        <button
          key={c}
          onClick={(e) => {
            e.stopPropagation()
            if (onPick) {
              onPick(c)
              return
            }
            try {
              navigator.clipboard.writeText(c)
              toast.success(`Copied ${c}`)
              setCopied(c)
              setTimeout(() => setCopied(null), 1500)
            } catch {}
          }}
          className={`${swatchSize} rounded-sm relative group`}
          style={{ backgroundColor: c }}
          title={c}
        >
          <span className="absolute inset-0 rounded-sm ring-1 ring-inset ring-white/10" />
          {copied === c && size === "md" && (
            <Check className="absolute inset-0 m-auto size-3 text-white drop-shadow" />
          )}
        </button>
      ))}
    </div>
  )
}
