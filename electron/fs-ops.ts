import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"

export const META_DIR = ".folders-app"
export const TRASH_DIR = "trash"
export const VERSIONS_DIR = "versions"
export const THUMBS_DIR = "thumbs"

export function metaDir(libraryRoot: string): string {
  return path.join(libraryRoot, META_DIR)
}

export function trashRoot(libraryRoot: string): string {
  return path.join(libraryRoot, META_DIR, TRASH_DIR)
}

export function versionsRoot(libraryRoot: string): string {
  return path.join(libraryRoot, META_DIR, VERSIONS_DIR)
}

export function thumbsRoot(libraryRoot: string): string {
  return path.join(libraryRoot, META_DIR, THUMBS_DIR)
}

/**
 * Resolves a target path that may already exist by appending " (2)", " (3)", ...
 * until a free slot is found. Preserves any file extension.
 */
export function resolveCollision(targetPath: string): string {
  if (!fs.existsSync(targetPath)) return targetPath
  const dir = path.dirname(targetPath)
  const base = path.basename(targetPath)
  const ext = path.extname(base)
  const stem = ext ? base.slice(0, -ext.length) : base
  for (let i = 2; i < 10_000; i++) {
    const candidate = path.join(dir, `${stem} (${i})${ext}`)
    if (!fs.existsSync(candidate)) return candidate
  }
  throw fsError("Could not resolve filename collision after 10,000 attempts")
}

export function atomicCreateDir(targetPath: string): string {
  const final = resolveCollision(targetPath)
  fs.mkdirSync(final, { recursive: false })
  return final
}

export function atomicRename(source: string, target: string): string {
  if (source === target) return source
  const final = resolveCollision(target)
  fs.renameSync(source, final)
  return final
}

export function atomicMoveToTrash(libraryRoot: string, absPath: string): string {
  const rel = path.relative(libraryRoot, absPath)
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw invalid(`Path is outside the library: ${absPath}`)
  }
  const target = path.join(trashRoot(libraryRoot), rel)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const final = resolveCollision(target)
  fs.renameSync(absPath, final)
  return final
}

export function atomicRestoreFromTrash(libraryRoot: string, originalAbsPath: string): string {
  const rel = path.relative(libraryRoot, originalAbsPath)
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw invalid(`Path is outside the library: ${originalAbsPath}`)
  }
  const trashed = path.join(trashRoot(libraryRoot), rel)
  if (!fs.existsSync(trashed)) {
    throw notFound(`Trashed entry missing: ${trashed}`)
  }
  fs.mkdirSync(path.dirname(originalAbsPath), { recursive: true })
  const final = resolveCollision(originalAbsPath)
  fs.renameSync(trashed, final)
  return final
}

export function hashFileStream(absPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    const stream = fs.createReadStream(absPath)
    stream.on("data", (chunk) => {
      hash.update(chunk as unknown as Uint8Array)
    })
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}

export function hashBytes(bytes: Buffer | Uint8Array): string {
  return createHash("sha256")
    .update(bytes as unknown as Uint8Array)
    .digest("hex")
}

/**
 * Writes bytes atomically: tmp file in the same directory, then a single
 * fs.renameSync. Returns the final path (collision-resolved).
 */
export function writeBytesAtomic(targetPath: string, bytes: Buffer | Uint8Array): string {
  const final = resolveCollision(targetPath)
  fs.mkdirSync(path.dirname(final), { recursive: true })
  const tmp = `${final}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, bytes as unknown as Uint8Array)
  fs.renameSync(tmp, final)
  return final
}

/**
 * Snapshots the current file content into versions/<file-id>/<timestamp>.<ext>
 * and prunes older versions to the configured maximum.
 */
export function snapshotVersion(
  libraryRoot: string,
  fileId: string,
  currentAbsPath: string,
  maxVersions = 10,
): string {
  if (!fs.existsSync(currentAbsPath)) {
    throw notFound(`Current file missing for version snapshot: ${currentAbsPath}`)
  }
  const dir = path.join(versionsRoot(libraryRoot), fileId)
  fs.mkdirSync(dir, { recursive: true })
  const ext = path.extname(currentAbsPath)
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const snapshot = path.join(dir, `${ts}${ext}`)
  fs.copyFileSync(currentAbsPath, snapshot)

  const entries = fs
    .readdirSync(dir)
    .map((name) => ({ name, full: path.join(dir, name) }))
    .filter((e) => fs.statSync(e.full).isFile())
    .sort((a, b) => a.name.localeCompare(b.name))
  while (entries.length > maxVersions) {
    const [oldest] = entries.splice(0, 1)
    fs.rmSync(oldest.full, { force: true })
  }
  return snapshot
}

export function ensureMetaDirs(libraryRoot: string): void {
  fs.mkdirSync(metaDir(libraryRoot), { recursive: true })
  fs.mkdirSync(trashRoot(libraryRoot), { recursive: true })
  fs.mkdirSync(versionsRoot(libraryRoot), { recursive: true })
  fs.mkdirSync(thumbsRoot(libraryRoot), { recursive: true })
}

function fsError(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "FS_ERROR" })
}
function notFound(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "NOT_FOUND" })
}
function invalid(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "INVALID_INPUT" })
}
