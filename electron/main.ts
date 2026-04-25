import { app, BrowserWindow, shell, ipcMain } from "electron"
import * as path from "node:path"
import { openLibraryDb } from "./db/open"
import { Queries } from "./db/queries"
import { ensureMetaDirs } from "./fs-ops"
import { LibraryService } from "./ipc/library"
import { registerLibraryIpc } from "./ipc/library-ipc"
import { FilesService } from "./ipc/files"
import { registerFilesIpc } from "./ipc/files-ipc"
import {
  defaultLibraryPath,
  ensureLibraryPath,
  registerSettingsIpc,
  settingsStore,
} from "./ipc/settings"
import { wrapIpc } from "./ipc/envelope"

const isDev = process.env.NODE_ENV === "development"

let mainWindow: BrowserWindow | null = null
let libraryService: LibraryService | null = null
let bootstrapped = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#191919",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    void mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools({ mode: "detach" })
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist-renderer/index.html"))
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function bootstrapLibrary(): void {
  if (bootstrapped) return
  const stored = settingsStore.getLibraryPath()
  const root = stored ?? defaultLibraryPath()
  const r = ensureLibraryPath(root)
  if (!r.ok) {
    // Library directory not accessible. The renderer's first-run picker
    // will allow the user to pick another location and call setLibraryPath,
    // which then triggers a relaunch via app:relaunch.
    console.error("Failed to access library path:", r.error)
    return
  }
  if (!stored) settingsStore.setLibraryPath(root)
  ensureMetaDirs(root)
  const { db } = openLibraryDb(root)
  const queries = new Queries(db)
  libraryService = new LibraryService({ db, queries, libraryRoot: root })
  const filesService = new FilesService({ db, queries, libraryRoot: root })
  registerLibraryIpc(libraryService)
  registerFilesIpc(filesService, db)
  bootstrapped = true
}

function registerShellIpc(): void {
  ipcMain.handle(
    "shell:reveal",
    wrapIpc<void, [string]>(async (_e, absPath) => {
      shell.showItemInFolder(absPath)
    }),
  )
  ipcMain.handle(
    "shell:open-external",
    wrapIpc<void, [string]>(async (_e, url) => {
      await shell.openExternal(url)
    }),
  )
}

function registerAppMetaIpc(): void {
  ipcMain.handle(
    "app:get-version",
    wrapIpc<string>(async () => app.getVersion()),
  )
  ipcMain.handle(
    "app:relaunch",
    wrapIpc<void>(async () => {
      app.relaunch()
      app.exit(0)
    }),
  )
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  void app.whenReady().then(() => {
    registerSettingsIpc(settingsStore)
    registerShellIpc()
    registerAppMetaIpc()
    bootstrapLibrary()
    createWindow()
  })

  app.on("window-all-closed", () => {
    libraryService?.close()
    if (process.platform !== "darwin") app.quit()
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
