"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type Density = "cozy" | "compact" | "spacious"
export type Theme = "dark" | "light"
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
    root.style.setProperty("--accent", settings.accent)
    root.style.setProperty(
      "--density-gap",
      settings.density === "compact" ? "0.5rem" : settings.density === "spacious" ? "1.5rem" : "1rem",
    )
    root.style.setProperty(
      "--density-card",
      settings.density === "compact" ? "0.75" : settings.density === "spacious" ? "1.05" : "1",
    )
    if (settings.reduceMotion) root.dataset.reduceMotion = "true"
    else delete root.dataset.reduceMotion
    root.dataset.theme = settings.theme
    root.lang = settings.language
    root.dir = settings.language === "ar" ? "rtl" : "ltr"
  }, [settings])

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
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider")
  return ctx
}
