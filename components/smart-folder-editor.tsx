"use client"

import { useFolders } from "@/contexts/folder-context"
import { FOLDER_ICONS, type SmartFolder, type SmartFolderField, type SmartFolderOp, type SmartFolderRule } from "@/lib/data"
import { AnimatePresence, motion } from "framer-motion"
import { X, Plus, Trash2, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const FIELD_OPTIONS: { value: SmartFolderField; label: string; ops: SmartFolderOp[] }[] = [
  { value: "tag", label: "Tag", ops: ["has", "contains"] },
  { value: "type", label: "Type", ops: ["is"] },
  { value: "favorite", label: "Favorite", ops: ["is"] },
  { value: "name", label: "Name", ops: ["contains"] },
  { value: "size", label: "Size (bytes)", ops: ["gt", "lt"] },
  { value: "uploaded", label: "Uploaded", ops: ["within-days"] },
]

const TYPE_VALUES = ["image", "video", "document", "other"]

const OP_LABELS: Record<SmartFolderOp, string> = {
  is: "is",
  has: "is",
  contains: "contains",
  gt: ">",
  lt: "<",
  "within-days": "within last (days)",
}

export function SmartFolderEditor() {
  const { smartFolderEditor, setSmartFolderEditor, smartFolders, addSmartFolder, updateSmartFolder } =
    useFolders()

  const [name, setName] = useState("")
  const [icon, setIcon] = useState("✨")
  const [matchAll, setMatchAll] = useState(true)
  const [rules, setRules] = useState<SmartFolderRule[]>([])

  const editing =
    smartFolderEditor?.mode === "edit"
      ? smartFolders.find((s) => s.id === smartFolderEditor.id)
      : undefined

  useEffect(() => {
    if (smartFolderEditor?.mode === "new") {
      setName("New smart folder")
      setIcon("✨")
      setMatchAll(true)
      setRules([{ field: "tag", op: "has", value: "" }])
    } else if (editing) {
      setName(editing.name)
      setIcon(editing.icon)
      setMatchAll(editing.matchAll)
      setRules(editing.rules)
    }
  }, [smartFolderEditor, editing])

  const handleSave = () => {
    const cleanRules = rules.filter((r) => {
      if (r.field === "favorite") return true
      return r.value !== "" && r.value !== undefined
    })
    if (cleanRules.length === 0) {
      toast.error("Add at least one rule")
      return
    }
    const payload: Omit<SmartFolder, "id"> = { name, icon, matchAll, rules: cleanRules }
    if (smartFolderEditor?.mode === "new") {
      addSmartFolder(payload)
      toast.success("Smart folder created")
    } else if (smartFolderEditor?.mode === "edit") {
      updateSmartFolder(smartFolderEditor.id, payload)
      toast.success("Smart folder updated")
    }
    setSmartFolderEditor(null)
  }

  return (
    <AnimatePresence>
      {smartFolderEditor && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSmartFolderEditor(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[600px] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="size-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles className="size-4 text-violet-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-white">
                  {smartFolderEditor?.mode === "new" ? "New smart folder" : "Edit smart folder"}
                </h3>
                <p className="text-[12px] text-white/40">Files matching these rules show up automatically.</p>
              </div>
              <button
                onClick={() => setSmartFolderEditor(null)}
                className="size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Name</div>
                <div className="flex gap-2">
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger className="w-[64px]">
                      <span className="text-base">{icon}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(["✨", "⭐", "🕒", "🗂️", "🎯", "🔥", "💡"].concat(FOLDER_ICONS))).map((e) => (
                        <SelectItem key={e} value={e}>
                          <span className="text-base mr-2">{e}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Match</div>
                <div className="flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06] w-fit">
                  <button
                    onClick={() => setMatchAll(true)}
                    className={`px-3 h-7 rounded-full text-[11px] transition-colors ${
                      matchAll ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                    }`}
                  >
                    All rules
                  </button>
                  <button
                    onClick={() => setMatchAll(false)}
                    className={`px-3 h-7 rounded-full text-[11px] transition-colors ${
                      !matchAll ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white"
                    }`}
                  >
                    Any rule
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Rules</div>
                <div className="space-y-2">
                  {rules.map((rule, idx) => {
                    const fieldDef = FIELD_OPTIONS.find((f) => f.value === rule.field)
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={rule.field}
                          onValueChange={(v) => {
                            const next = [...rules]
                            const newField = v as SmartFolderField
                            const newDef = FIELD_OPTIONS.find((f) => f.value === newField)
                            next[idx] = {
                              field: newField,
                              op: newDef?.ops[0] ?? "is",
                              value: newField === "favorite" ? true : "",
                            }
                            setRules(next)
                          }}
                        >
                          <SelectTrigger size="sm" className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_OPTIONS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={rule.op}
                          onValueChange={(v) => {
                            const next = [...rules]
                            next[idx] = { ...rule, op: v as SmartFolderOp }
                            setRules(next)
                          }}
                        >
                          <SelectTrigger size="sm" className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldDef?.ops.map((o) => (
                              <SelectItem key={o} value={o}>
                                {OP_LABELS[o]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {rule.field === "favorite" ? (
                          <Select
                            value={String(rule.value)}
                            onValueChange={(v) => {
                              const next = [...rules]
                              next[idx] = { ...rule, value: v === "true" }
                              setRules(next)
                            }}
                          >
                            <SelectTrigger size="sm" className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : rule.field === "type" ? (
                          <Select
                            value={String(rule.value) || "__pick"}
                            onValueChange={(v) => {
                              const next = [...rules]
                              next[idx] = { ...rule, value: v === "__pick" ? "" : v }
                              setRules(next)
                            }}
                          >
                            <SelectTrigger size="sm" className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__pick">— pick type —</SelectItem>
                              {TYPE_VALUES.map((v) => (
                                <SelectItem key={v} value={v}>
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <input
                            value={String(rule.value)}
                            onChange={(e) => {
                              const next = [...rules]
                              const v =
                                rule.field === "size" || rule.field === "uploaded"
                                  ? Number(e.target.value) || 0
                                  : e.target.value
                              next[idx] = { ...rule, value: v }
                              setRules(next)
                            }}
                            type={rule.field === "size" || rule.field === "uploaded" ? "number" : "text"}
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-white/20"
                          />
                        )}
                        <button
                          onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                          className="size-8 flex items-center justify-center rounded-full text-white/40 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={() => setRules([...rules, { field: "tag", op: "has", value: "" }])}
                  className="mt-2 px-3 py-1.5 rounded-full text-[12px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 hover:text-white flex items-center gap-1.5"
                >
                  <Plus className="size-3" />
                  Add rule
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                onClick={() => setSmartFolderEditor(null)}
                className="px-3 py-1.5 rounded-full text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-full text-[13px] font-medium text-black bg-white hover:bg-white/90"
              >
                {smartFolderEditor?.mode === "new" ? "Create" : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
