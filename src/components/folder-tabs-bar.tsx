"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { localizeTitle } from "@/lib/localize"
import { X } from "lucide-react"

export function FolderTabsBar() {
  const { tabs, activeTab, switchTab, removeTab, openFolder, openFolderId, getFolder } = useFolders()
  const { t } = useT()
  if (tabs.length <= 1) return null
  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-white/[0.06] bg-black/30 overflow-x-auto">
      {tabs.map((id) => {
        const folder = getFolder(id)
        if (!folder) return null
        const active = activeTab === id || openFolderId === id
        return (
          <div
            key={id}
            className={`group flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors shrink-0 ${
              active ? "bg-white/[0.08] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <button
              onClick={() => {
                switchTab(id)
                openFolder(id)
              }}
              className="flex items-center gap-1.5 max-w-[140px]"
            >
              <span className="text-xs">{folder.icon ?? "📁"}</span>
              <span className="text-[12px] truncate">{localizeTitle(folder, t)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeTab(id)
              }}
              className="size-4 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.1]"
              title={t("tabs.closeTab")}
            >
              <X className="size-2.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
