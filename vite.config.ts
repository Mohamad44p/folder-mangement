import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: "./",
  build: {
    outDir: "dist-renderer",
    emptyOutDir: true,
    target: "chrome120",
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
