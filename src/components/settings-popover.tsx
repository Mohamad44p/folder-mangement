"use client"

import * as Popover from "@radix-ui/react-popover"
import { useFolders } from "@/contexts/folder-context"
import { ACCENT_OPTIONS, useSettings, type Density, type Theme, type Language } from "@/contexts/settings-context"
import { useT } from "@/contexts/i18n-context"
import { Settings, Check, Sun, Moon, Languages } from "lucide-react"
import { AiKeysSection } from "./ai-keys-section"
import type { ReactNode } from "react"

const DENSITY_VALUES: Density[] = ["compact", "cozy", "spacious"]
const THEMES: Theme[] = ["dark", "light"]
const LANGUAGES: Language[] = ["en", "ar"]

export function SettingsPopover({ trigger }: { trigger?: ReactNode }) {
  const { settingsOpen, setSettingsOpen } = useFolders()
  const {
    accent,
    setAccent,
    density,
    setDensity,
    reduceMotion,
    setReduceMotion,
    theme,
    setTheme,
    language,
    setLanguage,
  } = useSettings()
  const { t } = useT()

  return (
    <Popover.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
      <Popover.Trigger asChild>
        {trigger ?? (
          <button
            className="size-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label={t("settings")}
          >
            <Settings className="size-3.5" />
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          side="right"
          sideOffset={6}
          className="z-[300] w-[320px] max-h-[80vh] overflow-y-auto rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-4 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Settings className="size-3.5 text-white/60" />
            <span className="text-[13px] font-semibold text-white">{t("settings")}</span>
          </div>

          {/* Theme */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{t("theme")}</div>
            <div className="flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              {THEMES.map((th) => {
                const Icon = th === "dark" ? Moon : Sun
                return (
                  <button
                    key={th}
                    onClick={() => setTheme(th)}
                    className={`flex-1 h-7 rounded-full text-[11px] transition-colors flex items-center justify-center gap-1.5 ${
                      theme === th ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                    }`}
                  >
                    <Icon className="size-3" />
                    {t(`theme.${th}` as const)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Language */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">
              <Languages className="size-3" />
              {t("language")}
            </div>
            <div className="flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`flex-1 h-7 rounded-full text-[11px] transition-colors ${
                    language === lang ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  {t(`language.${lang}` as const)}
                </button>
              ))}
            </div>
          </div>

          {/* Accent */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{t("accent")}</div>
            <div className="grid grid-cols-7 gap-1.5">
              {ACCENT_OPTIONS.map((o) => {
                const active = accent === o.value
                return (
                  <button
                    key={o.id}
                    onClick={() => setAccent(o.value)}
                    className={`size-7 rounded-full transition-all flex items-center justify-center ${
                      active ? "ring-2 ring-white scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: o.value }}
                    title={o.label}
                    aria-label={`Accent ${o.label}`}
                  >
                    {active && <Check className="size-3 text-black" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Density */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{t("density")}</div>
            <div className="flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              {DENSITY_VALUES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`flex-1 h-7 rounded-full text-[11px] transition-colors ${
                    density === d ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  {t(`density.${d}` as const)}
                </button>
              ))}
            </div>
          </div>

          {/* Reduce motion */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] text-white/80">{t("reduceMotion")}</div>
              <div className="text-[10px] text-white/40">{t("reduceMotion.desc")}</div>
            </div>
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                reduceMotion ? "accent-toggle-on" : "bg-white/[0.1]"
              }`}
              aria-pressed={reduceMotion}
              aria-label={t("reduceMotion")}
            >
              <span
                className={`block size-4 rounded-full transition-transform ${
                  reduceMotion ? "translate-x-4 bg-black/80" : "translate-x-0 bg-white"
                }`}
              />
            </button>
          </div>

          <AiKeysSection />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
