"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useSettings } from "./settings-context"
import { dictionaries, type TranslationKey } from "@/lib/i18n-dict"

interface I18nContextType {
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  lang: "en" | "ar"
  isRtl: boolean
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const { language } = useSettings()
  const value = useMemo<I18nContextType>(() => {
    const dict = dictionaries[language] ?? dictionaries.en
    const fallback = dictionaries.en
    const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
      let value = dict[key] ?? fallback[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
        }
      }
      return value
    }
    return { t, lang: language, isRtl: language === "ar" }
  }, [language])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useT must be used within I18nProvider")
  return ctx
}
