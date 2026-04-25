import { contextBridge, ipcRenderer } from "electron"

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (!result.ok) {
    const err = new Error(result.error.message) as Error & { code?: string }
    err.code = result.error.code
    throw err
  }
  return result.data
}

contextBridge.exposeInMainWorld("api", {
  app: {
    getLibraryPath: (): Promise<string> => invoke("app:get-library-path"),
    hasLibraryPath: (): Promise<boolean> => invoke("app:has-library-path"),
    setLibraryPath: (absPath: string): Promise<void> =>
      invoke("app:set-library-path", absPath),
    getVersion: async (): Promise<string> => "0.1.0",
  },
})
