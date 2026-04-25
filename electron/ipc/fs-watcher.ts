import { watch, type FSWatcher } from "chokidar"
import { BrowserWindow } from "electron"
import * as path from "node:path"

const META_DIR = ".folders-app"
const DEBOUNCE_MS = 300

type ChangeKind = "added" | "removed" | "renamed" | "modified"

interface WatcherDeps {
  libraryRoot: string
  onChanged?: (kind: ChangeKind, absPath: string) => void
}

export class LibraryWatcher {
  private watcher: FSWatcher | null = null
  private muted = new Set<string>()
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
  }

  mute(absPath: string): void {
    this.muted.add(absPath)
  }

  unmute(absPath: string): void {
    this.muted.delete(absPath)
  }

  private fire(kind: ChangeKind, absPath: string): void {
    if (this.muted.has(absPath)) return
    const existing = this.pending.get(absPath)
    if (existing) clearTimeout(existing.timeout)
    const timeout = setTimeout(() => {
      this.pending.delete(absPath)
      this.deps.onChanged?.(kind, absPath)
      for (const w of BrowserWindow.getAllWindows()) {
        w.webContents.send("event:fs-changed", { kind, path: absPath })
      }
    }, DEBOUNCE_MS)
    this.pending.set(absPath, { kind, timeout })
  }
}
