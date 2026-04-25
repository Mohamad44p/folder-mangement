"use client"

import * as ContextMenu from "@radix-ui/react-context-menu"
import { useFolders } from "@/contexts/folder-context"
import {
  Star, Pin, Pencil, Copy, ArrowRightLeft, Share2, Trash2, Lock, Unlock, Archive,
  Sparkles, Workflow, Eye, Plus,
} from "lucide-react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import { aiAutoTagFile, aiSuggestCover } from "@/lib/ai-mocks"

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
    setBulkRenameOpen,
    setFolderCover,
    setFileAiTags,
    openFolder,
    addTab,
  } = useFolders()
  const folder = getFolder(folderId)
  if (!folder) return <>{children}</>

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-[300] min-w-[200px] rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl p-1.5">
          <Item icon={<Eye className="size-3.5" />} onSelect={() => openFolder(folderId)}>
            Open
          </Item>
          <Item icon={<Plus className="size-3.5" />} onSelect={() => addTab(folderId)}>
            Open in new tab
          </Item>
          <Sep />
          <Item
            icon={<Star className={`size-3.5 ${folder.favorite ? "fill-yellow-300 text-yellow-300" : ""}`} />}
            onSelect={() => toggleFolderFavorite(folderId)}
          >
            {folder.favorite ? "Unfavorite" : "Favorite"}
          </Item>
          <Item
            icon={<Pin className={`size-3.5 ${folder.pinned ? "text-sky-300" : ""}`} />}
            onSelect={() => toggleFolderPin(folderId)}
          >
            {folder.pinned ? "Unpin" : "Pin to top"}
          </Item>
          <Item
            icon={folder.locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
            onSelect={() => {
              setFolderLocked(folderId, !folder.locked)
              toast.success(folder.locked ? "Unlocked" : "Locked")
            }}
          >
            {folder.locked ? "Unlock" : "Lock"}
          </Item>
          <Sep />
          <Item icon={<Copy className="size-3.5" />} onSelect={() => duplicateFolder(folderId)}>
            Duplicate
          </Item>
          <Item icon={<Share2 className="size-3.5" />} onSelect={() => setShareDialogOpen(folderId)}>
            Share...
          </Item>
          <Item
            icon={<Sparkles className="size-3.5" />}
            onSelect={() => {
              const sug = aiSuggestCover(folder)
              if (sug) {
                setFolderCover(folderId, sug)
                toast.success("Cover suggested")
              }
              for (const file of folder.files ?? []) {
                if ((file.aiTags?.length ?? 0) === 0) {
                  setFileAiTags(folderId, file.id, aiAutoTagFile(file))
                }
              }
              toast.success("AI ran on folder")
            }}
          >
            Run AI tagging
          </Item>
          <Sep />
          <Item icon={<Archive className="size-3.5" />} onSelect={() => {
            archiveFolder(folderId)
            toast.success("Archived")
          }}>
            Archive
          </Item>
          <Item
            icon={<Trash2 className="size-3.5" />}
            destructive
            onSelect={() => {
              deleteFolder(folderId)
              toast.success("Moved to trash")
            }}
          >
            Move to trash
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
