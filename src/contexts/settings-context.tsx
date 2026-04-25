"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { MotionConfig } from "framer-motion"

export type Density = "cozy" | "compact" | "spacious"
export type Theme = "dark" | "light" | "auto"
export type Language = "en" | "ar"

export const ACCENT_OPTIONS = [
  { id: "white", value: "#ffffff", label: "Default" },
  { id: "sky", value: "#38bdf8", label: "Sky" },
  { id: "violet", value: "#a78bfa", label: "Violet" },
  { id: "rose", value: "#fb7185", label: "Rose" },
  { id: "amber", value: "#fbbf24", label: "Amber" },
  { id: "emerald", value: "#34d399", label: "Emerald" },
  { id: "fuchsia", value: "#e879f9", label: "Fuchsia" },
] as const

interface Settings {
  accent: string
  density: Density
  reduceMotion: boolean
  theme: Theme
  language: Language
}

interface SettingsContextType extends Settings {
  setAccent: (v: string) => void
  setDensity: (v: Density) => void
  setReduceMotion: (v: boolean) => void
  setTheme: (v: Theme) => void
  setLanguage: (v: Language) => void
}

const SETTINGS_KEY = "folder-mgr:settings:v2"

const DEFAULT_SETTINGS: Settings = {
  accent: "#ffffff",
  density: "cozy",
  reduceMotion: false,
  theme: "dark",
  language: "en",
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Settings
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings, hydrated])

  useEffect(() => {
    const root = document.documentElement
    // Use a brand-specific custom property so we don't clobber Tailwind/shadcn's --accent token.
    root.style.setProperty("--accent-user", settings.accent)
    root.style.setProperty("--accent-user-soft", hexToRgba(settings.accent, 0.18))
    root.style.setProperty("--accent-user-ring", hexToRgba(settings.accent, 0.6))
    root.dataset.density = settings.density
    if (settings.reduceMotion) root.dataset.reduceMotion = "true"
    else delete root.dataset.reduceMotion
    root.lang = settings.language
    root.dir = settings.language === "ar" ? "rtl" : "ltr"
  }, [settings])

  // Apply theme separately so we can subscribe to OS-level dark/light changes
  // when the user picks 'auto'.
  useEffect(() => {
    const root = document.documentElement
    const apply = (theme: Theme) => {
      if (theme === "auto") {
        const prefersDark =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function"
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
            : true
        root.dataset.theme = prefersDark ? "dark" : "light"
      } else {
        root.dataset.theme = theme
      }
    }
    apply(settings.theme)
    if (settings.theme === "auto" && typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = () => apply("auto")
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }
    return undefined
  }, [settings.theme])

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setAccent: (v) => setSettings((s) => ({ ...s, accent: v })),
        setDensity: (v) => setSettings((s) => ({ ...s, density: v })),
        setReduceMotion: (v) => setSettings((s) => ({ ...s, reduceMotion: v })),
        setTheme: (v) => setSettings((s) => ({ ...s, theme: v })),
        setLanguage: (v) => setSettings((s) => ({ ...s, language: v })),
      }}
    >
      <MotionConfig reducedMotion={settings.reduceMotion ? "always" : "never"}>
        {children}
      </MotionConfig>
    </SettingsContext.Provider>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{3}|[a-f\d]{6})$/i.exec(hex.trim())
  if (!m) return `rgba(255,255,255,${alpha})`
  let h = m[1]
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider")
  return ctx
}
