import { app, ipcMain, safeStorage } from "electron"
import * as fs from "node:fs"
import * as path from "node:path"
import type Database from "better-sqlite3"
import { Queries, type FileRow, type FolderRow } from "../db/queries"
import { wrapIpc } from "./envelope"
import type { AiProvider } from "../../src/lib/library/types"

const KEYS_FILE = "ai-keys.dat"

interface AiTag {
  tag: string
  confidence: number
}

interface AiAutoTagResult {
  tags: AiTag[]
}

interface AiCaptionResult {
  caption: string
}

interface AiOcrResult {
  text: string
}

interface AiDescribeResult {
  description: string
}

function loadKeys(): Record<string, string> {
  const file = path.join(app.getPath("userData"), KEYS_FILE)
  if (!fs.existsSync(file)) return {}
  try {
    const buf = fs.readFileSync(file)
    if (!safeStorage.isEncryptionAvailable()) {
      return JSON.parse(buf.toString("utf8")) as Record<string, string>
    }
    return JSON.parse(safeStorage.decryptString(buf)) as Record<string, string>
  } catch {
    return {}
  }
}

async function callOpenAiVision(
  apiKey: string,
  base64: string,
  mime: string,
  prompt: string,
  expectJson: boolean,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
      ...(expectJson ? { response_format: { type: "json_object" } } : {}),
    }),
  })
  if (!res.ok) {
    throw aiError(`openai ${res.status}: ${await res.text().catch(() => "")}`)
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  return json.choices?.[0]?.message?.content ?? ""
}

async function callAnthropicVision(
  apiKey: string,
  base64: string,
  mime: string,
  prompt: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mime, data: base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  })
  if (!res.ok) {
    throw aiError(`anthropic ${res.status}: ${await res.text().catch(() => "")}`)
  }
  const json = (await res.json()) as { content?: { type: string; text?: string }[] }
  return json.content?.find((c) => c.type === "text")?.text ?? ""
}

function pickProvider(
  keys: Record<string, string>,
  preferred?: AiProvider,
): { provider: AiProvider; key: string } {
  if (preferred && keys[preferred]) {
    return { provider: preferred, key: keys[preferred] }
  }
  for (const p of ["anthropic", "openai", "google"] as const) {
    if (keys[p]) return { provider: p, key: keys[p] }
  }
  throw aiError("No AI provider key configured. Add one in Settings.")
}

function readImageAsBase64(absPath: string, fallbackMime?: string): {
  base64: string
  mime: string
} {
  const buf = fs.readFileSync(absPath)
  const ext = path.extname(absPath).toLowerCase()
  const mime =
    fallbackMime ||
    (ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".gif"
      ? "image/gif"
      : ext === ".webp"
      ? "image/webp"
      : ext === ".avif"
      ? "image/avif"
      : "image/jpeg")
  return { base64: buf.toString("base64"), mime }
}

function parseTagsResponse(raw: string): AiTag[] {
  // Try JSON first.
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Fall through to plain-text parsing.
  }
  if (Array.isArray((parsed as { tags?: unknown })?.tags)) {
    const arr = (parsed as { tags: unknown[] }).tags
    const out: AiTag[] = []
    for (const item of arr) {
      if (typeof item === "string") {
        out.push({ tag: item.toLowerCase(), confidence: 0.8 })
      } else if (typeof item === "object" && item) {
        const t = (item as { tag?: unknown; label?: unknown; name?: unknown })
        const tag =
          (typeof t.tag === "string" && t.tag) ||
          (typeof t.label === "string" && t.label) ||
          (typeof t.name === "string" && t.name) ||
          ""
        if (tag) {
          const conf = (item as { confidence?: number }).confidence ?? 0.8
          out.push({ tag: String(tag).toLowerCase(), confidence: clamp(conf) })
        }
      }
    }
    return dedupeTags(out)
  }
  // Plain text: comma- or newline-separated words.
  const split = raw
    .split(/[,\n]/)
    .map((s) => s.trim().replace(/^[-•*\d.\s]+/, "").toLowerCase())
    .filter((s) => s.length > 0 && s.length < 30)
  return dedupeTags(split.slice(0, 8).map((tag) => ({ tag, confidence: 0.7 })))
}

