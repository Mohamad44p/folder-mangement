"use client"

import { Folder, FileSearch, Inbox, Sparkles, Trash2 } from "lucide-react"
import type { ReactNode } from "react"

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
  return (
    <EmptyState
      icon={<Folder className="size-6 text-white/40" />}
      title="No folders yet"
      description="Click + New to create one, or use a template."
    />
  )
}

export function EmptySearch({ q }: { q: string }) {
  return (
    <EmptyState
      icon={<FileSearch className="size-6 text-white/40" />}
      title={`No matches for "${q}"`}
      description="Try a different search term or clear the filter."
    />
  )
}

export function EmptyTrash() {
  return (
    <EmptyState
      icon={<Trash2 className="size-6 text-white/40" />}
      title="Trash is empty"
      description="Deleted folders show up here for 30 days."
      variant="compact"
    />
  )
}

export function EmptySmart() {
  return (
    <EmptyState
      icon={<Sparkles className="size-5 text-violet-300" />}
      title="No matches yet"
      description="Edit the rules or upload more files."
    />
  )
}
