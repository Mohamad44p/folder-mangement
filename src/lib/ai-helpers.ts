/**
 * Synchronous helpers around AI-derived data. Real model calls live in the
 * main process (electron/ipc/ai-real.ts) and are invoked via library.ai.*.
 * These helpers either read previously-persisted results off the file/folder
 * records or compute a useful answer locally from real file properties.
 */

import type { FolderFile, Project } from "./data"

export function aiAutoTagFile(file: FolderFile): { tag: string; confidence: number }[] {
  // Real: returns the AI-tags persisted on the file record (populated via
  // electron/ipc/ai-real.ts after a real provider call). Empty array when
  // tags have not been generated yet.
  return file.aiTags ?? []
}

export function aiDescribeFolder(folder: Project, subfolders: Project[]): string {
  // Real: composes a factual description from the actual folder contents.
  // For an LLM-generated description, callers should use
  // `window.api.ai.describeFolder(folderId)` instead.
  const files = folder.files ?? []
  const parts: string[] = []

  if (files.length === 0 && subfolders.length === 0) {
    return "Empty folder."
  }

  if (files.length > 0) {
    const counts = new Map<string, number>()
    for (const f of files) counts.set(f.type, (counts.get(f.type) ?? 0) + 1)
    const typeStr = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${n} ${t}${n === 1 ? "" : "s"}`)
      .join(", ")
    parts.push(`Contains ${typeStr}`)
  }

  if (subfolders.length > 0) {
    const previewNames = subfolders
      .slice(0, 3)
      .map((s) => s.title)
      .filter(Boolean)
      .join(", ")
    parts.push(
      `organized into ${subfolders.length} ${
        subfolders.length === 1 ? "subfolder" : "subfolders"
      }${previewNames ? `: ${previewNames}` : ""}${subfolders.length > 3 ? "…" : ""}`,
    )
  }

  const allTags = new Set<string>()
  for (const f of files) {
    for (const t of f.tags ?? []) allTags.add(t)
    for (const t of f.aiTags ?? []) allTags.add(t.tag)
  }
  if (allTags.size > 0) {
    const top = [...allTags].slice(0, 5).join(", ")
    parts.push(`tags: ${top}`)
  }

  return parts.join(". ") + "."
}

export function aiSuggestCover(folder: Project): string | null {
  // Real heuristic. No AI needed — picks a deterministic best image based on
  // user-curated signals (pin, favourite) then file size.
  const images = (folder.files ?? []).filter((f) => f.type === "image")
  if (images.length === 0) return null
  const pinned = images.find((f) => f.pinned)
  if (pinned) return pinned.id
  const favorited = images.find((f) => f.favorite)
  if (favorited) return favorited.id
  return images.slice().sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0].id
}

export function aiOcrFile(file: FolderFile): string {
  // Real: returns the OCR text persisted on the file record (populated via
  // electron/ipc/ai-real.ts after a real provider call). Empty string when
  // OCR has not been generated yet — callers should trigger the async
  // `window.api.ai.ocr(fileId)` to populate it.
  return file.ocrText ?? ""
}

export interface VisualSimilarity {
  fileId: string
  folderId: string
  score: number
  reason: string
}

export function aiVisualSimilar(
  query: FolderFile,
  allFolders: Project[],
): VisualSimilarity[] {
  // Real overlap-based similarity. Combines manually-applied tags, AI-applied
  // tags, file type, and colour palette. Sorted by total score, capped at 30.
  const queryTags = new Set([
    ...(query.tags ?? []),
    ...(query.aiTags?.map((t) => t.tag) ?? []),
  ])
  const queryPalette = query.palette ?? []
  const out: VisualSimilarity[] = []
  for (const folder of allFolders) {
    if (folder.deletedAt) continue
    for (const file of folder.files ?? []) {
      if (file.id === query.id) continue
      let score = 0
      const fileTags = new Set([
        ...(file.tags ?? []),
        ...(file.aiTags?.map((t) => t.tag) ?? []),
      ])
      let shared = 0
      queryTags.forEach((t) => {
        if (fileTags.has(t)) shared++
      })
      score += shared * 20
      if (file.type === query.type) score += 10
      if (queryPalette.length > 0 && file.palette && file.palette.length > 0) {
        let paletteScore = 0
        for (const c of queryPalette) {
          for (const c2 of file.palette) {
            const d = hexDistance(c, c2)
            if (d < 60) paletteScore += 5
          }
        }
        score += paletteScore
      }
      if (score > 0) {
        out.push({
          fileId: file.id,
          folderId: String(folder.id),
          score,
          reason:
            shared > 0
              ? `${shared} shared tag${shared === 1 ? "" : "s"}`
              : "similar palette",
        })
      }
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 30)
}

function hexDistance(a: string, b: string): number {
  if (!a?.startsWith("#") || !b?.startsWith("#")) return 999
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}
