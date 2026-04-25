"use client"

import type { ActivityEntry, ActivityKind } from "@/lib/data"
import { useT } from "@/contexts/i18n-context"
import { formatDateLocalized, localizeNumber } from "@/lib/localize"
import {
  FilePlus,
  Pencil,
  Trash2,
  Move,
  RotateCcw,
  Tag,
  Share2,
  Star,
  StickyNote,
  Image as ImageIcon,
  Sparkles,
  Workflow,
  Lock,
  Unlock,
  Archive,
  MessageCircle,
  PenLine,
} from "lucide-react"

const ICONS: Record<ActivityKind, typeof Pencil> = {
  created: Sparkles,
  renamed: Pencil,
  uploaded: FilePlus,
  deleted: Trash2,
  moved: Move,
  restored: RotateCcw,
  tagged: Tag,
  shared: Share2,
  favorited: Star,
  noted: StickyNote,
  covered: ImageIcon,
  status: Workflow,
  locked: Lock,
  unlocked: Unlock,
  archived: Archive,
  commented: MessageCircle,
  annotated: PenLine,
}

export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  const { t, lang } = useT()

  const relTime = (iso: string): string => {
    try {
      const diff = Date.now() - new Date(iso).getTime()
      const min = Math.round(diff / 60_000)
      if (min < 1) return t("common.justNow")
      if (min < 60) return t("common.minutesAgo", { n: localizeNumber(min, lang) })
      const hr = Math.round(min / 60)
      if (hr < 24) return t("common.hoursAgo", { n: localizeNumber(hr, lang) })
      const day = Math.round(hr / 24)
      if (day < 30) return t("common.daysAgo", { n: localizeNumber(day, lang) })
      return formatDateLocalized(new Date(iso), t, lang)
    } catch {
      return ""
    }
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-white/40">{t("activity.empty")}</p>
      </div>
    )
  }
  return (
    <div className="space-y-0.5">
      {entries.map((e, i) => {
        const Icon = ICONS[e.kind] ?? Pencil
        return (
          <div
            key={e.id}
            className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
          >
            <div className="relative shrink-0">
              <div className="size-6 rounded-full bg-white/[0.06] flex items-center justify-center">
                <Icon className="size-3 text-white/60" />
              </div>
              {i < entries.length - 1 && (
                <span className="absolute left-1/2 top-6 bottom-[-8px] w-px bg-white/[0.05]" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="text-[12px] text-white/85">
                <span className="font-medium text-white">{e.actor}</span>{" "}
                <span className="text-white/60">{e.description}</span>
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{relTime(e.timestamp)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
