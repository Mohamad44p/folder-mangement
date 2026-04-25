import { app, ipcMain, safeStorage } from "electron"
import * as fs from "node:fs"
import * as path from "node:path"
import { wrapIpc } from "./envelope"
import type { AiProvider } from "../../src/lib/library/types"

const KEYS_FILE = "ai-keys.dat"
// Reserved key inside ai-keys.dat used to remember the user's preferred
// provider. Must not collide with any AiProvider value.
export const PREFERRED_KEY = "__preferred__"
const VALID_PROVIDERS: readonly AiProvider[] = ["anthropic", "openai", "openrouter"]

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
  ipcMain.handle(
    "ai:get-preferred",
    wrapIpc<AiProvider | null>(async () => {
      const keys = loadKeys()
      const v = keys[PREFERRED_KEY]
      return typeof v === "string" && VALID_PROVIDERS.includes(v as AiProvider)
        ? (v as AiProvider)
        : null
    }),
  )
  ipcMain.handle(
    "ai:set-preferred",
    wrapIpc<void, [AiProvider | null]>(async (_e, provider) => {
      const keys = loadKeys()
      if (provider === null) {
        delete keys[PREFERRED_KEY]
      } else if (VALID_PROVIDERS.includes(provider)) {
        keys[PREFERRED_KEY] = provider
      } else {
        throw Object.assign(new Error(`invalid provider: ${String(provider)}`), {
          code: "INVALID_INPUT",
        })
      }
      saveKeys(keys)
    }),
  )
}
