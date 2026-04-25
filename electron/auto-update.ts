import { app, BrowserWindow } from "electron"
import { autoUpdater } from "electron-updater"

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

export function startAutoUpdate(getWindow: () => BrowserWindow | null): void {
  if (process.env.NODE_ENV === "development") return
  if (process.env.FOLDERS_E2E === "1") return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("update-downloaded", () => {
    const w = getWindow()
    w?.webContents.send("event:update-ready", { version: app.getVersion() })
  })
  autoUpdater.on("error", (err) => {
    console.error("autoUpdater error:", err)
  })

  void autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error("autoUpdater initial check failed:", err)
  })

  setInterval(() => {
    void autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error("autoUpdater periodic check failed:", err)
    })
  }, FOUR_HOURS_MS)
}
