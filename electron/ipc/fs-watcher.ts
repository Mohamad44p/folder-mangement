import { watch, type FSWatcher } from "chokidar"
import { BrowserWindow } from "electron"
import * as path from "node:path"

const META_DIR = ".folders-app"
const DEBOUNCE_MS = 300
const MUTE_BUFFER_MS = 1500

type ChangeKind = "added" | "removed" | "renamed" | "modified"

interface WatcherDeps {
  libraryRoot: string
  onChanged?: (kind: ChangeKind, absPath: string) => void
}

const isWindows = process.platform === "win32"

function normalizePath(absPath: string): string {
  return isWindows ? absPath.toLowerCase() : absPath
}

export class LibraryWatcher {
  private watcher: FSWatcher | null = null
  private readonly muted = new Map<string, number>()
  private pending = new Map<string, { kind: ChangeKind; timeout: NodeJS.Timeout }>()

  constructor(private readonly deps: WatcherDeps) {}

  start(): void {
    if (this.watcher) return
    this.watcher = watch(this.deps.libraryRoot, {
      ignoreInitial: true,
      ignored: (p: string) => p.split(path.sep).includes(META_DIR),
    })
    this.watcher
      .on("add", (p: string) => this.fire("added", p))
      .on("addDir", (p: string) => this.fire("added", p))
      .on("change", (p: string) => this.fire("modified", p))
      .on("unlink", (p: string) => this.fire("removed", p))
      .on("unlinkDir", (p: string) => this.fire("removed", p))
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
    for (const v of this.pending.values()) clearTimeout(v.timeout)
    this.pending.clear()
    this.muted.clear()
  }

  /**
   * Suppress emitted change events for any path equal to or nested under
   * one of the given paths until the buffer expires. Used by app-initiated
   * disk mutations so the watcher does not echo our own writes back to the
   * renderer.
   */
  mutePathsTemporarily(absPaths: string[], ms = MUTE_BUFFER_MS): void {
    const expiresAt = Date.now() + Math.max(0, ms)
    for (const p of absPaths) {
      if (!p) continue
      const key = normalizePath(p)
      const prev = this.muted.get(key) ?? 0
      if (expiresAt > prev) this.muted.set(key, expiresAt)
    }
  }

  private isMuted(absPath: string): boolean {
    if (this.muted.size === 0) return false
    const target = normalizePath(absPath)
    const now = Date.now()
    for (const [key, exp] of this.muted) {
      if (exp <= now) {
        this.muted.delete(key)
        continue
      }
      if (target === key) return true
      if (target.startsWith(key + path.sep)) return true
    }
    return false
  }

  private fire(kind: ChangeKind, absPath: string): void {
    if (this.isMuted(absPath)) return
    const existing = this.pending.get(absPath)
    if (existing) clearTimeout(existing.timeout)
    const timeout = setTimeout(() => {
      this.pending.delete(absPath)
      if (this.isMuted(absPath)) return
      this.deps.onChanged?.(kind, absPath)
      for (const w of BrowserWindow.getAllWindows()) {
        w.webContents.send("event:fs-changed", { kind, path: absPath })
      }
    }, DEBOUNCE_MS)
    this.pending.set(absPath, { kind, timeout })
  }
}
