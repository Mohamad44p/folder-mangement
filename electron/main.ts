import { app, BrowserWindow, shell, ipcMain } from "electron"
import * as path from "node:path"
import { openLibraryDb } from "./db/open"
import { Queries } from "./db/queries"
import { ensureMetaDirs } from "./fs-ops"
import { LibraryService } from "./ipc/library"
import { registerLibraryIpc } from "./ipc/library-ipc"
import { FilesService } from "./ipc/files"
import { registerFilesIpc } from "./ipc/files-ipc"
import { LibraryWatcher } from "./ipc/fs-watcher"
import { reconcileLibrary } from "./ipc/reconcile"
import {
  defaultLibraryPath,
  ensureLibraryPath,
  registerSettingsIpc,
  settingsStore,
} from "./ipc/settings"
import { wrapIpc } from "./ipc/envelope"
import { registerAiIpc } from "./ipc/ai"
import { registerAiRealIpc } from "./ipc/ai-real"
import { registerSearchIpc } from "./ipc/search"
import { startAutoUpdate } from "./auto-update"
import {
  registerFoldersScheme,
  registerFoldersSchemePrivilege,
} from "./protocols/folders-scheme"

registerFoldersSchemePrivilege()

const isDev = process.env.NODE_ENV === "development"

let mainWindow: BrowserWindow | null = null
let libraryService: LibraryService | null = null
let watcher: LibraryWatcher | null = null
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

async function bootstrapLibrary(): Promise<void> {
  if (bootstrapped) return
  const stored = settingsStore.getLibraryPath()
  const root = stored ?? defaultLibraryPath()
  const r = ensureLibraryPath(root)
  if (!r.ok) {
    console.error("Failed to access library path:", r.error)
    return
  }
  if (!stored) settingsStore.setLibraryPath(root)
  ensureMetaDirs(root)
  const { db } = openLibraryDb(root)
  const queries = new Queries(db)

  registerFoldersScheme(db)

  await reconcileLibrary({ db, queries, libraryRoot: root })

  libraryService = new LibraryService({ db, queries, libraryRoot: root })
  const filesService = new FilesService({ db, queries, libraryRoot: root })
  registerLibraryIpc(libraryService)
  registerFilesIpc(filesService, db)
  registerSearchIpc(db)
  registerAiRealIpc(db)

  watcher = new LibraryWatcher({ libraryRoot: root })
  watcher.start()

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

  void app.whenReady().then(async () => {
    registerSettingsIpc(settingsStore)
    registerShellIpc()
    registerAppMetaIpc()
    registerAiIpc()
    await bootstrapLibrary()
    createWindow()
    startAutoUpdate(() => mainWindow)
  })

  app.on("window-all-closed", () => {
    void watcher?.stop()
    libraryService?.close()
    if (process.platform !== "darwin") app.quit()
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
