import { app, BrowserWindow, shell, ipcMain } from "electron"
import * as fs from "node:fs"
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
import { registerFileMetaIpc } from "./ipc/file-meta"
import { registerCommentsIpc } from "./ipc/comments"
import { registerAnnotationsIpc } from "./ipc/annotations"
import { registerReactionsIpc } from "./ipc/reactions"
import { registerActivityIpc } from "./ipc/activity"
import { registerSavedSearchesIpc } from "./ipc/saved-searches"
import { registerFolderFieldsIpc } from "./ipc/folder-fields"
import { registerChecklistIpc } from "./ipc/checklist"
import { registerVersionsIpc } from "./ipc/versions"
import { registerTagsIpc } from "./ipc/tags"
import { registerPaletteIpc } from "./ipc/palette"
import { registerSmartFoldersIpc } from "./ipc/smart-folders"
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

function resolveIconPath(): string | undefined {
  // In dev, resolve relative to the repo. In production, the built renderer
  // is alongside dist-electron — public/icons/ ships as dist-renderer/icons/.
  const candidates = [
    path.join(__dirname, "..", "public", "icons", "folder4.png"),
    path.join(__dirname, "..", "dist-renderer", "icons", "folder4.png"),
    path.join(process.resourcesPath ?? "", "public", "icons", "folder4.png"),
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      // ignore
    }
  }
  return undefined
}

function createWindow(): void {
  const iconPath = resolveIconPath()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#191919",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  // Route any new-window request out to the OS browser; never spawn a renderer.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      void shell.openExternal(url)
    }
    return { action: "deny" }
  })

  // Block in-app navigation to anything that isn't our own renderer or the
  // dev server. External links go to the OS browser instead of replacing the
  // app's document.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      event.preventDefault()
      return
    }
    const isDevHost = parsed.host === "localhost:5173" && parsed.protocol.startsWith("http")
    const isLocalDoc = parsed.protocol === "file:" || parsed.protocol === "folders:"
    if (isDevHost || isLocalDoc) return
    event.preventDefault()
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      void shell.openExternal(url)
    }
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

  // Watcher is created first so it can be injected into the services and
  // suppress chokidar events for app-initiated disk mutations (mute/unmute).
  watcher = new LibraryWatcher({ libraryRoot: root })

  libraryService = new LibraryService({ db, queries, libraryRoot: root, watcher })
  const filesService = new FilesService({ db, queries, libraryRoot: root, watcher })
  registerLibraryIpc(libraryService)
  registerFilesIpc(filesService, db)
  registerSearchIpc(db)
  registerAiRealIpc(db)
  registerFileMetaIpc(db)
  registerCommentsIpc(db)
  registerAnnotationsIpc(db)
  registerReactionsIpc(db)
  registerActivityIpc(db)
  registerSavedSearchesIpc(db)
  registerFolderFieldsIpc(db)
  registerChecklistIpc(db)
  registerVersionsIpc(db, root)
  registerTagsIpc(db)
  registerPaletteIpc(db)
  registerSmartFoldersIpc(db)

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
    if (process.platform === "darwin") {
      const iconPath = resolveIconPath()
      if (iconPath && app.dock) {
        try {
          app.dock.setIcon(iconPath)
        } catch (err) {
          console.error("Failed to set macOS dock icon:", err)
        }
      }
    }
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
