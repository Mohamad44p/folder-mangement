"use client"

import { useFolders } from "@/contexts/folder-context"
import { describeSmartFolder, evaluateSmartFolder } from "@/lib/smart-folder-engine"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  Sparkles,
  Pencil,
  Image as ImageIcon,
  File as FileIcon,
  Film,
  FileText,
  Star,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { useMemo } from "react"
import { toast } from "sonner"

const FILE_ICONS = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  other: FileIcon,
} as const

function formatBytes(n?: number): string {
  if (!n) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function SmartFolderView() {
  const {
    openSmartFolderId,
    openSmartFolder,
    smartFolders,
    folders,
    setSmartFolderEditor,
    deleteSmartFolder,
    openLightbox,
    openFolder: openParentFolder,
    toggleFileFavorite,
  } = useFolders()

  const smart = useMemo(
    () => smartFolders.find((s) => s.id === openSmartFolderId),
    [openSmartFolderId, smartFolders],
  )

  const result = useMemo(() => {
    if (!smart) return { files: [], folders: [] }
    return evaluateSmartFolder(smart, folders)
  }, [smart, folders])

  return (
    <AnimatePresence>
      {smart && (
        <motion.div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => openSmartFolder(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[940px] max-h-[90vh] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="size-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl">
                {smart.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-white truncate">{smart.name}</h3>
                  <span className="px-1.5 py-0.5 rounded-full bg-violet-500/10 text-[10px] text-violet-200 border border-violet-500/20 flex items-center gap-1">
                    <Sparkles className="size-2.5" />
                    Smart
                  </span>
                </div>
                <div className="text-[11px] text-white/40 truncate">{describeSmartFolder(smart)}</div>
              </div>
              <button
                onClick={() => setSmartFolderEditor({ mode: "edit", id: smart.id })}
                className="h-8 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[12px] text-white/70 hover:text-white flex items-center gap-1.5"
              >
                <Pencil className="size-3" />
                Edit
              </button>
              <button
                onClick={() => {
                  deleteSmartFolder(smart.id)
                  openSmartFolder(null)
                  toast.success("Smart folder deleted")
                }}
                className="size-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-400"
              >
                <Trash2 className="size-3.5" />
              </button>
              <button
                onClick={() => openSmartFolder(null)}
                className="size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {result.files.length === 0 ? (
                <div className="text-center py-16">
                  <div className="size-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="size-5 text-white/30" />
                  </div>
                  <p className="text-sm text-white/50">No files match these rules.</p>
                  <p className="text-[12px] text-white/30 mt-1">
                    Edit the rules or upload more files.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-[11px] uppercase tracking-wider text-white/40 mb-3">
                    {result.files.length} matching file{result.files.length === 1 ? "" : "s"}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {result.files.map(({ file, folderId, folderTitle }) => {
                      const Icon = FILE_ICONS[file.type] ?? FileIcon
                      return (
                        <div
                          key={`${folderId}-${file.id}`}
                          className="group relative rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-white/[0.14] transition-colors"
                        >
                          <div
                            className="aspect-[4/5] relative bg-black/40 overflow-hidden cursor-pointer"
                            onClick={() => file.type === "image" && openLightbox(folderId, file.id)}
                          >
                            {file.type === "image" ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Icon className="size-10 text-white/30" />
                              </div>
                            )}
                            {file.favorite && (
                              <div className="absolute top-2 right-2 size-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
                                <Star className="size-3 text-yellow-300 fill-yellow-300" />
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFileFavorite(folderId, file.id)
                                }}
                                className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-yellow-300 backdrop-blur-sm"
                              >
                                <Star className={`size-3 ${file.favorite ? "fill-yellow-300" : ""}`} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openParentFolder(folderId)
                                }}
                                className="size-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm"
                                title="Open folder"
                              >
                                <ExternalLink className="size-3" />
                              </button>
                            </div>
                          </div>
                          <div className="p-2.5">
                            <p className="text-[12px] text-white/80 truncate">{file.name}</p>
                            <button
                              onClick={() => openParentFolder(folderId)}
                              className="text-[10px] text-white/40 hover:text-white truncate flex items-center gap-1"
                            >
                              {folderTitle}
                            </button>
                            <div className="flex justify-between mt-0.5 text-[10px] text-white/40">
                              <span>{formatBytes(file.size)}</span>
                              <span className="uppercase">{file.type}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
