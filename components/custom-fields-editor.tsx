"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"

export function CustomFieldsEditor({ folderId }: { folderId: string }) {
  const { getFolder, setCustomField, removeCustomField } = useFolders()
  const { t } = useT()
  const folder = getFolder(folderId)
  const fields = folder?.customFields ?? {}
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{t("customFields.title")}</div>
      {Object.entries(fields).length === 0 && (
        <p className="text-[11px] text-white/30 italic">{t("customFields.empty2")}</p>
      )}
      {Object.entries(fields).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="text-[11px] text-white/60 min-w-[80px] uppercase tracking-wide">{k}</span>
          <input
            value={v}
            onChange={(e) => setCustomField(folderId, k, e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[12px] text-white focus:outline-none focus:border-white/20"
          />
          <button
            onClick={() => removeCustomField(folderId, k)}
            className="size-6 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder={t("customFields.keyPlaceholder")}
          className="w-24 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-white/20"
        />
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={t("customFields.valuePlaceholder")}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-white/20"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newKey.trim() && newValue.trim()) {
              setCustomField(folderId, newKey.trim(), newValue.trim())
              setNewKey("")
              setNewValue("")
            }
          }}
        />
        <button
          onClick={() => {
            if (!newKey.trim() || !newValue.trim()) return
            setCustomField(folderId, newKey.trim(), newValue.trim())
            setNewKey("")
            setNewValue("")
          }}
          className="size-7 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06]"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  )
}
