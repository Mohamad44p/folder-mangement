import { app, BrowserWindow, ipcMain } from "electron"
import { autoUpdater } from "electron-updater"

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
let getWindow: () => BrowserWindow | null = () => null

function send(channel: string, payload: unknown): void {
  const w = getWindow()
  if (w && !w.isDestroyed()) {
    w.webContents.send(channel, payload)
  }
}

export function startAutoUpdate(getWin: () => BrowserWindow | null): void {
  getWindow = getWin
  if (process.env.NODE_ENV === "development") return
  if (process.env.FOLDERS_E2E === "1") return

  // User-driven flow: we surface a toast and let them click Download.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on("update-available", (info) => {
    send("event:update-available", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes:
        typeof info.releaseNotes === "string" ? info.releaseNotes : null,
    })
  })

  autoUpdater.on("update-not-available", () => {
    send("event:update-not-available", {})
  })

  autoUpdater.on("download-progress", (p) => {
    send("event:update-progress", {
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    })
  })

  autoUpdater.on("update-downloaded", (info) => {
    send("event:update-downloaded", { version: info.version })
  })

  autoUpdater.on("error", (err) => {
    console.error("autoUpdater error:", err)
    send("event:update-error", { message: err.message })
  })

  void check()
  setInterval(check, FOUR_HOURS_MS)
}

function check(): Promise<void> {
  return autoUpdater.checkForUpdates().then(
    () => undefined,
    (err: Error) => {
      console.error("autoUpdater check failed:", err)
    },
  )
}

export function registerUpdateIpc(): void {
  ipcMain.handle("update:check-now", async () => {
    if (process.env.NODE_ENV === "development") {
      return { ok: true, data: { skipped: true, reason: "dev" } }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, data: { version: result?.updateInfo.version ?? null } }
    } catch (err) {
      return {
        ok: false,
        error: { code: "UPDATE_CHECK_FAILED", message: (err as Error).message },
      }
    }
  })

  ipcMain.handle("update:start-download", async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true, data: undefined }
    } catch (err) {
      return {
        ok: false,
        error: { code: "UPDATE_DOWNLOAD_FAILED", message: (err as Error).message },
      }
    }
  })

  ipcMain.handle("update:install-now", () => {
    // isSilent=false so the user sees the NSIS installer, isForceRunAfter=true
    // so the app relaunches automatically once the install completes.
    setImmediate(() => autoUpdater.quitAndInstall(false, true))
    return { ok: true, data: undefined }
  })
}
