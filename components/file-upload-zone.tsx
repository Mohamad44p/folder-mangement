"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { localizeNumber } from "@/lib/localize"
import { Upload, ImageIcon } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

interface FileUploadZoneProps {
  folderId: string
  compact?: boolean
}

export function FileUploadZone({ folderId, compact = false }: FileUploadZoneProps) {
  const { uploadFiles } = useFolders()
  const { t, lang } = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList)
      if (arr.length === 0) return
      setBusy(true)
      try {
        await uploadFiles(folderId, arr)
        toast.success(
          arr.length === 1
            ? t("upload.toastAddedOne", { name: arr[0].name })
            : t("upload.toastAddedN", { n: localizeNumber(arr.length, lang) }),
        )
      } catch {
        toast.error(t("toast.uploadFailed"))
      } finally {
        setBusy(false)
      }
    },
    [folderId, uploadFiles, t, lang],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setIsDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-xl border border-dashed transition-colors ${
        isDragging
          ? "border-white/40 bg-white/[0.06]"
          : "border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.18]"
      } ${compact ? "px-4 py-3" : "px-6 py-8"}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <div
        className={`flex items-center ${
          compact ? "gap-3" : "flex-col gap-2"
        } justify-center text-center`}
      >
        <div
          className={`flex items-center justify-center rounded-full bg-white/[0.06] ${
            compact ? "size-8" : "size-10"
          }`}
        >
          {busy ? (
            <ImageIcon className="size-4 text-white/40 animate-pulse" />
          ) : (
            <Upload className="size-4 text-white/60" />
          )}
        </div>
        <div className={compact ? "flex flex-col items-start" : ""}>
          <p className="text-sm text-white/80">
            {busy
              ? t("upload.reading")
              : isDragging
                ? t("upload.dropToUpload")
                : t("upload.clickOrDrop")}
          </p>
          {!compact && (
            <p className="text-xs text-white/40 mt-0.5">{t("upload.helperText")}</p>
          )}
        </div>
      </div>
    </div>
  )
}
