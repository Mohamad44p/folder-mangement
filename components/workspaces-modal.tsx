"use client"

import { useFolders } from "@/contexts/folder-context"
import { AnimatePresence, motion } from "framer-motion"
import { X, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { FOLDER_ICONS } from "@/lib/data"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

export function WorkspacesModal() {
  const {
    workspacesModalOpen,
    setWorkspacesModalOpen,
    workspaces,
    addWorkspace,
    renameWorkspace,
    deleteWorkspace,
  } = useFolders()
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("🏠")

  return (
    <AnimatePresence>
      {workspacesModalOpen && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setWorkspacesModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[480px] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center">
              <h3 className="text-[15px] font-semibold text-white">Workspaces</h3>
              <button
                onClick={() => setWorkspacesModalOpen(false)}
                className="ml-auto size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-3 space-y-1.5">
              {workspaces.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <span className="size-8 rounded-md bg-white/[0.06] flex items-center justify-center text-base">
                    {w.icon}
                  </span>
                  <input
                    value={w.name}
                    onChange={(e) => renameWorkspace(w.id, e.target.value)}
                    className="flex-1 bg-transparent text-[13px] text-white focus:outline-none"
                  />
                  {w.id !== "default" && (
                    <button
                      onClick={() => {
                        deleteWorkspace(w.id)
                        toast.success("Workspace deleted")
                      }}
                      className="size-7 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger className="w-[64px]">
                    <span className="text-base">{icon}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(["🏠", "💼", "🎨", "🚀", "🌍"].concat(FOLDER_ICONS))).map((e) => (
                      <SelectItem key={e} value={e}>
                        <span className="text-base mr-2">{e}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workspace name"
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-white/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) {
                      addWorkspace(name.trim(), icon)
                      toast.success("Workspace created")
                      setName("")
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (!name.trim()) return
                    addWorkspace(name.trim(), icon)
                    toast.success("Created")
                    setName("")
                  }}
                  className="px-3 rounded-lg bg-white text-black text-[12px] font-medium hover:bg-white/90 flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              </div>
              <p className="text-[11px] text-white/30 px-1 pt-2">
                Workspaces help separate distinct libraries (work vs. personal). Currently UI-only — switching does not change data scope.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
