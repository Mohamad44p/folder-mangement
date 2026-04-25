import { useEffect, useState } from "react"
import { Sparkles, Eye, EyeOff, Check, Trash2 } from "lucide-react"
import { library } from "@/lib/library"
import type { AiProvider } from "@/lib/library/types"
import { useT } from "@/contexts/i18n-context"

interface ProviderInfo {
  id: AiProvider
  // Brand names (OpenRouter, Anthropic, OpenAI) stay as-is across languages.
  label: string
  placeholder: string
  helpUrl: string
}

interface ProviderInfoExtended extends ProviderInfo {
  // Hint that lives next to the brand name — translated via dictionary key.
  hintKey?: "aiKeys.openRouterHint"
}

const PROVIDERS: ProviderInfoExtended[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    placeholder: "sk-or-...",
    helpUrl: "https://openrouter.ai/keys",
    hintKey: "aiKeys.openRouterHint",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
  },
]

type PreferredOption = "auto" | AiProvider

// "Auto" is the only label that needs translating — brand names stay literal.
const PREFERRED_OPTIONS: { id: PreferredOption; label: string }[] = [
  { id: "auto", label: "" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "openrouter", label: "OpenRouter" },
]

interface KeyState {
  has: boolean
  value: string
  showing: boolean
  saving: boolean
}

export function AiKeysSection() {
  const { t } = useT()
  const [state, setState] = useState<Record<AiProvider, KeyState>>({
    openrouter: { has: false, value: "", showing: false, saving: false },
    anthropic: { has: false, value: "", showing: false, saving: false },
    openai: { has: false, value: "", showing: false, saving: false },
  })
  const [preferred, setPreferred] = useState<PreferredOption>("auto")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        for (const p of PROVIDERS) {
          const status = await library.ai.getKeyStatus(p.id)
          if (cancelled) return
          setState((prev) => ({
            ...prev,
            [p.id]: { ...prev[p.id], has: status.has },
          }))
        }
        const current = await library.ai.getPreferredProvider()
        if (cancelled) return
        setPreferred(current ?? "auto")
      } catch {
        // window.api.ai unavailable in non-electron — keep all defaults.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function changePreferred(next: PreferredOption) {
    const previous = preferred
    setPreferred(next)
    try {
      await library.ai.setPreferredProvider(next === "auto" ? null : next)
    } catch (err) {
      console.error("Failed to save preferred provider:", err)
      setPreferred(previous)
    }
  }

  async function save(p: AiProvider) {
    const value = state[p].value.trim()
    if (!value) return
    setState((prev) => ({ ...prev, [p]: { ...prev[p], saving: true } }))
    try {
      await library.ai.setKey(p, value)
      setState((prev) => ({
        ...prev,
        [p]: { has: true, value: "", showing: false, saving: false },
      }))
    } catch (err) {
      console.error("Failed to save key:", err)
      setState((prev) => ({ ...prev, [p]: { ...prev[p], saving: false } }))
    }
  }

  async function remove(p: AiProvider) {
    setState((prev) => ({ ...prev, [p]: { ...prev[p], saving: true } }))
    try {
      await library.ai.deleteKey(p)
      setState((prev) => ({
        ...prev,
        [p]: { has: false, value: "", showing: false, saving: false },
      }))
      // If the removed key was the preferred one, drop the preference so we
      // don't keep pointing at a key that no longer exists.
      if (preferred === p) {
        await changePreferred("auto")
      }
    } catch {
      setState((prev) => ({ ...prev, [p]: { ...prev[p], saving: false } }))
    }
  }

  const hasAnyKey = PROVIDERS.some((p) => state[p.id].has)

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">
        <Sparkles className="size-3" />
        {t("aiKeys.title")}
      </div>

      {hasAnyKey && (
        <div className="mb-3 rounded-md border border-white/[0.06] p-2">
          <div className="text-[11px] text-white/60 mb-1.5">
            {t("aiKeys.useFor")}
          </div>
          <div className="flex flex-wrap gap-1">
            {PREFERRED_OPTIONS.map((opt) => {
              const active = preferred === opt.id
              const disabled =
                opt.id !== "auto" && !state[opt.id as AiProvider].has
              const visibleLabel = opt.id === "auto" ? t("aiKeys.optAuto") : opt.label
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (!disabled && !active) void changePreferred(opt.id)
                  }}
                  disabled={disabled}
                  className={
                    "px-2 h-6 rounded-full text-[11px] border transition-colors " +
                    (active
                      ? "bg-white text-black border-white"
                      : disabled
                        ? "bg-transparent text-white/25 border-white/[0.06] cursor-not-allowed"
                        : "bg-white/[0.04] text-white/70 border-white/[0.08] hover:bg-white/[0.08] hover:text-white")
                  }
                  title={
                    disabled
                      ? t("aiKeys.preferAddKeyHint", { provider: visibleLabel })
                      : opt.id === "auto"
                        ? t("aiKeys.preferAutoHint")
                        : undefined
                  }
                >
                  {visibleLabel}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {PROVIDERS.map((p) => {
          const s = state[p.id]
          return (
            <div key={p.id} className="rounded-md border border-white/[0.06] p-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="min-w-0">
                  <span className="text-[12px] text-white/80">{p.label}</span>
                  {p.hintKey && (
                    <p className="text-[10px] text-white/40 leading-tight truncate">
                      {t(p.hintKey)}
                    </p>
                  )}
                </div>
                {s.has ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
                    <Check className="size-3" /> {t("aiKeys.stored")}
                  </span>
                ) : (
                  <a
                    href={p.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-white/40 hover:text-white/70 underline shrink-0"
                  >
                    {t("aiKeys.getKey")}
                  </a>
                )}
              </div>
              <div className="flex gap-1">
                <input
                  type={s.showing ? "text" : "password"}
                  value={s.value}
                  placeholder={s.has ? "••••••••" : p.placeholder}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], value: e.target.value },
                    }))
                  }
                  className="flex-1 min-w-0 rounded bg-black/40 border border-white/[0.08] px-2 py-1 text-[11px] text-white outline-none focus:border-white/30"
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], showing: !prev[p.id].showing },
                    }))
                  }
                  className="size-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/[0.06]"
                  aria-label={s.showing ? t("aria.hide") : t("aria.show")}
                >
                  {s.showing ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
                <button
                  type="button"
                  disabled={s.saving || !s.value.trim()}
                  onClick={() => save(p.id)}
                  className="px-2 h-7 rounded text-[11px] bg-white text-black disabled:opacity-30 hover:bg-white/90"
                >
                  {t("aiKeys.save")}
                </button>
                {s.has && (
                  <button
                    type="button"
                    disabled={s.saving}
                    onClick={() => remove(p.id)}
                    className="size-7 flex items-center justify-center rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                    aria-label={t("aiKeys.removeKey")}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
        <p className="text-[10px] text-white/40 leading-snug">
          {t("aiKeys.encryptedNote")}
        </p>
      </div>
    </div>
  )
}
