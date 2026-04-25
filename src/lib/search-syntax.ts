/**
 * Power-search syntax parser. Supports:
 *   tag:<value>            - file or folder tag (multiple ANDed)
 *   type:<image|video|document|other>
 *   size:<op><n><unit>     - op ∈ >,<,>=,<=,= ; unit ∈ B,KB,MB,GB
 *   before:<YYYY-MM-DD>    - uploaded strictly before this date
 *   after:<YYYY-MM-DD>     - uploaded strictly after this date
 *   name:<value>           - filename contains (case-insensitive)
 *   favorite               - bare token, restricts to favourites
 *
 * Anything not matching is treated as free-text matched against name,
 * description, ocrText, caption, and folder title.
 */

export type SizeOp = ">" | "<" | ">=" | "<=" | "="

export interface ParsedQuery {
  text: string                  // joined free-text terms
  tags: string[]
  types: ("image" | "video" | "document" | "other")[]
  size?: { op: SizeOp; bytes: number }
  before?: string               // ISO date
  after?: string                // ISO date
  nameContains?: string
  favoriteOnly: boolean
  raw: string
}

const SIZE_RE = /^(>=|<=|>|<|=)?(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i

const UNIT_BYTES: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024,
}

export function parseQuery(raw: string): ParsedQuery {
  const tokens = tokenize(raw)
  const parsed: ParsedQuery = {
    text: "",
    tags: [],
    types: [],
    favoriteOnly: false,
    raw,
  }
  const free: string[] = []

  for (const token of tokens) {
    const colon = token.indexOf(":")
    if (colon === -1) {
      if (token.toLowerCase() === "favorite" || token.toLowerCase() === "fav") {
        parsed.favoriteOnly = true
      } else {
        free.push(token)
      }
      continue
    }
    const key = token.slice(0, colon).toLowerCase()
    const value = token.slice(colon + 1)
    if (!value) continue

    switch (key) {
      case "tag":
      case "tags":
        parsed.tags.push(value.toLowerCase())
        break
      case "type": {
        const t = value.toLowerCase()
        if (t === "image" || t === "video" || t === "document" || t === "other") {
          parsed.types.push(t)
        }
        break
      }
      case "size": {
        const m = SIZE_RE.exec(value)
        if (m) {
          const op = (m[1] ?? "=") as SizeOp
          const n = parseFloat(m[2])
          const unit = (m[3] ?? "B").toUpperCase()
          parsed.size = { op, bytes: Math.round(n * (UNIT_BYTES[unit] ?? 1)) }
        }
        break
      }
      case "before": {
        const iso = normalizeDate(value)
        if (iso) parsed.before = iso
        break
      }
      case "after": {
        const iso = normalizeDate(value)
        if (iso) parsed.after = iso
        break
      }
      case "name":
        parsed.nameContains = value.toLowerCase()
        break
      default:
        free.push(token)
    }
  }

  parsed.text = free.join(" ").trim()
  return parsed
}

function tokenize(raw: string): string[] {
  const out: string[] = []
  let buf = ""
  let quoted = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '"') {
      quoted = !quoted
      continue
    }
    if (!quoted && /\s/.test(ch)) {
      if (buf) {
        out.push(buf)
        buf = ""
      }
      continue
    }
    buf += ch
  }
  if (buf) out.push(buf)
  return out
}

function normalizeDate(input: string): string | null {
  // Accepts YYYY-MM-DD, YYYY/MM/DD, or YYYY-MM. Returns ISO date.
  const s = input.replace(/\//g, "-")
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

export interface MatchableFile {
  name: string
  size?: number
  type: "image" | "video" | "document" | "other"
  uploadedAt: string
  description?: string
  ocrText?: string
  caption?: string
  favorite?: boolean
  tags?: string[]
}

/**
 * Returns true if a file matches the parsed query. Free text is matched
 * against name, caption, ocrText, and description.
 */
export function matchesFile(q: ParsedQuery, f: MatchableFile): boolean {
  if (q.types.length > 0 && !q.types.includes(f.type)) return false
  if (q.favoriteOnly && !f.favorite) return false
  if (q.nameContains && !f.name.toLowerCase().includes(q.nameContains)) return false
  if (q.tags.length > 0) {
    const fileTags = (f.tags ?? []).map((t) => t.toLowerCase())
    for (const t of q.tags) {
      if (!fileTags.includes(t)) return false
    }
  }
  if (q.size && typeof f.size === "number") {
    const { op, bytes } = q.size
    const ok =
      op === ">" ? f.size > bytes :
      op === "<" ? f.size < bytes :
      op === ">=" ? f.size >= bytes :
      op === "<=" ? f.size <= bytes :
      f.size === bytes
    if (!ok) return false
  }
  if (q.before && f.uploadedAt >= q.before + "T00:00:00") return false
  if (q.after && f.uploadedAt <= q.after + "T23:59:59") return false
  if (q.text) {
    const needle = q.text.toLowerCase()
    const haystacks = [f.name, f.description ?? "", f.ocrText ?? "", f.caption ?? ""]
    if (!haystacks.some((s) => s.toLowerCase().includes(needle))) return false
  }
  return true
}
