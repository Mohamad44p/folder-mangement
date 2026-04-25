"use client"

import { useFolders } from "@/contexts/folder-context"
import { AnimatePresence, motion } from "framer-motion"
import { X, RotateCcw, Keyboard } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { SHORTCUTS, formatKeys } from "@/lib/keyboard-shortcuts"

export function ShortcutsModal() {
  const { shortcutsModalOpen, setShortcutsModalOpen, customShortcuts, setShortcut, resetShortcuts } =
    useFolders()
  const [editing, setEditing] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string>("")

  useEffect(() => {
    if (!editing) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      const parts: string[] = []
      if (e.metaKey || e.ctrlKey) parts.push("Mod")
      if (e.shiftKey) parts.push("Shift")
      if (e.altKey) parts.push("Alt")
      if (e.key === "Escape") {
        setEditing(null)
        return
      }
      if (
        e.key === "Meta" ||
        e.key === "Control" ||
        e.key === "Shift" ||
        e.key === "Alt"
      ) {
        return
      }
      const key = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key
      parts.push(key)
      const combo = parts.join("+")
      setShortcut(editing, combo)
      setPressed(combo)
      setTimeout(() => {
        setEditing(null)
        setPressed("")
      }, 400)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [editing, setShortcut])

  return (
    <AnimatePresence>
      {shortcutsModalOpen && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShortcutsModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[560px] max-h-[85vh] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
              <Keyboard className="size-4 text-white/60" />
              <h3 className="text-[15px] font-semibold text-white">Keyboard shortcuts</h3>
              <button
                onClick={() => {
                  resetShortcuts()
                  toast.success("Shortcuts reset")
                }}
                className="ml-auto h-7 px-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-white/70 hover:text-white border border-white/[0.06] flex items-center gap-1"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
              <button
                onClick={() => setShortcutsModalOpen(false)}
                className="size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {Array.from(new Set(SHORTCUTS.map((s) => s.category))).map((cat) => (
                <div key={cat}>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 px-2">{cat}</div>
                  <div className="space-y-0.5">
                    {SHORTCUTS.filter((s) => s.category === cat).map((s) => {
                      const keys = customShortcuts[s.id] ?? s.defaultKeys
                      const isEditing = editing === s.id
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.02]"
                        >
                          <span className="text-[12px] text-white/85 flex-1">{s.label}</span>
                          <button
                            onClick={() => setEditing(s.id)}
                            className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                              isEditing
                                ? "bg-sky-500/20 border-sky-400/40 text-sky-200 animate-pulse"
                                : "bg-white/[0.04] border-white/[0.08] text-white/80 hover:bg-white/[0.08]"
                            }`}
                          >
                            {isEditing ? "Press keys..." : formatKeys(keys)}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
