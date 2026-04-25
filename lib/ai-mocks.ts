import type { FolderFile, Project } from "./data"

const SCENE_TAGS = [
  "portrait", "landscape", "studio", "outdoor", "indoor", "city", "nature",
  "abstract", "minimal", "vibrant", "moody", "high-contrast", "soft-light",
]
const COLOR_TAGS = ["warm", "cool", "monochrome", "saturated", "pastel", "earth-tones"]
const SUBJECT_TAGS = ["person", "object", "texture", "geometric", "organic", "architectural"]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const out: T[] = []
  const taken = new Set<number>()
  let h = seed
  while (out.length < Math.min(n, arr.length)) {
    h = (h * 9301 + 49297) % 233280
    const idx = h % arr.length
    if (!taken.has(idx)) {
      taken.add(idx)
      out.push(arr[idx])
    }
  }
  return out
}

export function aiAutoTagFile(file: FolderFile): { tag: string; confidence: number }[] {
  const seed = hash(file.id + file.name)
  const scene = pickN(SCENE_TAGS, 2, seed)
  const color = pickN(COLOR_TAGS, 1, seed >> 3)
  const subject = pickN(SUBJECT_TAGS, 1, seed >> 5)
  const all = [...scene, ...color, ...subject]
  return all.map((tag, i) => ({
    tag,
    confidence: Math.round(95 - i * 7 - (seed % 5)),
  }))
}

export function aiDescribeFolder(folder: Project, subfolders: Project[]): string {
  const fileNames = (folder.files ?? []).slice(0, 5).map((f) => f.name).join(", ")
  const tagSummary = (folder.tags ?? []).slice(0, 3).join(", ")
  const subList = subfolders.slice(0, 3).map((s) => s.title).join(", ")
  const parts: string[] = []
  parts.push(`A ${folder.title.toLowerCase()} collection`)
  if (tagSummary) parts.push(`focused on ${tagSummary}`)
  if (folder.files && folder.files.length > 0) {
    parts.push(`with ${folder.files.length} files`)
    if (fileNames) parts.push(`including ${fileNames}`)
  }
  if (subfolders.length > 0) {
    parts.push(`organized into ${subfolders.length} subfolders`)
    if (subList) parts.push(`(${subList})`)
  }
  return parts.join(" ") + "."
}

export function aiSuggestCover(folder: Project): string | null {
  const images = (folder.files ?? []).filter((f) => f.type === "image")
  if (images.length === 0) return null
  const fav = images.find((f) => f.favorite)
  if (fav) return fav.id
  // Pick the largest by size, fallback to first
  const sorted = [...images].sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
  return sorted[0]?.id ?? null
}

export function aiOcrFile(file: FolderFile): string {
  // Mock OCR: invent text based on the filename
  const base = file.name.replace(/[._-]/g, " ")
  return `Detected text: "${base}". This is a mock OCR result; in production this would call a real model.`
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
  const queryTags = new Set([...(query.tags ?? []), ...(query.aiTags?.map((t) => t.tag) ?? [])])
  const queryPalette = query.palette ?? []
  const out: VisualSimilarity[] = []
  for (const folder of allFolders) {
    if (folder.deletedAt) continue
    for (const file of folder.files ?? []) {
      if (file.id === query.id) continue
      let score = 0
      const fileTags = new Set([...(file.tags ?? []), ...(file.aiTags?.map((t) => t.tag) ?? [])])
      let shared = 0
      queryTags.forEach((t) => {
        if (fileTags.has(t)) shared++
      })
      score += shared * 20
      if (file.type === query.type) score += 10
      // palette overlap
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
          reason: shared > 0 ? `${shared} shared tag${shared === 1 ? "" : "s"}` : "similar palette",
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