function dedupeTags(tags: AiTag[]): AiTag[] {
  const seen = new Set<string>()
  const out: AiTag[] = []
  for (const t of tags) {
    if (!seen.has(t.tag)) {
      seen.add(t.tag)
      out.push(t)
    }
  }
  return out.slice(0, 12)
}

function clamp(v: number): number {
  if (typeof v !== "number" || isNaN(v)) return 0.7
  if (v < 0) return 0
  if (v > 1) return v > 100 ? 1 : v / 100
  return v
}

function persistAiTags(
  db: Database.Database,
  fileId: string,
  tags: AiTag[],
  status: "done" | "failed",
): void {
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM file_ai_tags WHERE file_id = ?`).run(fileId)
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO file_ai_tags (file_id, tag, confidence) VALUES (?, ?, ?)`,
    )
    for (const t of tags) {
      stmt.run(fileId, t.tag, t.confidence)
    }
    db.prepare(
      `UPDATE files SET ai_tag_status = ?, modified_at = datetime('now') WHERE id = ?`,
    ).run(status, fileId)
  })
  tx()
}

export function registerAiRealIpc(db: Database.Database): void {
  const q = new Queries(db)

  ipcMain.handle(
    "ai:auto-tag",
    wrapIpc<AiAutoTagResult, [string, AiProvider | undefined]>(
      async (_e, fileId, preferred) => {
        const file = q.getFileById.get(fileId) as FileRow | undefined
        if (!file) throw aiError(`file ${fileId} not found`)
        if (file.type !== "image") {
          throw aiError(`auto-tag is only supported for images (got ${file.type})`)
        }
        const keys = loadKeys()
        const { provider, key } = pickProvider(keys, preferred)
        const { base64, mime } = readImageAsBase64(file.abs_path, file.mime ?? undefined)

        const prompt = `Analyse the image and respond with JSON of the form
{"tags":[{"tag":"<short-lowercase-noun-or-adjective>","confidence":<0-1>}, ...]}.
Return at most 8 tags describing scene, subject, style, mood, and notable colors.
No prose, no explanations, JSON only.`

        let raw = ""
        try {
          raw =
            provider === "openai"
              ? await callOpenAiVision(key, base64, mime, prompt, true)
              : provider === "anthropic"
              ? await callAnthropicVision(key, base64, mime, prompt)
              : (() => {
                  throw aiError(`${provider} not implemented yet`)
                })()
        } catch (err) {
          persistAiTags(db, fileId, [], "failed")
          throw err
        }

        const tags = parseTagsResponse(raw)
        persistAiTags(db, fileId, tags, "done")
        return { tags }
      },
    ),
  )

  ipcMain.handle(
    "ai:caption",
    wrapIpc<AiCaptionResult, [string, AiProvider | undefined]>(
      async (_e, fileId, preferred) => {
        const file = q.getFileById.get(fileId) as FileRow | undefined
        if (!file) throw aiError(`file ${fileId} not found`)
        if (file.type !== "image") {
          throw aiError(`caption is only supported for images (got ${file.type})`)
        }
        const keys = loadKeys()
        const { provider, key } = pickProvider(keys, preferred)
        const { base64, mime } = readImageAsBase64(file.abs_path, file.mime ?? undefined)
        const prompt =
          "Write a single short, factual caption for this image (under 20 words). " +
          "Plain text only — no quotes, no labels."
        const raw =
          provider === "openai"
            ? await callOpenAiVision(key, base64, mime, prompt, false)
            : provider === "anthropic"
            ? await callAnthropicVision(key, base64, mime, prompt)
            : (() => {
                throw aiError(`${provider} not implemented yet`)
              })()
        const caption = raw.trim().replace(/^["']|["']$/g, "")
        db.prepare(
          `UPDATE files SET caption = ?, modified_at = datetime('now') WHERE id = ?`,
        ).run(caption, fileId)
        return { caption }
      },
    ),
  )

  ipcMain.handle(
    "ai:ocr",
    wrapIpc<AiOcrResult, [string, AiProvider | undefined]>(
      async (_e, fileId, preferred) => {
        const file = q.getFileById.get(fileId) as FileRow | undefined
        if (!file) throw aiError(`file ${fileId} not found`)
        if (file.type !== "image") {
          throw aiError(`OCR is only supported for images (got ${file.type})`)
        }
        const keys = loadKeys()
        const { provider, key } = pickProvider(keys, preferred)
        const { base64, mime } = readImageAsBase64(file.abs_path, file.mime ?? undefined)
        const prompt =
          "Extract every word of legible text from this image, in reading order. " +
          "Preserve line breaks. Return only the extracted text — no commentary, " +
          "no labels, no quotes. If there is no readable text, respond with an empty string."
        const raw =
          provider === "openai"
            ? await callOpenAiVision(key, base64, mime, prompt, false)
            : provider === "anthropic"
            ? await callAnthropicVision(key, base64, mime, prompt)
            : (() => {
                throw aiError(`${provider} not implemented yet`)
              })()
        const text = raw.trim()
        db.prepare(
          `UPDATE files SET ocr_text = ?, modified_at = datetime('now') WHERE id = ?`,
        ).run(text, fileId)
        return { text }
      },
    ),
  )

  ipcMain.handle(
    "ai:describe-folder",
    wrapIpc<AiDescribeResult, [string, AiProvider | undefined]>(
      async (_e, folderId, preferred) => {
        const folder = q.getFolderById.get(folderId) as FolderRow | undefined
        if (!folder) throw aiError(`folder ${folderId} not found`)
        const keys = loadKeys()
        const { provider, key } = pickProvider(keys, preferred)

        // Compose a real factual summary of the folder contents (no images sent;
        // this saves tokens and keeps the call cheap).
        const files = db
          .prepare<[string]>(
            `SELECT name, type, mime, size, caption, ocr_text FROM files WHERE folder_id = ? AND deleted_at IS NULL LIMIT 80`,
          )
          .all(folderId) as {
          name: string
          type: string
          mime: string | null
          size: number | null
          caption: string | null
          ocr_text: string | null
        }[]
        const subfolders = db
          .prepare<[string]>(
            `SELECT name FROM folders WHERE parent_id = ? AND deleted_at IS NULL LIMIT 30`,
          )
          .all(folderId) as { name: string }[]

        const inventory = {
          folder: { name: folder.name, notes: folder.notes ?? "" },
          totalFiles: files.length,
          fileTypes: countBy(files, (f) => f.type),
          subfolders: subfolders.map((s) => s.name),
          captions: files.map((f) => f.caption).filter(Boolean).slice(0, 20),
          fileNames: files.map((f) => f.name).slice(0, 30),
        }

        const prompt = `Write a concise 1-2 sentence description of this folder
based on the inventory below. Plain prose, no labels, no quotes, no preamble.

${JSON.stringify(inventory, null, 2)}`

        const raw = await callTextOnly(provider, key, prompt)
        const description = raw.trim().replace(/^["']|["']$/g, "")
        db.prepare(
          `UPDATE folders SET notes = ?, updated_at = datetime('now') WHERE id = ?`,
        ).run(description, folderId)
        return { description }
      },
    ),
  )
}

async function callTextOnly(
  provider: AiProvider,
  apiKey: string,
  prompt: string,
): Promise<string> {
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) throw aiError(`openai ${res.status}: ${await res.text().catch(() => "")}`)
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    return json.choices?.[0]?.message?.content ?? ""
  }
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) throw aiError(`anthropic ${res.status}: ${await res.text().catch(() => "")}`)
    const json = (await res.json()) as { content?: { type: string; text?: string }[] }
    return json.content?.find((c) => c.type === "text")?.text ?? ""
  }
  throw aiError(`${provider} not implemented yet`)
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items) {
    const k = key(item)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

function aiError(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "UNKNOWN" })
}
