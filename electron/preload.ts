import { contextBridge } from "electron"

contextBridge.exposeInMainWorld("api", {
  app: {
    getVersion: async (): Promise<string> => "0.1.0-stub",
  },
})
