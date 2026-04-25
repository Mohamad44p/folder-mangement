"use client"

import * as ContextMenu from "@radix-ui/react-context-menu"
import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import {
  Star, Pin, Copy, Share2, Trash2, Lock, Unlock, Archive,
  Sparkles, Eye, Plus,
} from "lucide-react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import { aiSuggestCover } from "@/lib/ai-helpers"
import { library } from "@/lib/library"

export function FolderContextMenu({
  folderId,
  children,
}: {
  folderId: string
  children: ReactNode
}) {
  const {
    getFolder,
    toggleFolderFavorite,
    toggleFolderPin,
    duplicateFolder,
    setFolderLocked,
    archiveFolder,
    setShareDialogOpen,
    deleteFolder,
    setFolderCover,
    setFileAiTags,
    openFolder,
    addTab,
  } = useFolders()
  const { t } = useT()
  const folder = getFolder(folderId)
  if (!folder) return <>{children}</>

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-[300] min-w-[200px] rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-1.5">
          <Item icon={<Eye className="size-3.5" />} onSelect={() => openFolder(folderId)}>
            {t("action.open")}
          </Item>
          <Item icon={<Plus className="size-3.5" />} onSelect={() => addTab(folderId)}>
            {t("ctx.openInNewTab")}
          </Item>
          <Sep />
          <Item
            icon={<Star className={`size-3.5 ${folder.favorite ? "fill-yellow-300 text-yellow-300" : ""}`} />}
            onSelect={() => toggleFolderFavorite(folderId)}
          >
            {t(folder.favorite ? "action.unfavorite" : "action.favorite")}
          </Item>
          <Item
            icon={<Pin className={`size-3.5 ${folder.pinned ? "text-sky-300" : ""}`} />}
            onSelect={() => toggleFolderPin(folderId)}
          >
            {t(folder.pinned ? "action.unpin" : "action.pinToTop")}
          </Item>
          <Item
            icon={folder.locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
            onSelect={() => {
              setFolderLocked(folderId, !folder.locked)
              toast.success(t(folder.locked ? "action.unlocked" : "action.locked"))
            }}
          >
            {t(folder.locked ? "action.unlock" : "action.lock")}
          </Item>
          <Sep />
          <Item icon={<Copy className="size-3.5" />} onSelect={() => duplicateFolder(folderId)}>
            {t("action.duplicate")}
          </Item>
          <Item icon={<Share2 className="size-3.5" />} onSelect={() => setShareDialogOpen(folderId)}>
            {t("ctx.share")}
          </Item>
          <Item
            icon={<Sparkles className="size-3.5" />}
            onSelect={() => {
              const sug = aiSuggestCover(folder)
              if (sug) {
                setFolderCover(folderId, sug)
                toast.success(t("toast.coverSuggested"))
              }
              const untagged = (folder.files ?? []).filter(
                (f) => f.type === "image" && (f.aiTags?.length ?? 0) === 0,
              )
              if (untagged.length === 0) {
                toast.success(t("ctx.aiRanOn"))
                return
              }
              const tid = toast.loading(`Tagging ${untagged.length} image${untagged.length === 1 ? "" : "s"}…`)
              void Promise.allSettled(
                untagged.map((file) =>
                  library.ai.autoTag(file.id).then((res) => {
                    setFileAiTags(folderId, file.id, res.tags)
                  }),
                ),
              ).then((results) => {
                const ok = results.filter((r) => r.status === "fulfilled").length
                const failed = results.length - ok
                toast.dismiss(tid)
                if (ok > 0) toast.success(`Tagged ${ok} image${ok === 1 ? "" : "s"}`)
                if (failed > 0) {
                  const firstErr = (results.find((r) => r.status === "rejected") as
                    | PromiseRejectedResult
                    | undefined)?.reason
                  toast.error(`${failed} failed: ${(firstErr as Error)?.message ?? "no AI key set?"}`)
                }
              })
            }}
          >
            {t("ctx.runAiTagging")}
          </Item>
          <Sep />
          <Item icon={<Archive className="size-3.5" />} onSelect={() => {
            archiveFolder(folderId)
            toast.success(t("ctx.archived"))
          }}>
            {t("ctx.archive")}
          </Item>
          <Item
            icon={<Trash2 className="size-3.5" />}
            destructive
            onSelect={() => {
              deleteFolder(folderId)
              toast.success(t("toast.movedToTrashShort"))
            }}
          >
            {t("action.moveToTrash")}
          </Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

function Item({
  icon,
  children,
  onSelect,
  destructive,
}: {
  icon: ReactNode
  children: ReactNode
  onSelect: () => void
  destructive?: boolean
}) {
  return (
    <ContextMenu.Item
      onSelect={onSelect}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] outline-none cursor-pointer ${
        destructive
          ? "text-red-300 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-200"
          : "text-white/80 data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white"
      }`}
    >
      {icon}
      {children}
    </ContextMenu.Item>
  )
}

function Sep() {
  return <ContextMenu.Separator className="my-1 h-px bg-white/[0.06]" />
}
