"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, X, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { library } from "@/lib/library"
import { useT } from "@/contexts/i18n-context"
import { formatBytesLocalized, localizeNumber } from "@/lib/localize"
import type {
  UpdateAvailablePayload,
  UpdateProgressPayload,
  UpdateDownloadedPayload,
} from "@/lib/library/types"

type State =
  | { kind: "idle" }
  | { kind: "available"; version: string }
  | { kind: "downloading"; version: string; progress: UpdateProgressPayload | null }
  | { kind: "ready"; version: string }
  | { kind: "error"; message: string }

const DISMISSED_KEY = "folders.updateDismissed"

function isElectronEnv(): boolean {
  return typeof window !== "undefined" && !!window.api?.update
}

export function UpdateToast() {
  const { t, lang } = useT()
  const [state, setState] = useState<State>({ kind: "idle" })

  useEffect(() => {
    if (!isElectronEnv()) return

    const offAvailable = library.update.on(
      "update-available",
      (p: UpdateAvailablePayload) => {
        const dismissed = localStorage.getItem(DISMISSED_KEY)
        if (dismissed === p.version) return
        setState({ kind: "available", version: p.version })
      },
    )

    const offProgress = library.update.on("update-progress", (p) => {
      setState((prev) =>
        prev.kind === "downloading"
          ? { ...prev, progress: p }
          : prev.kind === "available"
            ? { kind: "downloading", version: prev.version, progress: p }
            : prev,
      )
    })

    const offDownloaded = library.update.on(
      "update-downloaded",
      (p: UpdateDownloadedPayload) => {
        setState({ kind: "ready", version: p.version })
        localStorage.removeItem(DISMISSED_KEY)
      },
    )

    const offError = library.update.on("update-error", (p) => {
      setState({ kind: "error", message: p.message })
    })

    return () => {
      offAvailable()
      offProgress()
      offDownloaded()
      offError()
    }
  }, [])

  const dismiss = () => {
    if (state.kind === "available" || state.kind === "downloading") {
      localStorage.setItem(DISMISSED_KEY, state.version)
    }
    setState({ kind: "idle" })
  }

  const startDownload = async () => {
    if (state.kind !== "available") return
    setState({ kind: "downloading", version: state.version, progress: null })
    try {
      await library.update.startDownload()
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message })
    }
  }

  const installNow = async () => {
    try {
      await library.update.installNow()
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message })
    }
  }

  if (state.kind === "idle") return null

  return (
    <AnimatePresence>
      <motion.div
        key={state.kind}
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="fixed bottom-5 right-5 z-[400] w-[340px] rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl overflow-hidden"
      >
        {state.kind === "available" && (
          <AvailableCard
            version={state.version}
            onDownload={startDownload}
            onLater={dismiss}
            t={t}
          />
        )}
        {state.kind === "downloading" && (
          <DownloadingCard
            version={state.version}
            progress={state.progress}
            onCancel={dismiss}
            t={t}
            lang={lang}
          />
        )}
        {state.kind === "ready" && (
          <ReadyCard
            version={state.version}
            onRestart={installNow}
            onLater={dismiss}
            t={t}
          />
        )}
        {state.kind === "error" && (
          <ErrorCard message={state.message} onDismiss={dismiss} t={t} />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

type T = (key: import("@/lib/i18n-dict").TranslationKey, vars?: Record<string, string | number>) => string

function AvailableCard({
  version,
  onDownload,
  onLater,
  t,
}: {
  version: string
  onDownload: () => void
  onLater: () => void
  t: T
}) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="size-9 rounded-full bg-[var(--accent-user-soft)] flex items-center justify-center flex-shrink-0">
          <Download className="size-4 text-[var(--accent-user)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white">
            {t("update.available.title")}
          </div>
          <div className="text-[12px] text-white/60 mt-0.5">
            {t("update.available.body", { version })}
          </div>
        </div>
        <button
          onClick={onLater}
          className="size-6 rounded text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center flex-shrink-0"
          aria-label={t("update.later")}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onDownload}
          className="flex-1 h-8 px-3 rounded-md bg-[var(--accent-user)] text-black text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          {t("update.download")}
        </button>
        <button
          onClick={onLater}
          className="h-8 px-3 rounded-md text-white/60 text-[12px] hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          {t("update.later")}
        </button>
      </div>
    </div>
  )
}

function DownloadingCard({
  version,
  progress,
  onCancel,
  t,
  lang,
}: {
  version: string
  progress: UpdateProgressPayload | null
  onCancel: () => void
  t: T
  lang: "en" | "ar"
}) {
  const percent = progress ? Math.max(0, Math.min(100, progress.percent)) : 0
  const transferredText = progress
    ? formatBytesLocalized(progress.transferred, t, lang)
    : ""
  const totalText = progress ? formatBytesLocalized(progress.total, t, lang) : ""
  const speedText = progress
    ? `${formatBytesLocalized(progress.bytesPerSecond, t, lang)}/s`
    : ""

  return (
    <div className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="size-9 rounded-full bg-[var(--accent-user-soft)] flex items-center justify-center flex-shrink-0">
          <RefreshCw className="size-4 text-[var(--accent-user)] animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white">
            {t("update.downloading")}
          </div>
          <div className="text-[12px] text-white/60 mt-0.5">v{version}</div>
        </div>
        <button
          onClick={onCancel}
          className="size-6 rounded text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center flex-shrink-0"
          aria-label={t("update.dismiss")}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2">
        <motion.div
          className="h-full bg-[var(--accent-user)] rounded-full"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>
          {progress
            ? `${transferredText} / ${totalText}`
            : t("update.checking")}
        </span>
        <span>
          {progress ? `${localizeNumber(Math.round(percent), lang)}% · ${speedText}` : ""}
        </span>
      </div>
    </div>
  )
}

function ReadyCard({
  version,
  onRestart,
  onLater,
  t,
}: {
  version: string
  onRestart: () => void
  onLater: () => void
  t: T
}) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="size-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="size-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white">
            {t("update.ready.title")}
          </div>
          <div className="text-[12px] text-white/60 mt-0.5">
            {t("update.ready.body", { version: `v${version}` })}
          </div>
        </div>
        <button
          onClick={onLater}
          className="size-6 rounded text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center flex-shrink-0"
          aria-label={t("update.later")}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRestart}
          className="flex-1 h-8 px-3 rounded-md bg-emerald-500 text-black text-[12px] font-medium hover:bg-emerald-400 transition-colors"
        >
          {t("update.restart")}
        </button>
        <button
          onClick={onLater}
          className="h-8 px-3 rounded-md text-white/60 text-[12px] hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          {t("update.later")}
        </button>
      </div>
    </div>
  )
}

function ErrorCard({
  message,
  onDismiss,
  t,
}: {
  message: string
  onDismiss: () => void
  t: T
}) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="size-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white">
            {t("update.error.title")}
          </div>
          <div className="text-[12px] text-white/60 mt-0.5 break-words">
            {message}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="size-6 rounded text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center flex-shrink-0"
          aria-label={t("update.dismiss")}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
