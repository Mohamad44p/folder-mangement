import { app, ipcMain } from "electron"
import * as fs from "node:fs"
import * as path from "node:path"
import { wrapIpc } from "./envelope"

const LIBRARY_PATH_KEY = "libraryPath"

export interface SettingsStore {
  getLibraryPath(): string | null
  hasLibraryPath(): boolean
  setLibraryPath(absPath: string): void
}

class FileSettingsStore implements SettingsStore {
  private readonly file: string

  constructor() {
    this.file = path.join(app.getPath("userData"), "bootstrap-settings.json")
  }

  getLibraryPath(): string | null {
    if (process.env.FOLDERS_E2E_LIBRARY) return process.env.FOLDERS_E2E_LIBRARY
    if (!fs.existsSync(this.file)) return null
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8")) as Record<string, unknown>
      const v = raw[LIBRARY_PATH_KEY]
      return typeof v === "string" && v.length > 0 ? v : null
    } catch {
      return null
    }
  }

  hasLibraryPath(): boolean {
    return this.getLibraryPath() !== null
  }

  setLibraryPath(absPath: string): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    const existing: Record<string, unknown> = fs.existsSync(this.file)
      ? (() => {
          try {
            return JSON.parse(fs.readFileSync(this.file, "utf8"))
          } catch {
            return {}
          }
        })()
      : {}
    existing[LIBRARY_PATH_KEY] = absPath
    fs.writeFileSync(this.file, JSON.stringify(existing), "utf8")
  }
}

export function defaultLibraryPath(): string {
  if (process.env.FOLDERS_E2E_LIBRARY) return process.env.FOLDERS_E2E_LIBRARY
  return path.join(app.getPath("home"), "Folders")
}

export function ensureLibraryPath(p: string): { ok: true } | { ok: false; error: string } {
  try {
    fs.mkdirSync(p, { recursive: true })
    fs.accessSync(p, fs.constants.R_OK | fs.constants.W_OK)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export function registerSettingsIpc(store: SettingsStore): void {
  ipcMain.handle(
    "app:get-library-path",
    wrapIpc<string>(async () => store.getLibraryPath() ?? defaultLibraryPath()),
  )
  ipcMain.handle(
    "app:has-library-path",
    wrapIpc<boolean>(async () => store.hasLibraryPath()),
  )
  ipcMain.handle(
    "app:set-library-path",
    wrapIpc<void, [string]>(async (_event, absPath) => {
      const r = ensureLibraryPath(absPath)
      if (!r.ok) {
        const err = new Error(r.error) as Error & { code: string }
        err.code = "FS_ERROR"
        throw err
      }
      store.setLibraryPath(absPath)
    }),
  )
}

export const settingsStore: SettingsStore = new FileSettingsStore()
