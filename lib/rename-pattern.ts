import type { FolderFile } from "./data"

export interface RenameToken {
  token: string
  description: string
  example: string
}

export const RENAME_TOKENS: RenameToken[] = [
  { token: "{n}", description: "Index (1, 2, 3...)", example: "1" },
  { token: "{n2}", description: "Index, 2 digits", example: "01" },
  { token: "{n3}", description: "Index, 3 digits", example: "001" },
  { token: "{name}", description: "Original name", example: "image" },
  { token: "{date}", description: "Upload date YYYY-MM-DD", example: "2026-04-25" },
  { token: "{type}", description: "File type", example: "image" },
]

function pad(n: number, width: number): string {
  const s = String(n)
  if (s.length >= width) return s
  return "0".repeat(width - s.length) + s
}

function dateOnly(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

export function applyPattern(pattern: string, file: FolderFile, index: number): string {
  const baseName = file.name.replace(/\.[^.]+$/, "")
  return pattern
    .replace(/\{n3\}/g, pad(index + 1, 3))
    .replace(/\{n2\}/g, pad(index + 1, 2))
    .replace(/\{n\}/g, String(index + 1))
    .replace(/\{name\}/g, baseName)
    .replace(/\{date\}/g, dateOnly(file.uploadedAt))
    .replace(/\{type\}/g, file.type)
}
