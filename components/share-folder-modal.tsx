"use client"

import { useFolders } from "@/contexts/folder-context"
import type { SharePermission } from "@/lib/data"
import { AnimatePresence, motion } from "framer-motion"
import { X, Copy, Check, Globe, Eye, MessageCircle, Edit3, UserPlus, UserMinus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

const PERMISSIONS: { value: SharePermission; label: string; icon: typeof Eye; description: string }[] = [
  { value: "view", label: "Can view", icon: Eye, description: "View files only" },
  { value: "comment", label: "Can comment", icon: MessageCircle, description: "View and leave comments" },
  { value: "edit", label: "Can edit", icon: Edit3, description: "Full read/write access" },
]

export function ShareFolderModal() {
  const {
    shareDialogOpen,
    setShareDialogOpen,
    getFolder,
    shareFolder,
    updateSharePermission,
    addSharedWith,
    removeSharedWith,
    unshareFolder,
  } = useFolders()
  const [copied, setCopied] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")

  const folder = shareDialogOpen ? getFolder(shareDialogOpen) : undefined
  const share = folder?.share

  const handleCopy = () => {
    if (!share) return
    try {
      navigator.clipboard.writeText(share.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success("Link copied")
    } catch {}
  }

  const handleEnable = () => {
    if (!folder) return
    shareFolder(String(folder.id), "view")
    toast.success("Share enabled")
  }

  const handleInvite = () => {
    if (!folder || !inviteName.trim()) return
    addSharedWith(String(folder.id), inviteName.trim(), inviteEmail.trim() || undefined)
    toast.success(`Invited ${inviteName}`)
    setInviteName("")
    setInviteEmail("")
  }

  return (
    <AnimatePresence>
      {shareDialogOpen && folder && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShareDialogOpen(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[520px] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div
                className="size-9 rounded-lg flex items-center justify-center text-base"
                style={{ backgroundColor: folder.color ?? "rgba(255,255,255,0.06)" }}
              >
                {folder.icon ?? "📁"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold text-white truncate">Share "{folder.title}"</h3>
                <p className="text-[12px] text-white/40">Invite people or generate a link.</p>
              </div>
              <button
                onClick={() => setShareDialogOpen(null)}
                className="size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {!share ? (
                <button
                  onClick={handleEnable}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-left transition-colors flex items-center gap-3"
                >
                  <Globe className="size-4 text-white/60" />
                  <div className="flex-1">
                    <div className="text-[13px] text-white">Enable sharing</div>
                    <div className="text-[11px] text-white/40">Generate a shareable link.</div>
                  </div>
                </button>
              ) : (
                <>
                  {/* Link */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Link</div>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={share.link}
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/80 font-mono focus:outline-none"
                      />
                      <button
                        onClick={handleCopy}
                        className="px-3 rounded-lg bg-white text-black hover:bg-white/90 transition-colors flex items-center gap-1.5 text-[12px] font-medium"
                      >
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Permission */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
                      Anyone with the link
                    </div>
                    <div className="space-y-1.5">
                      {PERMISSIONS.map((p) => {
                        const active = share.permission === p.value
                        return (
                          <button
                            key={p.value}
                            onClick={() => updateSharePermission(String(folder.id), p.value)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                              active
                                ? "bg-white/[0.06] border-white/[0.15]"
                                : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
                            }`}
                          >
                            <div
                              className={`size-7 rounded-md flex items-center justify-center ${
                                active ? "bg-white/[0.1]" : "bg-white/[0.04]"
                              }`}
                            >
                              <p.icon className="size-3.5 text-white/70" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-[12px] text-white">{p.label}</div>
                              <div className="text-[10px] text-white/40">{p.description}</div>
                            </div>
                            {active && (
                              <div className="size-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                <Check className="size-2.5 text-emerald-300" />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Invite */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
                      Invite people
                    </div>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Name"
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      />
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      />
                      <button
                        onClick={handleInvite}
                        disabled={!inviteName.trim()}
                        className="px-3 rounded-full bg-white text-black text-[12px] font-medium hover:bg-white/90 disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <UserPlus className="size-3.5" />
                        Invite
                      </button>
                    </div>
                    {share.sharedWith.length > 0 && (
                      <div className="space-y-1">
                        {share.sharedWith.map((p) => (
                          <div
                            key={p.name}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02]"
                          >
                            <div
                              className="size-7 rounded-full flex items-center justify-center text-[12px] font-semibold text-white"
                              style={{
                                background: `linear-gradient(135deg, hsl(${(p.name.charCodeAt(0) * 13) % 360}, 60%, 40%), hsl(${(p.name.charCodeAt(0) * 17 + 60) % 360}, 60%, 40%))`,
                              }}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] text-white truncate">{p.name}</div>
                              {p.email && <div className="text-[10px] text-white/40 truncate">{p.email}</div>}
                            </div>
                            <button
                              onClick={() => removeSharedWith(String(folder.id), p.name)}
                              className="size-7 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <UserMinus className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex justify-end">
                    <button
                      onClick={() => {
                        unshareFolder(String(folder.id))
                        toast.success("Sharing disabled")
                      }}
                      className="px-3 py-1.5 rounded-full text-[12px] text-white/60 hover:text-red-400 hover:bg-red-500/10"
                    >
                      Stop sharing
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
