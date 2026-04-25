import { useEffect, useState } from "react"
import { Sparkles, Eye, EyeOff, Check, Trash2 } from "lucide-react"
import { library } from "@/lib/library"
import type { AiProvider } from "@/lib/library/types"

interface ProviderInfo {
  id: AiProvider
  label: string
  placeholder: string
  helpUrl: string
}

const PROVIDERS: ProviderInfo[] = [
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

interface KeyState {
  has: boolean
  value: string
  showing: boolean
  saving: boolean
}

export function AiKeysSection() {
  const [state, setState] = useState<Record<AiProvider, KeyState>>({
    anthropic: { has: false, value: "", showing: false, saving: false },
    openai: { has: false, value: "", showing: false, saving: false },
    google: { has: false, value: "", showing: false, saving: false },
  })

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
      } catch {
        // window.api.ai unavailable in non-electron — keep all defaults.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
    } catch {
      setState((prev) => ({ ...prev, [p]: { ...prev[p], saving: false } }))
    }
  }

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">
        <Sparkles className="size-3" />
        AI provider keys
      </div>
      <div className="space-y-2">
        {PROVIDERS.map((p) => {
          const s = state[p.id]
          return (
            <div key={p.id} className="rounded-md border border-white/[0.06] p-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-white/80">{p.label}</span>
                {s.has ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <Check className="size-3" /> stored
                  </span>
                ) : (
                  <a
                    href={p.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-white/40 hover:text-white/70 underline"
                  >
                    get a key
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
                  aria-label={s.showing ? "Hide" : "Show"}
                >
                  {s.showing ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
                <button
                  type="button"
                  disabled={s.saving || !s.value.trim()}
                  onClick={() => save(p.id)}
                  className="px-2 h-7 rounded text-[11px] bg-white text-black disabled:opacity-30 hover:bg-white/90"
                >
                  Save
                </button>
                {s.has && (
                  <button
                    type="button"
                    disabled={s.saving}
                    onClick={() => remove(p.id)}
                    className="size-7 flex items-center justify-center rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                    aria-label="Remove key"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
        <p className="text-[10px] text-white/40 leading-snug">
          Keys are stored locally and encrypted via your OS keychain. They never leave
          your device except as direct calls to the chosen provider.
        </p>
      </div>
    </div>
  )
}
