"use client"

import * as Popover from "@radix-ui/react-popover"
import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { Check, Settings, ChevronDown } from "lucide-react"

const WORKSPACE_NAME_KEYS: Record<string, "workspace.personal"> = {
  Personal: "workspace.personal",
}

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, switchWorkspace, setWorkspacesModalOpen } = useFolders()
  const { t } = useT()
  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0]
  const localizeName = (n: string) => {
    const key = WORKSPACE_NAME_KEYS[n]
    return key ? t(key) : n
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/[0.04] text-white/80 transition-colors">
          <span className="size-6 rounded-md bg-white/[0.06] flex items-center justify-center text-sm">
            {active?.icon ?? "🏠"}
          </span>
          <span className="text-[13px] font-medium truncate flex-1 text-left">
            {active ? localizeName(active.name) : t("workspace.personal")}
          </span>
          <ChevronDown className="size-3 text-white/40" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[300] w-[240px] rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-1.5"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 px-2 py-1">{t("workspace.label")}</div>
          {workspaces.map((w) => {
            const isActive = w.id === activeWorkspaceId
            return (
              <button
                key={w.id}
                onClick={() => switchWorkspace(w.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                  isActive ? "bg-white/[0.06] text-white" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="text-base">{w.icon}</span>
                <span className="text-[12px] flex-1 text-left">{localizeName(w.name)}</span>
                {isActive && <Check className="size-3 text-emerald-400" />}
              </button>
            )
          })}
          <div className="my-1 h-px bg-white/[0.06]" />
          <button
            onClick={() => setWorkspacesModalOpen(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-white/70 hover:bg-white/[0.04] hover:text-white"
          >
            <Settings className="size-3.5" />
            <span className="text-[12px]">{t("workspace.manage")}</span>
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
