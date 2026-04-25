import JSZip from "jszip"
import type { Project } from "./data"

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",")
  if (parts.length !== 2) {
    return new Blob([dataUrl], { type: "text/plain" })
  }
  const meta = parts[0]
  const data = parts[1]
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "application/octet-stream"
  if (meta.includes(";base64")) {
    const bin = atob(data)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }
  return new Blob([decodeURIComponent(data)], { type: mime })
}

function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "_").trim() || "file"
}

export async function exportFolderAsZip(folder: Project, descendants: Project[]) {
  const zip = new JSZip()
  const root = zip.folder(safeFileName(folder.title))!
  root.file("_metadata.json", JSON.stringify(strip(folder), null, 2))
  for (const file of folder.files ?? []) {
    try {
      if (file.url.startsWith("data:")) {
        root.file(safeFileName(file.name), dataUrlToBlob(file.url))
      } else if (file.url.startsWith("/")) {
        const res = await fetch(file.url)
        const blob = await res.blob()
        root.file(safeFileName(file.name), blob)
      }
    } catch {
      // skip
    }
  }
  // Subfolders
  for (const sub of descendants) {
    const path = pathFor(folder, sub, descendants)
    const subFolder = root.folder(path)
    if (!subFolder) continue
    subFolder.file("_metadata.json", JSON.stringify(strip(sub), null, 2))
    for (const file of sub.files ?? []) {
      try {
        if (file.url.startsWith("data:")) {
          subFolder.file(safeFileName(file.name), dataUrlToBlob(file.url))
        } else if (file.url.startsWith("/")) {
          const res = await fetch(file.url)
          const blob = await res.blob()
          subFolder.file(safeFileName(file.name), blob)
        }
      } catch {}
    }
  }
  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${safeFileName(folder.title)}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function pathFor(root: Project, target: Project, all: Project[]): string {
  const parts: string[] = []
  let cur: Project | undefined = target
  const guard = new Set<string>()
  while (cur && !guard.has(String(cur.id)) && String(cur.id) !== String(root.id)) {
    guard.add(String(cur.id))
    parts.unshift(safeFileName(cur.title))
    cur = all.find((p) => String(p.id) === cur!.parentId)
  }
  return parts.join("/")
}

function strip(p: Project) {
  const { files, activity: _activity, ...rest } = p
  return {
    ...rest,
    fileCount: files?.length ?? 0,
    fileNames: (files ?? []).map((f) => f.name),
  }
}

export function exportLibraryAsJson(folders: Project[]) {
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), folders }, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `folder-library-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
