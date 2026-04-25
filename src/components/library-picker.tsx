import { useEffect, useState } from "react"
import { library } from "@/lib/library"
import { useT } from "@/contexts/i18n-context"

interface Props {
  onConfirmed: (libraryPath: string) => void
}

export function LibraryPicker({ onConfirmed }: Props) {
  const { t } = useT()
  const [defaultPath, setDefaultPath] = useState<string>("")
  const [chosen, setChosen] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void library.app.getLibraryPath().then((p) => {
      setDefaultPath(p)
      setChosen(p)
    })
  }, [])

  async function handleConfirm() {
    setError(null)
    setSubmitting(true)
    try {
      await library.app.setLibraryPath(chosen)
      onConfirmed(chosen)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#191919] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-[#1A1A1A] p-6">
        <h1 className="text-xl font-semibold text-white mb-2">{t("library.welcomeTitle")}</h1>
        <p className="text-sm text-white/60 mb-6">
          {t("library.welcomeBody")}
        </p>
        <label className="block text-xs uppercase tracking-wide text-white/40 mb-2">
          {t("library.location")}
        </label>
        <input
          type="text"
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
          className="w-full rounded-md bg-black/40 border border-white/[0.08] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          spellCheck={false}
          autoComplete="off"
        />
        {chosen !== defaultPath && defaultPath && (
          <button
            type="button"
            onClick={() => setChosen(defaultPath)}
            className="mt-2 text-[12px] text-white/40 hover:text-white/70"
          >
            {t("library.resetDefault")}
          </button>
        )}
        {error && <p className="mt-3 text-[12px] text-red-400">{error}</p>}
        <button
          type="button"
          disabled={submitting || !chosen.trim()}
          onClick={handleConfirm}
          className="mt-6 w-full rounded-full bg-white text-black text-sm font-medium py-2 hover:bg-white/90 disabled:opacity-50"
        >
          {submitting ? t("library.settingUp") : t("library.continue")}
        </button>
      </div>
    </div>
  )
}
