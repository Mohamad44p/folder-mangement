import { app, ipcMain, safeStorage } from "electron"
import * as fs from "node:fs"
import * as path from "node:path"
import { wrapIpc } from "./envelope"
import type { AiProvider } from "../../src/lib/library/types"

const KEYS_FILE = "ai-keys.dat"

function keysPath(): string {
  return path.join(app.getPath("userData"), KEYS_FILE)
}

function loadKeys(): Record<string, string> {
  const file = keysPath()
  if (!fs.existsSync(file)) return {}
  try {
    const buf = fs.readFileSync(file)
    if (!safeStorage.isEncryptionAvailable()) {
      return JSON.parse(buf.toString("utf8")) as Record<string, string>
    }
    const dec = safeStorage.decryptString(buf)
    return JSON.parse(dec) as Record<string, string>
  } catch {
    return {}
  }
}

function saveKeys(keys: Record<string, string>): void {
  const json = JSON.stringify(keys)
  const file = keysPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(file, safeStorage.encryptString(json) as unknown as Uint8Array)
  } else {
    fs.writeFileSync(file, json, "utf8")
  }
}

export function registerAiIpc(): void {
  ipcMain.handle(
    "ai:set-key",
    wrapIpc<void, [AiProvider, string]>(async (_e, provider, key) => {
      const keys = loadKeys()
      keys[provider] = key
      saveKeys(keys)
    }),
  )
  ipcMain.handle(
    "ai:get-key-status",
    wrapIpc<{ has: boolean }, [AiProvider]>(async (_e, provider) => {
      const keys = loadKeys()
      return { has: typeof keys[provider] === "string" && keys[provider].length > 0 }
    }),
  )
  ipcMain.handle(
    "ai:delete-key",
    wrapIpc<void, [AiProvider]>(async (_e, provider) => {
      const keys = loadKeys()
      delete keys[provider]
      saveKeys(keys)
    }),
  )
}
