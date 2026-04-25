"use client"

import { Folder, FileSearch, Inbox, Sparkles, Trash2 } from "lucide-react"
import type { ReactNode } from "react"
import { useT } from "@/contexts/i18n-context"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  variant?: "default" | "compact"
}

export function EmptyState({ icon, title, description, action, variant = "default" }: EmptyStateProps) {
  const isCompact = variant === "compact"
  return (
    <div
      className={`rounded-xl border border-dashed border-white/[0.08] text-center ${
        isCompact ? "py-6 px-4" : "py-14 px-6"
      }`}
    >
      <div
        className={`rounded-2xl bg-gradient-to-br from-sky-500/10 to-violet-500/10 border border-white/[0.08] flex items-center justify-center mx-auto mb-3 ${
          isCompact ? "size-9" : "size-14"
        }`}
      >
        {icon ?? <Inbox className={isCompact ? "size-4 text-white/40" : "size-6 text-white/40"} />}
      </div>
      <p className={`${isCompact ? "text-[13px]" : "text-[14px]"} text-white/70`}>{title}</p>
      {description && (
        <p className={`${isCompact ? "text-[11px]" : "text-[12px]"} text-white/40 mt-1`}>
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function EmptyFolders() {
  const { t } = useT()
  return (
    <EmptyState
      icon={<Folder className="size-6 text-white/40" />}
      title={t("empty.folders")}
      description={t("empty.foldersDesc")}
    />
  )
}

export function EmptySearch({ q }: { q: string }) {
  const { t } = useT()
  return (
    <EmptyState
      icon={<FileSearch className="size-6 text-white/40" />}
      title={t("empty.search", { q })}
      description={t("empty.searchDesc")}
    />
  )
}

export function EmptyTrash() {
  const { t } = useT()
  return (
    <EmptyState
      icon={<Trash2 className="size-6 text-white/40" />}
      title={t("trash.empty")}
      description={t("empty.trashDesc2")}
      variant="compact"
    />
  )
}

export function EmptySmart() {
  const { t } = useT()
  return (
    <EmptyState
      icon={<Sparkles className="size-5 text-violet-300" />}
      title={t("empty.smartNoMatches")}
      description={t("empty.smartNoMatchesDesc")}
    />
  )
}
