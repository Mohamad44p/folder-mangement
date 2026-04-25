"use client"

import { useFolders } from "@/contexts/folder-context"
import { exportLibraryAsJson, exportFolderAsZip } from "@/lib/zip-export"
import { AnimatePresence, motion } from "framer-motion"
import { X, Download, Upload, FileJson, Package } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

export function ExportModal() {
  const { exportModalOpen, setExportModalOpen, folders, getDescendantIds } = useFolders()
  const [exporting, setExporting] = useState(false)
  const rootFolders = folders.filter((f) => !f.deletedAt && f.parentId == null)

  const handleZipFolder = async (id: string) => {
    setExporting(true)
    try {
      const folder = folders.find((f) => String(f.id) === id)
      if (!folder) return
      const descIds = getDescendantIds(id)
      const descendants = folders.filter((f) => descIds.includes(String(f.id)))
      await exportFolderAsZip(folder, descendants)
      toast.success("ZIP downloaded")
    } catch (e) {
      toast.error("Export failed")
    } finally {
      setExporting(false)
    }
  }

  return (
    <AnimatePresence>
      {exportModalOpen && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setExportModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[560px] max-h-[80vh] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Download className="size-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">Export</h3>
                <p className="text-[12px] text-white/40">Download your library or any folder.</p>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="ml-auto size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <button
                onClick={() => {
                  exportLibraryAsJson(folders.filter((f) => !f.deletedAt))
                  toast.success("Library exported as JSON")
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-colors"
              >
                <div className="size-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <FileJson className="size-4 text-sky-300" />
                </div>
                <div>
                  <div className="text-[13px] text-white font-medium">Entire library as JSON</div>
                  <div className="text-[11px] text-white/40">All folders, files, smart folders, settings.</div>
                </div>
              </button>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 px-1">
                  Or export a specific folder as ZIP
                </div>
                <div className="space-y-1 max-h-[280px] overflow-y-auto">
                  {rootFolders.map((f) => (
                    <button
                      key={f.id}
                      disabled={exporting}
                      onClick={() => handleZipFolder(String(f.id))}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] text-left transition-colors disabled:opacity-40"
                    >
                      <span className="text-base">{f.icon ?? "📁"}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] text-white truncate">{f.title}</span>
                        <span className="block text-[11px] text-white/40 truncate">
                          {f.files?.length ?? 0} files · ZIP with metadata
                        </span>
                      </span>
                      <Package className="size-4 text-white/40" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ImportModal() {
  const { importModalOpen, setImportModalOpen, replaceLibrary, mergeLibrary } = useFolders()
  const [parsed, setParsed] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.folders || !Array.isArray(data.folders)) {
        setError("Invalid file: missing folders array")
        return
      }
      setParsed(data)
    } catch (e) {
      setError("Could not parse JSON")
    }
  }

  const reset = () => {
    setParsed(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <AnimatePresence>
      {importModalOpen && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setImportModalOpen(false)
              reset()
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[480px] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="size-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Upload className="size-4 text-violet-300" />
              </div>
              <h3 className="text-[15px] font-semibold text-white flex-1">Import library</h3>
              <button
                onClick={() => {
                  setImportModalOpen(false)
                  reset()
                }}
                className="size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {!parsed ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-6 py-8 rounded-xl border border-dashed border-white/[0.1] hover:border-white/[0.18] hover:bg-white/[0.04] text-center transition-colors"
                  >
                    <Upload className="size-5 text-white/60 mx-auto mb-2" />
                    <p className="text-[13px] text-white">Click to select JSON file</p>
                    <p className="text-[11px] text-white/40 mt-0.5">Exported from this app</p>
                  </button>
                  {error && <p className="text-[12px] text-red-400">{error}</p>}
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3 space-y-1.5">
                    <div className="text-[12px] text-white">
                      <span className="text-white/50">Folders:</span>{" "}
                      <span className="font-mono">{parsed.folders.length}</span>
                    </div>
                    {parsed.exportedAt && (
                      <div className="text-[11px] text-white/50">
                        Exported {new Date(parsed.exportedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        mergeLibrary(parsed.folders)
                        toast.success("Merged with current library")
                        setImportModalOpen(false)
                        reset()
                      }}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left"
                    >
                      <div className="text-[13px] text-white">Merge</div>
                      <div className="text-[11px] text-white/40">Add new folders, keep existing.</div>
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("Replace your entire library? This cannot be undone.")) return
                        replaceLibrary(parsed.folders)
                        toast.success("Library replaced")
                        setImportModalOpen(false)
                        reset()
                      }}
                      className="w-full px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-left"
                    >
                      <div className="text-[13px] text-red-200">Replace</div>
                      <div className="text-[11px] text-red-300/60">Wipe and import. Cannot undo.</div>
                    </button>
                    <button
                      onClick={reset}
                      className="w-full text-[11px] text-white/50 hover:text-white py-2"
                    >
                      Cancel
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
