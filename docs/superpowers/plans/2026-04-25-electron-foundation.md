# Electron Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing Next.js + localStorage folder-management UI to a real Vite + React Router + Electron desktop app for Windows and macOS, with files stored on the user's disk and metadata in SQLite. No backend, no sync.

**Architecture:** Three-process Electron model — Main (Node, owns SQLite + filesystem), Preload (sandboxed `contextBridge` exposing typed `window.api`), Renderer (Chromium + React, sandboxed). Files live in a visible-mirror layout under `<library>/` with a hidden `.folders-app/` for the SQLite DB, thumbnails, trash, and version history. A custom `folders://<file-id>` protocol replaces base64 data URLs.

**Tech Stack:** Electron, Vite, React 19, React Router 6, TypeScript, better-sqlite3, chokidar, sharp, electron-builder, electron-updater, vitest, playwright-electron, bun (package manager).

**Spec:** `docs/superpowers/specs/2026-04-25-electron-foundation-design.md`

**Conventions:**
- Each task is self-contained: read the file paths, the steps run in order, code blocks are complete (not snippets — paste them verbatim).
- Run `bun run typecheck` after every task. Fail-fast on type errors.
- Run `bun run lint` before every commit. Fail on errors.
- Commit messages follow `<type>: <subject>` (no scope). Types: `chore`, `feat`, `refactor`, `test`, `docs`, `build`, `fix`.
- All commits include the trailer `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Run tests with `bun run test` (vitest). E2E with `bun run test:e2e`.
- All file paths are absolute from repo root: `D:\folders\` on the dev machine.

---

## Phase 0 — Repo prep & v0.app removal

### Task 0.1: Remove v0.app references and unused deps from package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read current package.json**

Run: `cat package.json` to confirm current state.

- [ ] **Step 2: Replace package.json with foundational deps**

Write the following to `package.json` (preserves shadcn/Radix/UI deps the renderer needs; removes Next.js, `@vercel/analytics`, and adds nothing yet — Electron + Vite added in later tasks):

```json
{
  "name": "folders",
  "version": "0.1.0",
  "private": true,
  "description": "Local-first folder management desktop app",
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@emotion/is-prop-valid": "latest",
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "1.2.2",
    "@radix-ui/react-alert-dialog": "1.1.4",
    "@radix-ui/react-aspect-ratio": "1.1.1",
    "@radix-ui/react-avatar": "1.1.2",
    "@radix-ui/react-checkbox": "1.1.3",
    "@radix-ui/react-collapsible": "1.1.2",
    "@radix-ui/react-context-menu": "2.2.4",
    "@radix-ui/react-dialog": "1.1.4",
    "@radix-ui/react-dropdown-menu": "2.1.4",
    "@radix-ui/react-hover-card": "1.1.4",
    "@radix-ui/react-label": "2.1.1",
    "@radix-ui/react-menubar": "1.1.4",
    "@radix-ui/react-navigation-menu": "1.2.3",
    "@radix-ui/react-popover": "1.1.4",
    "@radix-ui/react-progress": "1.1.1",
    "@radix-ui/react-radio-group": "1.2.2",
    "@radix-ui/react-scroll-area": "1.2.2",
    "@radix-ui/react-select": "2.1.4",
    "@radix-ui/react-separator": "1.1.1",
    "@radix-ui/react-slider": "1.2.2",
    "@radix-ui/react-slot": "1.1.1",
    "@radix-ui/react-switch": "1.1.2",
    "@radix-ui/react-tabs": "1.1.2",
    "@radix-ui/react-toast": "1.2.4",
    "@radix-ui/react-toggle": "1.1.1",
    "@radix-ui/react-toggle-group": "1.1.1",
    "@radix-ui/react-tooltip": "1.1.6",
    "autoprefixer": "^10.4.20",
    "canvas-confetti": "1.9.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "1.0.4",
    "date-fns": "4.1.0",
    "embla-carousel-react": "8.5.1",
    "framer-motion": "12.23.26",
    "input-otp": "1.4.1",
    "jszip": "^3.10.1",
    "lucide-react": "^0.454.0",
    "react": "19.2.0",
    "react-day-picker": "9.8.0",
    "react-dom": "19.2.0",
    "react-hook-form": "^7.60.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "2.15.4",
    "sonner": "^1.7.4",
    "tailwind-merge": "^3.3.1",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "1.4.0",
    "vaul": "^1.1.2",
    "zod": "3.25.76"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.9",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "baseline-browser-mapping": "^2.10.22",
    "eslint": "^9.0.0",
    "postcss": "^8.5",
    "tailwindcss": "^4.1.9",
    "typescript": "^6.0.3"
  },
  "overrides": {
    "baseline-browser-mapping": "^2.10.22"
  },
  "resolutions": {
    "baseline-browser-mapping": "^2.10.22"
  }
}
```

Removed since prior version: `next`, `next-themes`, `@vercel/analytics`, `sharp` (re-added later as a Node dep), `react-dom@19.2.0` is kept.

- [ ] **Step 3: Run `bun install` to refresh lockfile**

Run: `bun install`
Expected: completes without errors. `bun.lock` updated.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "$(cat <<'EOF'
chore: drop next, vercel analytics, and v0-only deps

Prepares package.json for the Vite + Electron migration. Next.js,
next-themes, @vercel/analytics removed. Renderer UI deps preserved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 0.2: Remove v0.app metadata from layout, README, and CLAUDE.md

**Files:**
- Modify: `app/layout.tsx` (temporary — full file gets relocated in Task 1.6)
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Edit `app/layout.tsx` — drop v0 metadata + Analytics**

Replace the entire file content:

```tsx
import type React from "react"
import type { Metadata } from "next"
import { Inter, Cairo } from "next/font/google"
import { GenerationProvider } from "@/contexts/generation-context"
import { FolderProvider } from "@/contexts/folder-context"
import { SettingsProvider } from "@/contexts/settings-context"
import { I18nProvider } from "@/contexts/i18n-context"
import { DndProvider } from "@/contexts/dnd-context"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
})
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "Folders",
  description: "Local-first folder management for Windows and macOS.",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cairo.variable}`}>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <SettingsProvider>
          <I18nProvider>
            <GenerationProvider>
              <DndProvider>
                <FolderProvider>{children}</FolderProvider>
              </DndProvider>
            </GenerationProvider>
          </I18nProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Replace `README.md`**

```markdown
# Folders

Local-first folder management for Windows and macOS.

## Status

In active migration from a Next.js prototype to a real Vite + Electron desktop app. See `docs/superpowers/specs/2026-04-25-electron-foundation-design.md` for the full plan.

## Development

```sh
bun install
bun run dev
```

## Build

```sh
bun run build
```
```

- [ ] **Step 3: Edit `CLAUDE.md` — replace the v0 sync section**

Replace the section starting `## v0.app sync` (the last section of the file) with:

```markdown
## Distribution

Built as an Electron desktop app for Windows and macOS via `electron-builder`. Auto-updates ship through GitHub Releases (`electron-updater`). The repository is no longer synced with v0.app.
```

- [ ] **Step 4: Verify nothing references `v0` or `vercel/analytics`**

Run: `grep -r "v0.app\|@vercel/analytics\|generator: \"v0" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.mjs" --include="*.json" .`
Expected: only matches inside `docs/superpowers/specs/` (historical) and `bun.lock` (transitive). Any other matches must be cleaned up.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx README.md CLAUDE.md
git commit -m "$(cat <<'EOF'
chore: remove v0.app integration metadata and references

Removes the v0 generator tag, the Vercel Analytics mount, and the v0
sync section from project docs. The repo is now a regular project.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Vite + React Router migration

### Task 1.1: Add Vite, React Router, and font deps

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the deps via bun**

Run:
```sh
bun add react-router-dom@^6.28.0
bun add -d vite@^6.0.0 @vitejs/plugin-react@^4.3.0 vite-tsconfig-paths@^5.1.0
bun add @fontsource-variable/inter@^5.1.0 @fontsource/cairo@^5.1.0
```

Expected: each completes; `package.json` and `bun.lock` updated.

- [ ] **Step 2: Verify versions in package.json**

Run: `grep -E '"(vite|react-router-dom|@fontsource)' package.json`
Expected: prints the four added dep lines.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "$(cat <<'EOF'
build: add vite, react-router, and bundled font deps

Vite + React Router replace Next.js for the renderer. Inter and Cairo
fonts are now bundled locally instead of fetched from Google CDN at
runtime, which is required for offline Electron use.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.2: Create `vite.config.ts` and `index.html`

**Files:**
- Create: `vite.config.ts`
- Create: `index.html`

- [ ] **Step 1: Create `vite.config.ts`**

```ts
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
```

- [ ] **Step 2: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Folders</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts index.html
git commit -m "$(cat <<'EOF'
build: scaffold vite config and html entry

vite.config.ts wires the React plugin and tsconfig path resolution.
The base is "./" so the production bundle works under file:// in
Electron. index.html is the renderer entry point.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.3: Move `components/`, `contexts/`, `lib/`, `hooks/` into `src/`

**Files:**
- Move: `components/` → `src/components/`
- Move: `contexts/` → `src/contexts/`
- Move: `lib/` → `src/lib/`
- Move: `hooks/` → `src/hooks/`

- [ ] **Step 1: Create `src/` and move directories with git**

Run:
```sh
mkdir -p src
git mv components src/components
git mv contexts src/contexts
git mv lib src/lib
git mv hooks src/hooks
```

Expected: `git status` shows renames, no content changes.

- [ ] **Step 2: Verify imports still resolve via `@/...` alias**

Run: `grep -r "from \"@/components\|from \"@/contexts\|from \"@/lib\|from \"@/hooks" src/ | head -5`
Expected: imports use `@/...` syntax. The `@/...` alias will be repointed to `src/` in Task 1.4.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: move renderer source into src/

components, contexts, lib, and hooks now live under src/. Imports use
the @/... path alias which is repointed in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.4: Update `tsconfig.json` for new layout

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Read current tsconfig.json**

Run: `cat tsconfig.json`

- [ ] **Step 2: Replace `tsconfig.json` content**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "useDefineForClassFields": true,
    "types": ["vite/client", "node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist-renderer", "dist-electron", "electron"]
}
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: may surface pre-existing type errors in moved code. Note them but do not fix unrelated errors here. Type errors *introduced* by this task (path resolution failures) must be 0.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json
git commit -m "$(cat <<'EOF'
refactor: point @/ alias at src/ and tighten tsconfig

@/* now resolves to src/* under the new layout. The compiler is set
to ES2022 / Bundler module resolution, which matches what Vite ships.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.5: Move `app/globals.css` to `src/index.css` and remove Next-specific bits

**Files:**
- Move: `app/globals.css` → `src/index.css`
- Modify: `src/index.css` (drop any `@import "next/..."` lines if present)

- [ ] **Step 1: Move with git**

Run: `git mv app/globals.css src/index.css`

- [ ] **Step 2: Read the file and confirm no Next-specific imports**

Run: `head -20 src/index.css`
Expected: Tailwind v4 `@import "tailwindcss"` and CSS variable definitions. If there is an `@import "next/font"` line, remove it (fonts are now imported in `src/main.tsx`).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: relocate globals.css to src/index.css

Vite uses src/index.css as the renderer's stylesheet entry. No
content changes; the file just moved alongside the rest of the
renderer code.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.6: Create `src/main.tsx` (provider stack + font imports)

**Files:**
- Create: `src/main.tsx`
- Delete: `app/layout.tsx`

- [ ] **Step 1: Create `src/main.tsx`**

```tsx
import "@fontsource-variable/inter"
import "@fontsource/cairo/300.css"
import "@fontsource/cairo/400.css"
import "@fontsource/cairo/500.css"
import "@fontsource/cairo/600.css"
import "@fontsource/cairo/700.css"
import "@fontsource/cairo/800.css"
import "./index.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { SettingsProvider } from "@/contexts/settings-context"
import { I18nProvider } from "@/contexts/i18n-context"
import { GenerationProvider } from "@/contexts/generation-context"
import { DndProvider } from "@/contexts/dnd-context"
import { FolderProvider } from "@/contexts/folder-context"
import { App } from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SettingsProvider>
      <I18nProvider>
        <GenerationProvider>
          <DndProvider>
            <FolderProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </FolderProvider>
          </DndProvider>
        </GenerationProvider>
      </I18nProvider>
    </SettingsProvider>
  </React.StrictMode>
)
```

Provider order matches the existing `app/layout.tsx` exactly (per CLAUDE.md: don't reorder).

- [ ] **Step 2: Delete the old `app/layout.tsx`**

Run: `git rm app/layout.tsx`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: replace next layout with vite main entry

src/main.tsx mounts the same provider stack the next app/ layout
used. Fonts are bundled via @fontsource so the app works offline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.7: Create `src/App.tsx` from `app/page.tsx`

**Files:**
- Create: `src/App.tsx`
- Delete: `app/page.tsx`
- Delete: `app/` (after both files moved)

- [ ] **Step 1: Read `app/page.tsx`**

Run: `cat app/page.tsx`

- [ ] **Step 2: Create `src/App.tsx`**

Copy the entire body of `app/page.tsx` and rename the exported function. The component is currently `export default function FoldersPage()` — rename to `export function App()`. Drop the `"use client"` directive (Vite has no concept of server vs client components).

The exact replacement:

```tsx
import { useState, useEffect, useRef, useCallback } from "react"
import confetti from "canvas-confetti"
import { ProjectFolder } from "@/components/project-folder"
import { Toaster } from "sonner"
import { FullpageLoader } from "@/components/fullpage-loader"
import { useGeneration } from "@/contexts/generation-context"
import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { useSettings } from "@/contexts/settings-context"
import { useDraggable, useDropTarget } from "@/contexts/dnd-context"
import { motion } from "framer-motion"
import { NewProjectSlot } from "@/components/new-project-slot"
import { FolderToolbar } from "@/components/folder-toolbar"
import { FolderDetailDialog } from "@/components/folder-detail-dialog"
import { GlobalSearchPalette } from "@/components/global-search-palette"
import { FolderSidebar } from "@/components/folder-sidebar"
import { ImageLightbox } from "@/components/image-lightbox"
import { TrashView } from "@/components/trash-view"
import { StatsFooter } from "@/components/stats-footer"
import { FolderTemplatePicker } from "@/components/folder-template-picker"
import { BulkRenameModal } from "@/components/bulk-rename-modal"
import { BulkEditModal } from "@/components/bulk-edit-modal"
import { DuplicateFinderModal } from "@/components/duplicate-finder-modal"
import { ShareFolderModal } from "@/components/share-folder-modal"
import { SmartFolderEditor } from "@/components/smart-folder-editor"
import { SmartFolderView } from "@/components/smart-folder-view"
import { SlideshowMode } from "@/components/slideshow-mode"
import { CompareMode } from "@/components/compare-mode"
import { WorkspacesModal } from "@/components/workspaces-modal"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import { CrossFolderRenameModal } from "@/components/cross-folder-rename-modal"
import { ActivityHeatmapModal } from "@/components/activity-heatmap-modal"
import { ExportModal, ImportModal } from "@/components/import-export-modal"
import { ImageSearchModal } from "@/components/image-search-modal"
import { OnboardingTour } from "@/components/onboarding-tour"
import { FolderContextMenu } from "@/components/folder-context-menu"
import { toast } from "sonner"
import type { Project } from "@/lib/data"

const PROJECT_CONFIGS = [
  {
    title: "How to Design a Fashion Brand",
    fileCount: 6,
    images: [
      "/newbrand-portrait-1.png",
      "/newbrand-portrait-2.png",
      "/newbrand-portrait-3.png",
      "/newbrand-portrait-4.png",
      "/newbrand-portrait-5.png",
    ],
  },
  {
    title: "Starting a Modern Company in New York",
    fileCount: 8,
    images: [
      "/brand-portrait-1.png",
      "/brand-portrait-2.png",
      "/brand-portrait-3.png",
      "/brand-portrait-4.png",
      "/brand-portrait-5.png",
    ],
  },
]

function CardDndWrapper({
  project,
  children,
}: {
  project: Project
  children: React.ReactNode
}) {
  const { moveFile, moveFolder, uploadFiles } = useFolders()
  const { t } = useT()
  const id = String(project.id)
  const drag = useDraggable({ kind: "folder", folderId: id, folderTitle: project.title })
  const drop = useDropTarget({
    id: `card-${id}`,
    accept: ["file", "folder", "os-files"],
    onDropItem: (item) => {
      if (item.kind === "file") {
        moveFile(item.folderId, item.fileId, id)
        toast.success("File moved")
      } else if (item.kind === "folder" && item.folderId !== id) {
        moveFolder(item.folderId, id)
        toast.success("Folder nested")
      }
    },
    onDropFiles: (files) => {
      uploadFiles(id, files)
      toast.success(
        files.length === 1 ? `Uploading ${files[0].name}` : `Uploading ${files.length} files`,
      )
    },
    canDrop: (item) => (item.kind === "folder" ? item.folderId !== id : true),
  })

  return (
    <div
      {...drop.dropProps}
      className={`relative rounded-2xl ${drop.isOver ? "accent-drop-ring" : ""}`}
    >
      <div {...drag.dragProps}>{children}</div>
      {drop.isOver && (
        <div className="absolute inset-0 rounded-2xl accent-drop-fill pointer-events-none flex items-center justify-center z-10">
          <div className="px-3 py-1.5 rounded-full accent-bg text-black text-[12px] font-medium">
            {t("dnd.dropToAdd")}
          </div>
        </div>
      )}
    </div>
  )
}

export function App() {
  const { startGeneration } = useGeneration()
  const {
    createFolder,
    deleteFolder,
    renameFolder,
    setFolderGenerating,
    getDisplayFolders,
    openFolder,
    searchQuery,
    selectedTags,
    filterKind,
  } = useFolders()
  const { t } = useT()
  const { theme } = useSettings()

  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const nextProjectIndexRef = useRef(0)
  const mainRef = useRef<HTMLElement>(null)

  const allProjects = getDisplayFolders()

  const handleCreateProject = useCallback(() => {
    const configIndex = nextProjectIndexRef.current
    const config = PROJECT_CONFIGS[configIndex]
    nextProjectIndexRef.current = (configIndex + 1) % PROJECT_CONFIGS.length

    const id = createFolder({
      title: config.title,
      fileCount: config.fileCount,
      images: config.images,
      isGenerating: true,
      progress: 0,
      createdAt: new Date().toISOString(),
      isEmpty: false,
    })

    startGeneration(id, () => {
      setFolderGenerating(id, false)
    })
  }, [createFolder, startGeneration, setFolderGenerating])

  const handleRemoveFolder = useCallback(
    (projectId: string) => {
      deleteFolder(projectId)
    },
    [deleteFolder],
  )

  const handleFolderClick = useCallback(
    (projectId: string) => {
      openFolder(projectId)
    },
    [openFolder],
  )

  const handleRenameProject = useCallback(
    (projectId: string, newTitle: string) => {
      renameFolder(projectId, newTitle)
    },
    [renameFolder],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  if (isLoading) {
    return <FullpageLoader duration={2000} />
  }

  const hasActiveFilters = !!searchQuery || selectedTags.length > 0 || filterKind !== "all"

  return (
    <div className="min-h-screen bg-[#191919] flex">
      <Toaster
        position="bottom-center"
        theme={theme}
        toastOptions={{
          style: {
            background: theme === "light" ? "#ffffff" : "#1A1A1A",
            border: theme === "light" ? "1px solid rgba(0, 0, 0, 0.1)" : "1px solid rgba(255, 255, 255, 0.08)",
            color: theme === "light" ? "#18181b" : "#fff",
            borderRadius: "12px",
          },
        }}
      />

      <FolderSidebar />

      <div
        className="flex-1 transition-all duration-700 ease-out min-w-0"
        style={{
          opacity: showContent ? 1 : 0,
          transform: showContent ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
        }}
      >
        <main ref={mainRef} className="flex-1 min-h-screen p-4 pt-12 sm:p-6 sm:pt-14 md:p-8 md:pt-16">
          <div className="mx-auto w-full max-w-[288px] sm:max-w-[600px] lg:max-w-[912px]">
            <div className="flex items-center justify-between h-12 mb-6">
              <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">{t("app.title")}</h1>
              <button
                className="text-sm font-medium text-black rounded-full hover:bg-white/90 transition-colors py-1.5 bg-card-foreground px-3 whitespace-nowrap"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = (rect.left + rect.width / 2) / window.innerWidth
                  const y = (rect.top + rect.height / 2) / window.innerHeight

                  const colors = ["#ffffff", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3"]

                  confetti({
                    particleCount: 40,
                    spread: 50,
                    origin: { x, y },
                    colors,
                    startVelocity: 20,
                    gravity: 0.6,
                    scalar: 0.8,
                    drift: 0,
                    ticks: 150,
                    shapes: ["circle"],
                    disableForReducedMotion: true,
                  })

                  setTimeout(() => {
                    confetti({
                      particleCount: 25,
                      spread: 70,
                      origin: { x, y: y - 0.05 },
                      colors,
                      startVelocity: 15,
                      gravity: 0.5,
                      scalar: 0.6,
                      drift: 0,
                      ticks: 120,
                      shapes: ["circle"],
                      disableForReducedMotion: true,
                    })
                  }, 100)
                }}
              >
                {t("app.startTrial")}
              </button>
            </div>

            <FolderToolbar />

            {allProjects.length === 0 && hasActiveFilters ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] py-16 text-center">
                <p className="text-sm text-white/50">
                  {searchQuery
                    ? t("empty.search", { q: searchQuery })
                    : t("empty.folders")}
                </p>
                <p className="text-[12px] text-white/30 mt-1">{t("empty.searchDesc")}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.05, ease: [0.32, 0.72, 0, 1] }}
                >
                  <NewProjectSlot onClick={handleCreateProject} />
                </motion.div>
                {allProjects.map((project, idx) => {
                  return (
                    <motion.div
                      key={project.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min(idx * 0.03, 0.3),
                        ease: [0.32, 0.72, 0, 1],
                        layout: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
                      }}
                    >
                      <FolderContextMenu folderId={String(project.id)}>
                        <CardDndWrapper project={project}>
                          <ProjectFolder
                            project={project}
                            index={idx}
                            onRemove={() => handleRemoveFolder(String(project.id))}
                            onCancel={() => handleRemoveFolder(String(project.id))}
                            onClick={() => handleFolderClick(String(project.id))}
                            onRename={(newTitle) => handleRenameProject(String(project.id), newTitle)}
                          />
                        </CardDndWrapper>
                      </FolderContextMenu>
                    </motion.div>
                  )
                })}
              </div>
            )}

            <StatsFooter />
          </div>
        </main>
      </div>

      <FolderDetailDialog />
      <SmartFolderView />
      <GlobalSearchPalette />
      <ImageLightbox />
      <TrashView />
      <FolderTemplatePicker />
      <BulkRenameModal />
      <BulkEditModal />
      <DuplicateFinderModal />
      <ShareFolderModal />
      <SmartFolderEditor />
      <SlideshowMode />
      <CompareMode />
      <WorkspacesModal />
      <ShortcutsModal />
      <CrossFolderRenameModal />
      <ActivityHeatmapModal />
      <ExportModal />
      <ImportModal />
      <ImageSearchModal />
      <OnboardingTour />
    </div>
  )
}
```

- [ ] **Step 3: Delete `app/page.tsx` and the now-empty `app/` directory**

Run:
```sh
git rm app/page.tsx
rmdir app 2>/dev/null || true
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: zero new errors. Pre-existing errors in moved code may remain — do not address them in this task.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: replace next page with vite App component

src/App.tsx is the renderer root. Markup and behaviour are unchanged
from app/page.tsx; only the export shape was adjusted to match the
new mount in src/main.tsx.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.8: Boot the Vite dev server and verify the existing UI renders

**Files:**
- Modify: `package.json` (add a `dev:renderer` script)

- [ ] **Step 1: Add the dev script**

Edit `package.json` `scripts` block to add:

```json
"dev:renderer": "vite"
```

- [ ] **Step 2: Boot Vite**

Run: `bun run dev:renderer`
Expected: Vite reports `Local: http://localhost:5173/` within ~3 s with no compile errors.

- [ ] **Step 3: Verify UI manually**

Open `http://localhost:5173/` in a browser. Confirm:
- The folder grid renders.
- Sidebar opens.
- Creating a folder via the new-folder slot works (this still uses localStorage).
- Toaster appears at bottom-center.

If any of these fail, the Vite migration is incomplete — fix before continuing.

- [ ] **Step 4: Stop Vite (Ctrl+C) and commit**

```bash
git add package.json
git commit -m "$(cat <<'EOF'
build: add bun run dev:renderer for vite dev server

The vite dev server boots and renders the existing UI on
localhost:5173. localStorage is still the storage backend; that
is replaced in a later phase.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.9: Drop `next.config.mjs`, `next-env.d.ts`, and remove the `_geistMono` dead code

**Files:**
- Delete: `next.config.mjs`
- Delete: `next-env.d.ts`
- Delete: `tsconfig.tsbuildinfo` (Next-specific build cache)
- Delete: `.next/` (build cache)

- [ ] **Step 1: Delete the files**

Run:
```sh
git rm next.config.mjs next-env.d.ts
rm -f tsconfig.tsbuildinfo
rm -rf .next
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors caused by removal.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
build: remove next.config.mjs and next-env.d.ts

These files only existed for Next.js. Vite has no equivalent need.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Electron shell scaffold

### Task 2.1: Add Electron, electron-builder, esbuild, and dev tooling

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add deps via bun**

Run:
```sh
bun add -d electron@^33.0.0 electron-builder@^25.0.0 electron-updater@^6.3.0
bun add -d esbuild@^0.24.0 concurrently@^9.1.0 wait-on@^8.0.0 cross-env@^7.0.3
bun add -d @types/wait-on
```

Expected: each completes; `package.json` and `bun.lock` updated.

- [ ] **Step 2: Commit**

```bash
git add package.json bun.lock
git commit -m "$(cat <<'EOF'
build: add electron, electron-builder, and dev tooling

Electron 33 (LTS), electron-builder for packaging, electron-updater
for auto-update against GitHub Releases. esbuild bundles the main
process; concurrently/wait-on coordinate dev with vite.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.2: Create the Electron TypeScript config and folder layout

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `tsconfig.electron.json`
- Modify: `tsconfig.json` (extend exclusion list — already done in Task 1.4)

- [ ] **Step 1: Create `tsconfig.electron.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@electron/*": ["electron/*"]
    }
  },
  "include": ["electron/**/*"],
  "exclude": ["node_modules", "dist-electron", "dist-renderer", "src"]
}
```

- [ ] **Step 2: Create stub `electron/main.ts`**

```ts
import { app, BrowserWindow } from "electron"
import * as path from "node:path"

const isDev = process.env.NODE_ENV === "development"

let mainWindow: BrowserWindow | null = null

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

  void app.whenReady().then(createWindow)

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
```

- [ ] **Step 3: Create stub `electron/preload.ts`**

```ts
import { contextBridge } from "electron"

contextBridge.exposeInMainWorld("api", {
  // Stub. Real handlers wired in Phase 6.
  app: {
    getVersion: async () => "0.1.0-stub",
  },
})
```

- [ ] **Step 4: Run electron typecheck**

Run: `bunx tsc -p tsconfig.electron.json --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.electron.json electron/
git commit -m "$(cat <<'EOF'
feat: scaffold electron main and preload processes

main.ts creates a BrowserWindow with contextIsolation and sandboxed
renderer. preload.ts exposes a stub window.api via contextBridge.
The single-instance lock prevents two app processes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.3: Add the build:electron script and wire dev to run vite + electron together

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Replace the `scripts` block in package.json**

```json
"scripts": {
  "dev": "concurrently -k -n vite,electron -c blue,magenta \"bun run dev:renderer\" \"bun run dev:electron\"",
  "dev:renderer": "vite",
  "dev:electron": "wait-on tcp:5173 && bun run build:electron && cross-env NODE_ENV=development electron dist-electron/main.js",
  "build": "bun run build:renderer && bun run build:electron",
  "build:renderer": "vite build",
  "build:electron": "esbuild electron/main.ts electron/preload.ts --bundle --platform=node --target=node20 --external:electron --external:better-sqlite3 --external:chokidar --external:sharp --outdir=dist-electron",
  "package": "bun run build && electron-builder",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit && tsc -p tsconfig.electron.json --noEmit",
  "test": "vitest",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 2: Boot dev**

Run: `bun run dev`
Expected:
- Vite reports `localhost:5173`.
- esbuild emits `dist-electron/main.js` and `preload.js`.
- Electron window opens, displaying the existing UI loaded from `localhost:5173`.

- [ ] **Step 3: Verify the app responds in Electron**

In the open Electron window: click "+ new folder", confirm a folder is created (still localStorage-backed). Quit with Cmd+Q / Alt+F4.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "$(cat <<'EOF'
build: wire bun run dev to vite + electron concurrently

Running bun run dev now boots the vite dev server and the electron
shell side-by-side. esbuild bundles the main process to
dist-electron/ before electron starts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.4: Add `dist-electron/` and `dist-renderer/` to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Read current .gitignore**

Run: `cat .gitignore`

- [ ] **Step 2: Append the new ignores**

Add at the bottom of `.gitignore`:

```
# Build output
dist-electron/
dist-renderer/
release/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
chore: ignore electron and renderer build output

dist-electron, dist-renderer, and release/ are emitted on every
build and should never be committed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — SQLite + schema

### Task 3.1: Add better-sqlite3, sharp, chokidar, and uuid

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add deps**

Run:
```sh
bun add better-sqlite3@^11.5.0 chokidar@^4.0.0 sharp@^0.34.5 uuid@^11.0.0
bun add -d @types/better-sqlite3 @types/uuid
bun add -d electron-rebuild@^3.2.9
```

- [ ] **Step 2: Configure native rebuild postinstall**

Edit `package.json` `scripts` to add:

```json
"postinstall": "electron-builder install-app-deps"
```

- [ ] **Step 3: Run postinstall to rebuild natives for Electron**

Run: `bun run postinstall`
Expected: `electron-builder` rebuilds `better-sqlite3` against the bundled Electron Node ABI without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "$(cat <<'EOF'
build: add better-sqlite3, sharp, chokidar, uuid

better-sqlite3 powers the local metadata DB. sharp generates
thumbnails. chokidar watches the library for FS changes. uuid
mints folder/file IDs. electron-rebuild via builder install-app-deps
keeps native modules ABI-compatible with electron.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.2: Create `electron/db/schema.sql` with the full initial schema

**Files:**
- Create: `electron/db/schema.sql`

- [ ] **Step 1: Create the schema file**

Paste the entire schema from spec §6.2 into `electron/db/schema.sql`. The full content:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS workspaces (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  icon         TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO workspaces (id, name, icon)
VALUES ('default', 'Personal', '🗂️');

CREATE TABLE IF NOT EXISTS folders (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id         TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  abs_path          TEXT NOT NULL UNIQUE,
  color             TEXT,
  icon              TEXT,
  cover_file_id     TEXT,
  notes             TEXT,
  is_favorite       INTEGER NOT NULL DEFAULT 0,
  is_pinned         INTEGER NOT NULL DEFAULT 0,
  is_archived       INTEGER NOT NULL DEFAULT 0,
  is_locked         INTEGER NOT NULL DEFAULT 0,
  workflow_status   TEXT,
  due_date          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS folders_parent     ON folders(parent_id);
CREATE INDEX IF NOT EXISTS folders_workspace  ON folders(workspace_id);
CREATE INDEX IF NOT EXISTS folders_deleted    ON folders(deleted_at);

CREATE TABLE IF NOT EXISTS files (
  id                TEXT PRIMARY KEY,
  folder_id         TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  abs_path          TEXT NOT NULL UNIQUE,
  type              TEXT NOT NULL,
  mime              TEXT,
  size              INTEGER,
  width             INTEGER,
  height            INTEGER,
  duration_ms       INTEGER,
  content_hash      TEXT,
  uploaded_at       TEXT NOT NULL DEFAULT (datetime('now')),
  modified_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT,
  rotation          INTEGER NOT NULL DEFAULT 0,
  flip_h            INTEGER NOT NULL DEFAULT 0,
  flip_v            INTEGER NOT NULL DEFAULT 0,
  is_favorite       INTEGER NOT NULL DEFAULT 0,
  is_pinned         INTEGER NOT NULL DEFAULT 0,
  ocr_text          TEXT,
  caption           TEXT,
  ai_tag_status     TEXT NOT NULL DEFAULT 'pending',
  description       TEXT,
  geo_lat           REAL,
  geo_lng           REAL
);

CREATE INDEX IF NOT EXISTS files_folder   ON files(folder_id);
CREATE INDEX IF NOT EXISTS files_hash     ON files(content_hash);
CREATE INDEX IF NOT EXISTS files_deleted  ON files(deleted_at);
CREATE INDEX IF NOT EXISTS files_type     ON files(type);

CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  name, ocr_text, caption, description,
  content='files', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, name, ocr_text, caption, description)
  VALUES (new.rowid, new.name, new.ocr_text, new.caption, new.description);
END;

CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, ocr_text, caption, description)
  VALUES ('delete', old.rowid, old.name, old.ocr_text, old.caption, old.description);
END;

CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, ocr_text, caption, description)
  VALUES ('delete', old.rowid, old.name, old.ocr_text, old.caption, old.description);
  INSERT INTO files_fts(rowid, name, ocr_text, caption, description)
  VALUES (new.rowid, new.name, new.ocr_text, new.caption, new.description);
END;

CREATE TABLE IF NOT EXISTS folder_tags (
  folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,
  PRIMARY KEY(folder_id, tag)
);

CREATE TABLE IF NOT EXISTS file_tags (
  file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY(file_id, tag)
);

CREATE TABLE IF NOT EXISTS file_ai_tags (
  file_id    TEXT REFERENCES files(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL,
  confidence REAL NOT NULL,
  PRIMARY KEY(file_id, tag)
);

CREATE TABLE IF NOT EXISTS file_annotations (
  id         TEXT PRIMARY KEY,
  file_id    TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  x          REAL, y REAL, w REAL, h REAL, x2 REAL, y2 REAL,
  color      TEXT, text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS file_comments (
  id         TEXT PRIMARY KEY,
  file_id    TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  parent_id  TEXT REFERENCES file_comments(id) ON DELETE CASCADE,
  author     TEXT,
  text       TEXT,
  resolved   INTEGER NOT NULL DEFAULT 0,
  timestamp  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS file_reactions (
  file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
  emoji   TEXT NOT NULL,
  by      TEXT NOT NULL,
  PRIMARY KEY(file_id, emoji, by)
);

CREATE TABLE IF NOT EXISTS file_versions (
  id           TEXT PRIMARY KEY,
  file_id      TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  abs_path     TEXT NOT NULL,
  size         INTEGER,
  content_hash TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS file_versions_file ON file_versions(file_id);

CREATE TABLE IF NOT EXISTS folder_activity (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  actor       TEXT,
  description TEXT,
  timestamp   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS folder_activity_folder ON folder_activity(folder_id);

CREATE TABLE IF NOT EXISTS folder_checklist (
  id         TEXT PRIMARY KEY,
  folder_id  TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS folder_custom_fields (
  folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  key       TEXT NOT NULL,
  value     TEXT NOT NULL,
  PRIMARY KEY(folder_id, key)
);

CREATE TABLE IF NOT EXISTS smart_folders (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  rules_json   TEXT NOT NULL,
  sort         TEXT,
  view         TEXT,
  density      TEXT,
  group_kind   TEXT,
  recents_only INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  query      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS file_exif (
  file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
  data    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_palette (
  file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
  colors  TEXT NOT NULL
);
```

- [ ] **Step 2: Commit**

```bash
git add electron/db/schema.sql
git commit -m "$(cat <<'EOF'
feat: add initial sqlite schema for the local library

Schema mirrors the existing FolderContext data model: folders,
files (with FTS5 triggers), tags, annotations, comments,
reactions, versions, activity, checklist, custom fields, smart
folders, saved searches, app settings, exif, palette.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.3: Create `electron/db/open.ts` (open DB, apply schema, integrity check)

**Files:**
- Create: `electron/db/open.ts`

- [ ] **Step 1: Create the file**

```ts
import Database from "better-sqlite3"
import * as fs from "node:fs"
import * as path from "node:path"

export interface OpenedDb {
  db: Database.Database
  path: string
}

export class IntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "IntegrityError"
  }
}

export function openLibraryDb(libraryRoot: string): OpenedDb {
  const metaDir = path.join(libraryRoot, ".folders-app")
  fs.mkdirSync(metaDir, { recursive: true })

  const dbPath = path.join(metaDir, "library.db")
  const db = new Database(dbPath)

  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  db.pragma("synchronous = NORMAL")

  applySchema(db)
  verifyIntegrity(db)

  return { db, path: dbPath }
}

function applySchema(db: Database.Database): void {
  const schemaPath = resolveSchemaPath()
  const sql = fs.readFileSync(schemaPath, "utf8")
  db.exec(sql)
}

function resolveSchemaPath(): string {
  // Production path: schema.sql ships alongside the bundled main.js.
  const candidates = [
    path.join(__dirname, "schema.sql"),
    path.join(__dirname, "..", "electron", "db", "schema.sql"),
    path.join(process.cwd(), "electron", "db", "schema.sql"),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  throw new Error("schema.sql not found in any candidate path")
}

function verifyIntegrity(db: Database.Database): void {
  const row = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string }
  if (row.integrity_check !== "ok") {
    throw new IntegrityError(`SQLite integrity check failed: ${row.integrity_check}`)
  }
}
```

- [ ] **Step 2: Run electron typecheck**

Run: `bunx tsc -p tsconfig.electron.json --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add electron/db/open.ts
git commit -m "$(cat <<'EOF'
feat: add openLibraryDb to open and verify the sqlite database

openLibraryDb creates the .folders-app dir if missing, opens the
DB with WAL journaling, applies schema.sql idempotently, and runs
PRAGMA integrity_check on every open. Failures throw IntegrityError
which the main process surfaces as a recovery screen later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.4: Add vitest and write the first DB integration test

**Files:**
- Create: `vitest.config.ts`
- Create: `electron/db/open.test.ts`
- Modify: `package.json` (vitest already added in Task 2.3 scripts)

- [ ] **Step 1: Add vitest**

Run:
```sh
bun add -d vitest@^2.1.0 @vitest/ui
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: [
      "src/**/*.test.{ts,tsx}",
      "electron/**/*.test.ts",
    ],
    exclude: ["node_modules", "dist-renderer", "dist-electron", "tests/e2e/**"],
  },
})
```

- [ ] **Step 3: Write the failing test `electron/db/open.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { openLibraryDb } from "./open"

describe("openLibraryDb", () => {
  let libraryRoot: string

  beforeEach(() => {
    libraryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "folders-test-"))
  })

  afterEach(() => {
    fs.rmSync(libraryRoot, { recursive: true, force: true })
  })

  it("creates .folders-app and library.db on first open", () => {
    const { db, path: dbPath } = openLibraryDb(libraryRoot)
    expect(fs.existsSync(path.join(libraryRoot, ".folders-app"))).toBe(true)
    expect(fs.existsSync(dbPath)).toBe(true)
    db.close()
  })

  it("seeds the default workspace", () => {
    const { db } = openLibraryDb(libraryRoot)
    const row = db.prepare("SELECT id, name FROM workspaces WHERE id = ?").get("default") as
      | { id: string; name: string }
      | undefined
    expect(row?.name).toBe("Personal")
    db.close()
  })

  it("applies schema idempotently across multiple opens", () => {
    let opened = openLibraryDb(libraryRoot)
    opened.db.close()
    opened = openLibraryDb(libraryRoot)
    const tables = opened.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[]
    expect(tables.map((t) => t.name)).toContain("folders")
    expect(tables.map((t) => t.name)).toContain("files")
    opened.db.close()
  })
})
```

- [ ] **Step 4: Run the test**

Run: `bun run test electron/db/open.test.ts`
Expected: PASS (3 tests). If any fail, fix `open.ts` before continuing.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts electron/db/open.test.ts package.json bun.lock
git commit -m "$(cat <<'EOF'
test: add vitest config and openLibraryDb integration tests

Three tests verify the DB open path: it creates .folders-app and
library.db, seeds the default workspace, and is safe to call
repeatedly on the same library.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.5: Create `electron/db/queries.ts` with prepared statements

**Files:**
- Create: `electron/db/queries.ts`

- [ ] **Step 1: Create the file**

```ts
import type Database from "better-sqlite3"

export interface FolderRow {
  id: string
  workspace_id: string
  parent_id: string | null
  name: string
  abs_path: string
  color: string | null
  icon: string | null
  cover_file_id: string | null
  notes: string | null
  is_favorite: number
  is_pinned: number
  is_archived: number
  is_locked: number
  workflow_status: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  sort_order: number
}

export interface FileRow {
  id: string
  folder_id: string
  name: string
  abs_path: string
  type: string
  mime: string | null
  size: number | null
  width: number | null
  height: number | null
  duration_ms: number | null
  content_hash: string | null
  uploaded_at: string
  modified_at: string
  deleted_at: string | null
  rotation: number
  flip_h: number
  flip_v: number
  is_favorite: number
  is_pinned: number
  ocr_text: string | null
  caption: string | null
  ai_tag_status: string
  description: string | null
  geo_lat: number | null
  geo_lng: number | null
}

export class Queries {
  // Folder queries
  readonly insertFolder
  readonly getFolderById
  readonly listFoldersByParent
  readonly listAllActiveFolders
  readonly listAllFolders
  readonly updateFolderName
  readonly updateFolderPath
  readonly updateFolderParentAndPath
  readonly softDeleteFolder
  readonly restoreFolder
  readonly hardDeleteFolder
  readonly emptyTrashFolders
  readonly listDeletedFolders
  readonly updateFolderField

  // File queries
  readonly insertFile
  readonly getFileById
  readonly listFilesByFolder
  readonly updateFileName
  readonly updateFilePath
  readonly updateFileFolderAndPath
  readonly softDeleteFile
  readonly restoreFile
  readonly hardDeleteFile
  readonly listDeletedFiles
  readonly findFileByHash

  // Tag queries
  readonly insertFolderTag
  readonly removeFolderTag
  readonly listFolderTags
  readonly insertFileTag
  readonly removeFileTag
  readonly listFileTags

  // Settings
  readonly getSetting
  readonly upsertSetting

  constructor(db: Database.Database) {
    this.insertFolder = db.prepare(`
      INSERT INTO folders (id, workspace_id, parent_id, name, abs_path, sort_order)
      VALUES (@id, @workspace_id, @parent_id, @name, @abs_path, @sort_order)
    `)
    this.getFolderById = db.prepare(`SELECT * FROM folders WHERE id = ?`)
    this.listFoldersByParent = db.prepare(`
      SELECT * FROM folders
      WHERE workspace_id = ? AND parent_id IS ? AND deleted_at IS NULL
      ORDER BY sort_order, created_at
    `)
    this.listAllActiveFolders = db.prepare(`
      SELECT * FROM folders WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY created_at
    `)
    this.listAllFolders = db.prepare(`
      SELECT * FROM folders WHERE workspace_id = ? ORDER BY created_at
    `)
    this.updateFolderName = db.prepare(`
      UPDATE folders SET name = ?, abs_path = ?, updated_at = datetime('now') WHERE id = ?
    `)
    this.updateFolderPath = db.prepare(`
      UPDATE folders SET abs_path = ?, updated_at = datetime('now') WHERE id = ?
    `)
    this.updateFolderParentAndPath = db.prepare(`
      UPDATE folders SET parent_id = ?, abs_path = ?, updated_at = datetime('now') WHERE id = ?
    `)
    this.softDeleteFolder = db.prepare(`
      UPDATE folders SET deleted_at = datetime('now') WHERE id = ?
    `)
    this.restoreFolder = db.prepare(`UPDATE folders SET deleted_at = NULL WHERE id = ?`)
    this.hardDeleteFolder = db.prepare(`DELETE FROM folders WHERE id = ?`)
    this.emptyTrashFolders = db.prepare(`DELETE FROM folders WHERE deleted_at IS NOT NULL`)
    this.listDeletedFolders = db.prepare(`
      SELECT * FROM folders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC
    `)
    this.updateFolderField = (field: keyof FolderRow) =>
      db.prepare(`UPDATE folders SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`)

    this.insertFile = db.prepare(`
      INSERT INTO files (
        id, folder_id, name, abs_path, type, mime, size,
        width, height, duration_ms, content_hash
      ) VALUES (
        @id, @folder_id, @name, @abs_path, @type, @mime, @size,
        @width, @height, @duration_ms, @content_hash
      )
    `)
    this.getFileById = db.prepare(`SELECT * FROM files WHERE id = ?`)
    this.listFilesByFolder = db.prepare(`
      SELECT * FROM files WHERE folder_id = ? AND deleted_at IS NULL ORDER BY uploaded_at
    `)
    this.updateFileName = db.prepare(`
      UPDATE files SET name = ?, abs_path = ?, modified_at = datetime('now') WHERE id = ?
    `)
    this.updateFilePath = db.prepare(`
      UPDATE files SET abs_path = ?, modified_at = datetime('now') WHERE id = ?
    `)
    this.updateFileFolderAndPath = db.prepare(`
      UPDATE files SET folder_id = ?, abs_path = ?, modified_at = datetime('now') WHERE id = ?
    `)
    this.softDeleteFile = db.prepare(`UPDATE files SET deleted_at = datetime('now') WHERE id = ?`)
    this.restoreFile = db.prepare(`UPDATE files SET deleted_at = NULL WHERE id = ?`)
    this.hardDeleteFile = db.prepare(`DELETE FROM files WHERE id = ?`)
    this.listDeletedFiles = db.prepare(`
      SELECT * FROM files WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC
    `)
    this.findFileByHash = db.prepare(`
      SELECT * FROM files WHERE content_hash = ? AND deleted_at IS NULL LIMIT 1
    `)

    this.insertFolderTag = db.prepare(
      `INSERT OR IGNORE INTO folder_tags (folder_id, tag) VALUES (?, ?)`,
    )
    this.removeFolderTag = db.prepare(`DELETE FROM folder_tags WHERE folder_id = ? AND tag = ?`)
    this.listFolderTags = db.prepare(`SELECT tag FROM folder_tags WHERE folder_id = ?`)
    this.insertFileTag = db.prepare(
      `INSERT OR IGNORE INTO file_tags (file_id, tag) VALUES (?, ?)`,
    )
    this.removeFileTag = db.prepare(`DELETE FROM file_tags WHERE file_id = ? AND tag = ?`)
    this.listFileTags = db.prepare(`SELECT tag FROM file_tags WHERE file_id = ?`)

    this.getSetting = db.prepare(`SELECT value FROM app_settings WHERE key = ?`)
    this.upsertSetting = db.prepare(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `bunx tsc -p tsconfig.electron.json --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add electron/db/queries.ts
git commit -m "$(cat <<'EOF'
feat: prepared sqlite statements for folder, file, tag, settings

The Queries class hands out reusable prepared statements covering
the operations the IPC handlers need. better-sqlite3 caches and
re-uses the compiled SQL across calls.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Library path setup & first-run

### Task 4.1: Add `electron/ipc/settings.ts` for library-path management

**Files:**
- Create: `electron/ipc/settings.ts`
- Create: `electron/ipc/settings.test.ts`

- [ ] **Step 1: Create `electron/ipc/settings.ts`**

```ts
import { app, ipcMain } from "electron"
import * as fs from "node:fs"
import * as path from "node:path"
import { wrapIpc, type IpcResult } from "./envelope"

const LIBRARY_PATH_KEY = "libraryPath"

export interface SettingsStore {
  getLibraryPath(): string | null
  setLibraryPath(absPath: string): void
}

class FileSettingsStore implements SettingsStore {
  private readonly file: string

  constructor() {
    this.file = path.join(app.getPath("userData"), "bootstrap-settings.json")
  }

  getLibraryPath(): string | null {
    if (!fs.existsSync(this.file)) return null
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8")) as Record<string, unknown>
      const v = raw[LIBRARY_PATH_KEY]
      return typeof v === "string" ? v : null
    } catch {
      return null
    }
  }

  setLibraryPath(absPath: string): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    fs.writeFileSync(this.file, JSON.stringify({ [LIBRARY_PATH_KEY]: absPath }), "utf8")
  }
}

export function defaultLibraryPath(): string {
  return path.join(app.getPath("home"), "Folders")
}

export function ensureLibraryPath(p: string): { ok: true } | { ok: false; error: string } {
  try {
    fs.mkdirSync(p, { recursive: true })
    fs.accessSync(p, fs.constants.R_OK | fs.constants.W_OK)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export function registerSettingsIpc(store: SettingsStore): void {
  ipcMain.handle(
    "app:get-library-path",
    wrapIpc<string>(async () => store.getLibraryPath() ?? defaultLibraryPath()),
  )
  ipcMain.handle(
    "app:set-library-path",
    wrapIpc<void, [string]>(async (_event, absPath) => {
      const r = ensureLibraryPath(absPath)
      if (!r.ok) throw Object.assign(new Error(r.error), { code: "FS_ERROR" })
      store.setLibraryPath(absPath)
    }),
  )
}

export const settingsStore: SettingsStore = new FileSettingsStore()
```

- [ ] **Step 2: Create `electron/ipc/envelope.ts` (used by all IPC handlers)**

```ts
import type { IpcMainInvokeEvent } from "electron"

export type IpcErrorCode =
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "PERMISSION_DENIED"
  | "DB_ERROR"
  | "FS_ERROR"
  | "INTEGRITY_ERROR"
  | "INVALID_INPUT"
  | "LIBRARY_MISSING"
  | "UNKNOWN"

export interface IpcError {
  code: IpcErrorCode
  message: string
  details?: Record<string, unknown>
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }

type IpcHandler<T, A extends unknown[]> = (event: IpcMainInvokeEvent, ...args: A) => Promise<T>

export function wrapIpc<T, A extends unknown[] = []>(
  handler: IpcHandler<T, A>,
): (event: IpcMainInvokeEvent, ...args: A) => Promise<IpcResult<T>> {
  return async (event, ...args) => {
    try {
      const data = await handler(event, ...args)
      return { ok: true, data }
    } catch (err) {
      const code = (err as { code?: IpcErrorCode })?.code ?? "UNKNOWN"
      return {
        ok: false,
        error: {
          code,
          message: (err as Error).message ?? "unknown error",
        },
      }
    }
  }
}
```

- [ ] **Step 3: Run electron typecheck**

Run: `bunx tsc -p tsconfig.electron.json --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add electron/ipc/settings.ts electron/ipc/envelope.ts
git commit -m "$(cat <<'EOF'
feat: ipc envelope and library-path settings store

The IPC envelope wraps every handler so renderer-side errors carry
a typed error code. The settings store persists the library path
in userData/bootstrap-settings.json before the SQLite DB is even
opened.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.2: Wire `registerSettingsIpc` into `electron/main.ts` and update preload

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: Update `electron/main.ts`**

```ts
import { app, BrowserWindow } from "electron"
import * as path from "node:path"
import { registerSettingsIpc, settingsStore } from "./ipc/settings"

const isDev = process.env.NODE_ENV === "development"

let mainWindow: BrowserWindow | null = null

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
    createWindow()
  })

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
```

- [ ] **Step 2: Update `electron/preload.ts`**

```ts
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
    getLibraryPath: () => invoke<string>("app:get-library-path"),
    setLibraryPath: (absPath: string) => invoke<void>("app:set-library-path", absPath),
    getVersion: async () => "0.1.0",
  },
})
```

- [ ] **Step 3: Run dev and verify**

Run: `bun run dev`
In the Electron window's DevTools console, type:
```js
await window.api.app.getLibraryPath()
```
Expected: returns the home-dir-relative `Folders` path.

Then:
```js
await window.api.app.setLibraryPath("C:/temp/folders-test")
await window.api.app.getLibraryPath()
```
Expected: returns the new path.

- [ ] **Step 4: Stop dev and commit**

```bash
git add electron/
git commit -m "$(cat <<'EOF'
feat: wire library-path ipc handlers and preload bridge

window.api.app.getLibraryPath / setLibraryPath now work through
ipcRenderer.invoke. Preload converts the IPC envelope into thrown
Errors with code property so the renderer sees a normal Promise.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.3: First-run library-picker UI

**Files:**
- Create: `src/components/library-picker.tsx`
- Modify: `src/App.tsx` (mount the picker on first run)
- Create: `src/lib/library/types.ts`
- Create: `src/lib/library/index.ts`

- [ ] **Step 1: Create `src/lib/library/types.ts`** (minimum types for now — extended later)

```ts
declare global {
  interface Window {
    api: {
      app: {
        getLibraryPath: () => Promise<string>
        setLibraryPath: (absPath: string) => Promise<void>
        getVersion: () => Promise<string>
      }
    }
  }
}

export {}
```

- [ ] **Step 2: Create `src/lib/library/index.ts`**

```ts
import "./types"

export const library = {
  app: {
    getLibraryPath: () => window.api.app.getLibraryPath(),
    setLibraryPath: (p: string) => window.api.app.setLibraryPath(p),
    getVersion: () => window.api.app.getVersion(),
  },
}
```

- [ ] **Step 3: Create `src/components/library-picker.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import { library } from "@/lib/library"

interface Props {
  onConfirmed: (libraryPath: string) => void
}

export function LibraryPicker({ onConfirmed }: Props) {
  const [defaultPath, setDefaultPath] = useState<string>("")
  const [chosen, setChosen] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void library.app.getLibraryPath().then((p) => {
      setDefaultPath(p)
      setChosen(p)
    })
  }, [])

  async function handleConfirm() {
    setError(null)
    setSubmitting(true)
    try {
      await library.app.setLibraryPath(chosen)
      onConfirmed(chosen)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#191919] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-[#1A1A1A] p-6">
        <h1 className="text-xl font-semibold text-white mb-2">Welcome to Folders</h1>
        <p className="text-sm text-white/60 mb-6">
          Choose where your library lives on disk. Folders and files you create will
          be saved here as real files you can open in Explorer or Finder.
        </p>
        <label className="block text-xs uppercase tracking-wide text-white/40 mb-2">
          Library location
        </label>
        <input
          type="text"
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
          className="w-full rounded-md bg-black/40 border border-white/[0.08] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
        />
        {chosen !== defaultPath && (
          <button
            type="button"
            onClick={() => setChosen(defaultPath)}
            className="mt-2 text-[12px] text-white/40 hover:text-white/70"
          >
            Reset to default
          </button>
        )}
        {error && (
          <p className="mt-3 text-[12px] text-red-400">{error}</p>
        )}
        <button
          type="button"
          disabled={submitting || !chosen.trim()}
          onClick={handleConfirm}
          className="mt-6 w-full rounded-full bg-white text-black text-sm font-medium py-2 hover:bg-white/90 disabled:opacity-50"
        >
          {submitting ? "Setting up…" : "Continue"}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Mount the picker in `src/App.tsx`**

Add at the top of the `App` function body, before the existing `useState(true)` for `isLoading`:

```tsx
const [libraryReady, setLibraryReady] = useState<boolean | null>(null)

useEffect(() => {
  void (async () => {
    try {
      const p = await library.app.getLibraryPath()
      setLibraryReady(typeof p === "string" && p.length > 0 ? true : false)
    } catch {
      setLibraryReady(false)
    }
  })()
}, [])

if (libraryReady === null) {
  return <FullpageLoader duration={400} />
}

if (libraryReady === false) {
  return (
    <LibraryPicker
      onConfirmed={() => {
        setLibraryReady(true)
      }}
    />
  )
}
```

Add the imports at the top of `src/App.tsx`:

```tsx
import { LibraryPicker } from "@/components/library-picker"
import { library } from "@/lib/library"
```

(The existing `useState`/`useEffect`/`FullpageLoader` imports are already present.)

Note: this is intentionally a minimal first-run check. After Phase 5 wires up the real `setLibraryPath` validation, the bootstrap settings file will only be written when `ensureLibraryPath` succeeds. For now any non-empty string returned from `getLibraryPath` counts as "ready".

- [ ] **Step 5: Verify in dev**

Run: `bun run dev`. Delete `userData/bootstrap-settings.json` first if present (`%APPDATA%/Electron/bootstrap-settings.json` on Windows). Expected: app shows the library-picker; entering a path and clicking Continue advances to the existing UI.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: first-run library-location picker

A minimal picker collects the library path on first launch and
persists it via window.api.app.setLibraryPath. The renderer holds
off mounting the main UI until the path is set.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Filesystem operations layer

### Task 5.1: Create `electron/fs-ops.ts` skeleton with helpers

**Files:**
- Create: `electron/fs-ops.ts`
- Create: `electron/fs-ops.test.ts`

- [ ] **Step 1: Write the failing test `electron/fs-ops.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import {
  hashFileStream,
  resolveCollision,
  atomicCreateDir,
  atomicRename,
  atomicMoveToTrash,
} from "./fs-ops"

describe("fs-ops", () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "folders-fs-test-"))
    fs.mkdirSync(path.join(root, ".folders-app", "trash"), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  describe("resolveCollision", () => {
    it("returns the original path when no collision", () => {
      expect(resolveCollision(path.join(root, "Brand"))).toBe(path.join(root, "Brand"))
    })

    it("appends (2) on first collision", () => {
      fs.mkdirSync(path.join(root, "Brand"))
      expect(resolveCollision(path.join(root, "Brand"))).toBe(path.join(root, "Brand (2)"))
    })

    it("preserves extension when colliding on a file", () => {
      fs.writeFileSync(path.join(root, "image.png"), "x")
      expect(resolveCollision(path.join(root, "image.png"))).toBe(
        path.join(root, "image (2).png"),
      )
    })

    it("walks past multiple collisions", () => {
      fs.writeFileSync(path.join(root, "a.txt"), "x")
      fs.writeFileSync(path.join(root, "a (2).txt"), "x")
      fs.writeFileSync(path.join(root, "a (3).txt"), "x")
      expect(resolveCollision(path.join(root, "a.txt"))).toBe(path.join(root, "a (4).txt"))
    })
  })

  describe("atomicCreateDir", () => {
    it("creates and returns the resolved path", () => {
      const p = atomicCreateDir(path.join(root, "Brand"))
      expect(p).toBe(path.join(root, "Brand"))
      expect(fs.statSync(p).isDirectory()).toBe(true)
    })

    it("resolves collisions automatically", () => {
      fs.mkdirSync(path.join(root, "Brand"))
      const p = atomicCreateDir(path.join(root, "Brand"))
      expect(p).toBe(path.join(root, "Brand (2)"))
    })
  })

  describe("atomicRename", () => {
    it("renames a folder and returns the new path", () => {
      fs.mkdirSync(path.join(root, "old"))
      const p = atomicRename(path.join(root, "old"), path.join(root, "new"))
      expect(p).toBe(path.join(root, "new"))
      expect(fs.existsSync(path.join(root, "old"))).toBe(false)
      expect(fs.existsSync(path.join(root, "new"))).toBe(true)
    })

    it("resolves destination collisions", () => {
      fs.mkdirSync(path.join(root, "a"))
      fs.mkdirSync(path.join(root, "b"))
      const p = atomicRename(path.join(root, "a"), path.join(root, "b"))
      expect(p).toBe(path.join(root, "b (2)"))
    })
  })

  describe("atomicMoveToTrash", () => {
    it("relocates the entry into .folders-app/trash preserving relative path", () => {
      fs.mkdirSync(path.join(root, "Brand"))
      const original = path.join(root, "Brand")
      const moved = atomicMoveToTrash(root, original)
      expect(fs.existsSync(original)).toBe(false)
      expect(fs.existsSync(moved)).toBe(true)
      expect(moved.startsWith(path.join(root, ".folders-app", "trash"))).toBe(true)
    })
  })

  describe("hashFileStream", () => {
    it("returns a sha256 hex string", async () => {
      const file = path.join(root, "x.txt")
      fs.writeFileSync(file, "hello")
      const h = await hashFileStream(file)
      expect(h).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
    })
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `bun run test electron/fs-ops.test.ts`
Expected: FAIL — `Cannot find module './fs-ops'`.

- [ ] **Step 3: Implement `electron/fs-ops.ts`**

```ts
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"

const META_DIR = ".folders-app"
const TRASH_DIR = "trash"

export function resolveCollision(targetPath: string): string {
  if (!fs.existsSync(targetPath)) return targetPath
  const dir = path.dirname(targetPath)
  const base = path.basename(targetPath)
  const ext = path.extname(base)
  const stem = ext ? base.slice(0, -ext.length) : base
  for (let i = 2; i < 10_000; i++) {
    const candidate = path.join(dir, `${stem} (${i})${ext}`)
    if (!fs.existsSync(candidate)) return candidate
  }
  throw Object.assign(new Error("Could not resolve filename collision"), { code: "FS_ERROR" })
}

export function atomicCreateDir(targetPath: string): string {
  const final = resolveCollision(targetPath)
  fs.mkdirSync(final, { recursive: false })
  return final
}

export function atomicRename(source: string, target: string): string {
  const final = resolveCollision(target)
  fs.renameSync(source, final)
  return final
}

export function atomicMoveToTrash(libraryRoot: string, absPath: string): string {
  const rel = path.relative(libraryRoot, absPath)
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw Object.assign(new Error(`Path is outside the library: ${absPath}`), {
      code: "INVALID_INPUT",
    })
  }
  const trashRoot = path.join(libraryRoot, META_DIR, TRASH_DIR)
  fs.mkdirSync(trashRoot, { recursive: true })
  const target = path.join(trashRoot, rel)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const final = resolveCollision(target)
  fs.renameSync(absPath, final)
  return final
}

export function hashFileStream(absPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    const stream = fs.createReadStream(absPath)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}

export function writeBytesAtomic(targetPath: string, bytes: Buffer | Uint8Array): string {
  const final = resolveCollision(targetPath)
  const tmp = `${final}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, bytes)
  fs.renameSync(tmp, final)
  return final
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `bun run test electron/fs-ops.test.ts`
Expected: PASS — 9 assertions.

- [ ] **Step 5: Commit**

```bash
git add electron/fs-ops.ts electron/fs-ops.test.ts
git commit -m "$(cat <<'EOF'
feat: atomic filesystem operations with collision resolution

Adds resolveCollision, atomicCreateDir, atomicRename,
atomicMoveToTrash, hashFileStream, writeBytesAtomic. All ops are
either a single fs.renameSync (atomic on same filesystem) or a
tmp-write-then-rename. Trash relocations preserve the original
relative path so restore is straightforward later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6 — IPC handlers (library + files)

### Task 6.1: Create the shared types module `src/lib/library/types.ts` (full version)

**Files:**
- Modify: `src/lib/library/types.ts`

- [ ] **Step 1: Replace the file content**

```ts
export type FolderFileType = "image" | "video" | "document" | "other"

export interface CreateFolderInput {
  parentId: string | null
  name: string
  workspaceId?: string
}

export interface FolderRecord {
  id: string
  workspaceId: string
  parentId: string | null
  name: string
  absPath: string
  color?: string
  icon?: string
  coverFileId?: string
  notes?: string
  isFavorite: boolean
  isPinned: boolean
  isArchived: boolean
  isLocked: boolean
  workflowStatus?: "todo" | "in-progress" | "review" | "done"
  dueDate?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  sortOrder: number
}

export interface FileRecord {
  id: string
  folderId: string
  name: string
  absPath: string
  url: string  // folders://<id>
  type: FolderFileType
  mime?: string
  size?: number
  width?: number
  height?: number
  durationMs?: number
  contentHash?: string
  uploadedAt: string
  modifiedAt: string
  deletedAt?: string
  rotation: number
  flipH: boolean
  flipV: boolean
  isFavorite: boolean
  isPinned: boolean
  ocrText?: string
  caption?: string
  aiTagStatus: "pending" | "done" | "failed" | "skipped"
  description?: string
  geo?: { lat: number; lng: number }
}

export interface UploadItem {
  name: string
  mime: string
  bytes: Uint8Array | ArrayBuffer
}

export interface SearchHit {
  fileId: string
  folderId: string
  matchedField: "name" | "ocr_text" | "caption" | "description"
  snippet: string
}

export type AiProvider = "openai" | "anthropic" | "google"

export type FsChangedPayload = {
  kind: "added" | "removed" | "renamed" | "modified"
  path: string
}

export interface WindowApi {
  library: {
    listAllFolders: () => Promise<FolderRecord[]>
    listFolders: (parentId: string | null) => Promise<FolderRecord[]>
    getFolder: (id: string) => Promise<FolderRecord | null>
    createFolder: (input: CreateFolderInput) => Promise<FolderRecord>
    renameFolder: (id: string, name: string) => Promise<FolderRecord>
    deleteFolder: (id: string) => Promise<void>
    restoreFolder: (id: string) => Promise<void>
    permanentlyDeleteFolder: (id: string) => Promise<void>
    moveFolder: (id: string, newParentId: string | null) => Promise<FolderRecord>
    updateFolderMetadata: (
      id: string,
      patch: Partial<
        Pick<FolderRecord, "color" | "icon" | "notes" | "isFavorite" | "isPinned" | "isArchived" | "isLocked" | "workflowStatus" | "dueDate" | "coverFileId">
      >,
    ) => Promise<FolderRecord>
    listDeletedFolders: () => Promise<FolderRecord[]>
  }
  files: {
    listInFolder: (folderId: string) => Promise<FileRecord[]>
    upload: (folderId: string, items: UploadItem[]) => Promise<FileRecord[]>
    delete: (folderId: string, fileId: string) => Promise<void>
    move: (srcFolderId: string, fileId: string, dstFolderId: string) => Promise<FileRecord>
    rename: (folderId: string, fileId: string, name: string) => Promise<FileRecord>
    setMetadata: (
      folderId: string,
      fileId: string,
      patch: Partial<
        Pick<FileRecord, "isFavorite" | "isPinned" | "rotation" | "flipH" | "flipV" | "description" | "caption" | "ocrText" | "aiTagStatus" | "geo">
      >,
    ) => Promise<FileRecord>
    bulkUpdate: (folderId: string, fileIds: string[], patch: Partial<FileRecord>) => Promise<void>
    bulkDelete: (folderId: string, fileIds: string[]) => Promise<void>
    bulkMove: (srcFolderId: string, fileIds: string[], dstFolderId: string) => Promise<void>
    revealInOS: (folderId: string, fileId: string) => Promise<void>
  }
  search: {
    fts: (query: string) => Promise<SearchHit[]>
  }
  ai: {
    setKey: (provider: AiProvider, key: string) => Promise<void>
    getKeyStatus: (provider: AiProvider) => Promise<{ has: boolean }>
    deleteKey: (provider: AiProvider) => Promise<void>
  }
  events: {
    on: (
      event: "fs-changed" | "thumb-ready" | "reconcile-progress",
      handler: (payload: unknown) => void,
    ) => () => void
  }
  shell: {
    revealInExplorer: (absPath: string) => Promise<void>
    openExternal: (url: string) => Promise<void>
  }
  app: {
    getLibraryPath: () => Promise<string>
    setLibraryPath: (absPath: string) => Promise<void>
    getVersion: () => Promise<string>
    relaunch: () => Promise<void>
  }
}

declare global {
  interface Window {
    api: WindowApi
  }
}

export {}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/library/types.ts
git commit -m "$(cat <<'EOF'
refactor: define the full window.api type surface

types.ts is the single source of truth shared between the renderer
wrapper and the electron handlers. Each surface (library, files,
search, ai, events, shell, app) is fully typed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6.2: Implement `electron/ipc/library.ts` — folder CRUD

**Files:**
- Create: `electron/ipc/library.ts`
- Create: `electron/ipc/library.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { openLibraryDb } from "../db/open"
import { Queries } from "../db/queries"
import { LibraryService } from "./library"

describe("LibraryService", () => {
  let root: string
  let svc: LibraryService

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "folders-lib-test-"))
    const { db } = openLibraryDb(root)
    svc = new LibraryService({ db, queries: new Queries(db), libraryRoot: root })
  })

  afterEach(() => {
    svc.close()
    fs.rmSync(root, { recursive: true, force: true })
  })

  it("creates a top-level folder on disk and in the DB", async () => {
    const f = await svc.createFolder({ parentId: null, name: "Brand" })
    expect(f.name).toBe("Brand")
    expect(fs.existsSync(f.absPath)).toBe(true)
    const fromDb = await svc.getFolder(f.id)
    expect(fromDb?.id).toBe(f.id)
  })

  it("creates a nested folder under an existing parent", async () => {
    const parent = await svc.createFolder({ parentId: null, name: "Brand" })
    const child = await svc.createFolder({ parentId: parent.id, name: "Logos" })
    expect(child.parentId).toBe(parent.id)
    expect(child.absPath).toBe(path.join(parent.absPath, "Logos"))
    expect(fs.existsSync(child.absPath)).toBe(true)
  })

  it("resolves collision when creating a folder with the same name", async () => {
    const a = await svc.createFolder({ parentId: null, name: "Brand" })
    const b = await svc.createFolder({ parentId: null, name: "Brand" })
    expect(a.name).toBe("Brand")
    expect(b.name).toBe("Brand (2)")
  })

  it("renames a folder on disk and in DB", async () => {
    const f = await svc.createFolder({ parentId: null, name: "Brand" })
    const renamed = await svc.renameFolder(f.id, "Branding")
    expect(renamed.name).toBe("Branding")
    expect(fs.existsSync(f.absPath)).toBe(false)
    expect(fs.existsSync(renamed.absPath)).toBe(true)
  })

  it("renaming a nested folder updates descendant paths", async () => {
    const parent = await svc.createFolder({ parentId: null, name: "Brand" })
    const child = await svc.createFolder({ parentId: parent.id, name: "Logos" })
    await svc.renameFolder(parent.id, "Branding")
    const reloaded = await svc.getFolder(child.id)
    expect(reloaded?.absPath.endsWith(path.join("Branding", "Logos"))).toBe(true)
  })

  it("soft-deletes a folder by moving it to trash", async () => {
    const f = await svc.createFolder({ parentId: null, name: "Brand" })
    await svc.deleteFolder(f.id)
    expect(fs.existsSync(f.absPath)).toBe(false)
    const reloaded = await svc.getFolder(f.id)
    expect(reloaded?.deletedAt).toBeTruthy()
  })

  it("restores a soft-deleted folder back to its original location", async () => {
    const f = await svc.createFolder({ parentId: null, name: "Brand" })
    const original = f.absPath
    await svc.deleteFolder(f.id)
    await svc.restoreFolder(f.id)
    const reloaded = await svc.getFolder(f.id)
    expect(reloaded?.deletedAt).toBeUndefined()
    expect(fs.existsSync(reloaded!.absPath)).toBe(true)
    expect(reloaded!.absPath).toBe(original)
  })

  it("moves a folder to a new parent", async () => {
    const a = await svc.createFolder({ parentId: null, name: "A" })
    const b = await svc.createFolder({ parentId: null, name: "B" })
    const moved = await svc.moveFolder(a.id, b.id)
    expect(moved.parentId).toBe(b.id)
    expect(moved.absPath.startsWith(b.absPath)).toBe(true)
    expect(fs.existsSync(moved.absPath)).toBe(true)
  })

  it("listAllFolders returns only active (non-deleted) folders by default workspace", async () => {
    await svc.createFolder({ parentId: null, name: "A" })
    const b = await svc.createFolder({ parentId: null, name: "B" })
    await svc.deleteFolder(b.id)
    const all = await svc.listAllFolders()
    expect(all.map((f) => f.name)).toEqual(["A"])
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `bun run test electron/ipc/library.test.ts`
Expected: FAIL — `Cannot find module './library'`.

- [ ] **Step 3: Implement `electron/ipc/library.ts`**

```ts
import type Database from "better-sqlite3"
import * as fs from "node:fs"
import * as path from "node:path"
import { v4 as uuid } from "uuid"
import { Queries, type FolderRow } from "../db/queries"
import {
  atomicCreateDir,
  atomicMoveToTrash,
  atomicRename,
} from "../fs-ops"
import type {
  CreateFolderInput,
  FolderRecord,
} from "../../src/lib/library/types"

interface LibraryDeps {
  db: Database.Database
  queries: Queries
  libraryRoot: string
}

const DEFAULT_WORKSPACE = "default"

export class LibraryService {
  private readonly db: Database.Database
  private readonly q: Queries
  private readonly root: string

  constructor(deps: LibraryDeps) {
    this.db = deps.db
    this.q = deps.queries
    this.root = deps.libraryRoot
  }

  close(): void {
    this.db.close()
  }

  async listAllFolders(): Promise<FolderRecord[]> {
    const rows = this.q.listAllActiveFolders.all(DEFAULT_WORKSPACE) as FolderRow[]
    return rows.map(toRecord)
  }

  async listFolders(parentId: string | null): Promise<FolderRecord[]> {
    const rows = this.q.listFoldersByParent.all(DEFAULT_WORKSPACE, parentId) as FolderRow[]
    return rows.map(toRecord)
  }

  async getFolder(id: string): Promise<FolderRecord | null> {
    const row = this.q.getFolderById.get(id) as FolderRow | undefined
    return row ? toRecord(row) : null
  }

  async createFolder(input: CreateFolderInput): Promise<FolderRecord> {
    const parentRow = input.parentId
      ? (this.q.getFolderById.get(input.parentId) as FolderRow | undefined)
      : undefined
    if (input.parentId && !parentRow) {
      throw notFound(`parent folder ${input.parentId} does not exist`)
    }
    const parentPath = parentRow?.abs_path ?? this.root
    const proposed = path.join(parentPath, sanitizeName(input.name))
    const finalPath = atomicCreateDir(proposed)
    const id = uuid()
    const tx = this.db.transaction(() => {
      this.q.insertFolder.run({
        id,
        workspace_id: input.workspaceId ?? DEFAULT_WORKSPACE,
        parent_id: input.parentId,
        name: path.basename(finalPath),
        abs_path: finalPath,
        sort_order: 0,
      })
    })
    tx()
    const row = this.q.getFolderById.get(id) as FolderRow
    return toRecord(row)
  }

  async renameFolder(id: string, name: string): Promise<FolderRecord> {
    const row = this.q.getFolderById.get(id) as FolderRow | undefined
    if (!row) throw notFound(`folder ${id} not found`)
    const newPath = path.join(path.dirname(row.abs_path), sanitizeName(name))
    const finalPath = atomicRename(row.abs_path, newPath)
    const finalName = path.basename(finalPath)
    const tx = this.db.transaction(() => {
      this.q.updateFolderName.run(finalName, finalPath, id)
      this.cascadePathUpdate(row.abs_path, finalPath)
    })
    tx()
    const updated = this.q.getFolderById.get(id) as FolderRow
    return toRecord(updated)
  }

  async deleteFolder(id: string): Promise<void> {
    const row = this.q.getFolderById.get(id) as FolderRow | undefined
    if (!row) return
    if (fs.existsSync(row.abs_path)) {
      atomicMoveToTrash(this.root, row.abs_path)
    }
    this.q.softDeleteFolder.run(id)
  }

  async restoreFolder(id: string): Promise<void> {
    const row = this.q.getFolderById.get(id) as FolderRow | undefined
    if (!row) return
    const trashed = path.join(this.root, ".folders-app", "trash", path.relative(this.root, row.abs_path))
    if (fs.existsSync(trashed)) {
      fs.mkdirSync(path.dirname(row.abs_path), { recursive: true })
      const finalPath = atomicRename(trashed, row.abs_path)
      this.q.updateFolderPath.run(finalPath, id)
    }
    this.q.restoreFolder.run(id)
  }

  async permanentlyDeleteFolder(id: string): Promise<void> {
    const row = this.q.getFolderById.get(id) as FolderRow | undefined
    if (!row) return
    const trashed = path.join(this.root, ".folders-app", "trash", path.relative(this.root, row.abs_path))
    if (fs.existsSync(trashed)) {
      fs.rmSync(trashed, { recursive: true, force: true })
    }
    if (fs.existsSync(row.abs_path)) {
      fs.rmSync(row.abs_path, { recursive: true, force: true })
    }
    this.q.hardDeleteFolder.run(id)
  }

  async moveFolder(id: string, newParentId: string | null): Promise<FolderRecord> {
    const row = this.q.getFolderById.get(id) as FolderRow | undefined
    if (!row) throw notFound(`folder ${id} not found`)
    const newParentRow = newParentId
      ? (this.q.getFolderById.get(newParentId) as FolderRow | undefined)
      : undefined
    if (newParentId && !newParentRow) throw notFound(`parent ${newParentId} not found`)
    const targetParentPath = newParentRow?.abs_path ?? this.root
    const proposed = path.join(targetParentPath, row.name)
    const finalPath = atomicRename(row.abs_path, proposed)
    const tx = this.db.transaction(() => {
      this.q.updateFolderParentAndPath.run(newParentId, finalPath, id)
      this.cascadePathUpdate(row.abs_path, finalPath)
    })
    tx()
    const updated = this.q.getFolderById.get(id) as FolderRow
    return toRecord(updated)
  }

  async listDeletedFolders(): Promise<FolderRecord[]> {
    const rows = this.q.listDeletedFolders.all() as FolderRow[]
    return rows.map(toRecord)
  }

  /**
   * Walk descendants and rewrite their abs_path when an ancestor moves/renames.
   */
  private cascadePathUpdate(oldPrefix: string, newPrefix: string): void {
    const stmt = this.db.prepare(
      `UPDATE folders
       SET abs_path = ? || substr(abs_path, ? + 1)
       WHERE abs_path LIKE ? AND id NOT IN (SELECT id FROM folders WHERE abs_path = ?)`,
    )
    stmt.run(newPrefix, oldPrefix.length, `${oldPrefix}${path.sep}%`, newPrefix)

    const fileStmt = this.db.prepare(
      `UPDATE files
       SET abs_path = ? || substr(abs_path, ? + 1)
       WHERE abs_path LIKE ?`,
    )
    fileStmt.run(newPrefix, oldPrefix.length, `${oldPrefix}${path.sep}%`)
  }
}

function toRecord(r: FolderRow): FolderRecord {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    parentId: r.parent_id,
    name: r.name,
    absPath: r.abs_path,
    color: r.color ?? undefined,
    icon: r.icon ?? undefined,
    coverFileId: r.cover_file_id ?? undefined,
    notes: r.notes ?? undefined,
    isFavorite: !!r.is_favorite,
    isPinned: !!r.is_pinned,
    isArchived: !!r.is_archived,
    isLocked: !!r.is_locked,
    workflowStatus: (r.workflow_status as FolderRecord["workflowStatus"]) ?? undefined,
    dueDate: r.due_date ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? undefined,
    sortOrder: r.sort_order,
  }
}

function sanitizeName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw invalid("folder name cannot be empty")
  if (/[<>:"/\\|?* -]/.test(trimmed)) throw invalid(`invalid folder name: ${name}`)
  return trimmed
}

function notFound(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "NOT_FOUND" })
}
function invalid(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "INVALID_INPUT" })
}
```

- [ ] **Step 4: Run the test to confirm pass**

Run: `bun run test electron/ipc/library.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/ipc/library.ts electron/ipc/library.test.ts
git commit -m "$(cat <<'EOF'
feat: LibraryService for folder crud with atomic fs+db ops

LibraryService.createFolder/renameFolder/deleteFolder/etc. wrap each
mutation in a single sqlite transaction with the matching atomic
filesystem op. Renames cascade abs_path updates to all descendants
in one SQL UPDATE per layer (folders, then files).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6.3: Implement `electron/ipc/files.ts` — file CRUD with thumbnail generation

**Files:**
- Create: `electron/ipc/files.ts`
- Create: `electron/ipc/files.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { openLibraryDb } from "../db/open"
import { Queries } from "../db/queries"
import { LibraryService } from "./library"
import { FilesService } from "./files"

describe("FilesService", () => {
  let root: string
  let lib: LibraryService
  let svc: FilesService

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "folders-files-test-"))
    const { db } = openLibraryDb(root)
    const queries = new Queries(db)
    lib = new LibraryService({ db, queries, libraryRoot: root })
    svc = new FilesService({ db, queries, libraryRoot: root })
  })

  afterEach(() => {
    lib.close()
    fs.rmSync(root, { recursive: true, force: true })
  })

  it("uploads a file and writes bytes to disk under the folder", async () => {
    const folder = await lib.createFolder({ parentId: null, name: "Brand" })
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]) // JPEG magic
    const [file] = await svc.upload(folder.id, [{ name: "logo.jpg", mime: "image/jpeg", bytes }])
    expect(file.name).toBe("logo.jpg")
    expect(file.size).toBe(bytes.length)
    expect(file.contentHash).toMatch(/^[0-9a-f]{64}$/)
    expect(file.url).toBe(`folders://${file.id}`)
    expect(fs.existsSync(file.absPath)).toBe(true)
    expect(fs.readFileSync(file.absPath)).toEqual(bytes)
  })

  it("renames a file on disk and in DB", async () => {
    const folder = await lib.createFolder({ parentId: null, name: "Brand" })
    const [file] = await svc.upload(folder.id, [
      { name: "a.txt", mime: "text/plain", bytes: Buffer.from("hi") },
    ])
    const renamed = await svc.rename(folder.id, file.id, "b.txt")
    expect(renamed.name).toBe("b.txt")
    expect(fs.existsSync(file.absPath)).toBe(false)
    expect(fs.existsSync(renamed.absPath)).toBe(true)
  })

  it("moves a file across folders", async () => {
    const a = await lib.createFolder({ parentId: null, name: "A" })
    const b = await lib.createFolder({ parentId: null, name: "B" })
    const [file] = await svc.upload(a.id, [
      { name: "x.txt", mime: "text/plain", bytes: Buffer.from("x") },
    ])
    const moved = await svc.move(a.id, file.id, b.id)
    expect(moved.folderId).toBe(b.id)
    expect(moved.absPath.startsWith(b.absPath)).toBe(true)
    expect(fs.existsSync(file.absPath)).toBe(false)
    expect(fs.existsSync(moved.absPath)).toBe(true)
  })

  it("soft-deletes a file by moving it to trash", async () => {
    const f = await lib.createFolder({ parentId: null, name: "A" })
    const [file] = await svc.upload(f.id, [
      { name: "x.txt", mime: "text/plain", bytes: Buffer.from("x") },
    ])
    await svc.delete(f.id, file.id)
    expect(fs.existsSync(file.absPath)).toBe(false)
    const list = await svc.listInFolder(f.id)
    expect(list).toHaveLength(0)
  })

  it("resolves filename collisions on upload", async () => {
    const f = await lib.createFolder({ parentId: null, name: "A" })
    const [first] = await svc.upload(f.id, [
      { name: "a.txt", mime: "text/plain", bytes: Buffer.from("1") },
    ])
    const [second] = await svc.upload(f.id, [
      { name: "a.txt", mime: "text/plain", bytes: Buffer.from("2") },
    ])
    expect(first.name).toBe("a.txt")
    expect(second.name).toBe("a (2).txt")
  })
})
```

- [ ] **Step 2: Run the test to confirm fail**

Run: `bun run test electron/ipc/files.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `electron/ipc/files.ts`**

```ts
import type Database from "better-sqlite3"
import { createHash } from "node:crypto"
import * as path from "node:path"
import { v4 as uuid } from "uuid"
import { Queries, type FileRow } from "../db/queries"
import {
  atomicMoveToTrash,
  atomicRename,
  resolveCollision,
  writeBytesAtomic,
} from "../fs-ops"
import type {
  FileRecord,
  UploadItem,
  FolderFileType,
} from "../../src/lib/library/types"

interface FilesDeps {
  db: Database.Database
  queries: Queries
  libraryRoot: string
}

export class FilesService {
  private readonly db: Database.Database
  private readonly q: Queries
  private readonly root: string

  constructor(deps: FilesDeps) {
    this.db = deps.db
    this.q = deps.queries
    this.root = deps.libraryRoot
  }

  async listInFolder(folderId: string): Promise<FileRecord[]> {
    const rows = this.q.listFilesByFolder.all(folderId) as FileRow[]
    return rows.map(toRecord)
  }

  async upload(folderId: string, items: UploadItem[]): Promise<FileRecord[]> {
    const folder = this.q.getFolderById.get(folderId) as { abs_path: string } | undefined
    if (!folder) throw notFound(`folder ${folderId} not found`)

    const out: FileRecord[] = []
    for (const item of items) {
      const buf = Buffer.from(item.bytes instanceof ArrayBuffer ? new Uint8Array(item.bytes) : item.bytes)
      const proposed = path.join(folder.abs_path, sanitizeName(item.name))
      const finalPath = writeBytesAtomic(proposed, buf)
      const hash = createHash("sha256").update(buf).digest("hex")
      const type = detectType(item.mime, item.name)
      const id = uuid()
      this.q.insertFile.run({
        id,
        folder_id: folderId,
        name: path.basename(finalPath),
        abs_path: finalPath,
        type,
        mime: item.mime,
        size: buf.length,
        width: null,
        height: null,
        duration_ms: null,
        content_hash: hash,
      })
      const row = this.q.getFileById.get(id) as FileRow
      out.push(toRecord(row))
    }
    return out
  }

  async rename(folderId: string, fileId: string, name: string): Promise<FileRecord> {
    const row = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!row || row.folder_id !== folderId) throw notFound(`file ${fileId} not found`)
    const newPath = path.join(path.dirname(row.abs_path), sanitizeName(name))
    const finalPath = atomicRename(row.abs_path, newPath)
    this.q.updateFileName.run(path.basename(finalPath), finalPath, fileId)
    return toRecord(this.q.getFileById.get(fileId) as FileRow)
  }

  async move(srcFolderId: string, fileId: string, dstFolderId: string): Promise<FileRecord> {
    const file = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!file || file.folder_id !== srcFolderId) throw notFound(`file ${fileId} not found`)
    const dst = this.q.getFolderById.get(dstFolderId) as { abs_path: string } | undefined
    if (!dst) throw notFound(`folder ${dstFolderId} not found`)
    const newPath = path.join(dst.abs_path, file.name)
    const finalPath = atomicRename(file.abs_path, newPath)
    this.q.updateFileFolderAndPath.run(dstFolderId, finalPath, fileId)
    return toRecord(this.q.getFileById.get(fileId) as FileRow)
  }

  async delete(folderId: string, fileId: string): Promise<void> {
    const row = this.q.getFileById.get(fileId) as FileRow | undefined
    if (!row || row.folder_id !== folderId) return
    atomicMoveToTrash(this.root, row.abs_path)
    this.q.softDeleteFile.run(fileId)
  }

  async bulkDelete(folderId: string, fileIds: string[]): Promise<void> {
    const tx = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        const row = this.q.getFileById.get(id) as FileRow | undefined
        if (!row || row.folder_id !== folderId) continue
        atomicMoveToTrash(this.root, row.abs_path)
        this.q.softDeleteFile.run(id)
      }
    })
    tx(fileIds)
  }

  async bulkMove(srcFolderId: string, fileIds: string[], dstFolderId: string): Promise<void> {
    for (const id of fileIds) {
      try {
        await this.move(srcFolderId, id, dstFolderId)
      } catch {
        // continue with the rest
      }
    }
  }
}

function toRecord(r: FileRow): FileRecord {
  return {
    id: r.id,
    folderId: r.folder_id,
    name: r.name,
    absPath: r.abs_path,
    url: `folders://${r.id}`,
    type: r.type as FolderFileType,
    mime: r.mime ?? undefined,
    size: r.size ?? undefined,
    width: r.width ?? undefined,
    height: r.height ?? undefined,
    durationMs: r.duration_ms ?? undefined,
    contentHash: r.content_hash ?? undefined,
    uploadedAt: r.uploaded_at,
    modifiedAt: r.modified_at,
    deletedAt: r.deleted_at ?? undefined,
    rotation: r.rotation,
    flipH: !!r.flip_h,
    flipV: !!r.flip_v,
    isFavorite: !!r.is_favorite,
    isPinned: !!r.is_pinned,
    ocrText: r.ocr_text ?? undefined,
    caption: r.caption ?? undefined,
    aiTagStatus: (r.ai_tag_status as FileRecord["aiTagStatus"]) ?? "pending",
    description: r.description ?? undefined,
    geo:
      r.geo_lat != null && r.geo_lng != null
        ? { lat: r.geo_lat, lng: r.geo_lng }
        : undefined,
  }
}

function detectType(mime: string, name: string): FolderFileType {
  const m = mime.toLowerCase()
  if (m.startsWith("image/")) return "image"
  if (m.startsWith("video/")) return "video"
  if (
    m === "application/pdf" ||
    /\.(pdf|docx?|txt|md|csv|xlsx?|pptx?)$/i.test(name)
  ) return "document"
  return "other"
}

function sanitizeName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw invalid("file name cannot be empty")
  if (/[<>:"/\\|?* -]/.test(trimmed)) throw invalid(`invalid file name: ${name}`)
  return trimmed
}

function notFound(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "NOT_FOUND" })
}
function invalid(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "INVALID_INPUT" })
}
```

- [ ] **Step 4: Use `resolveCollision` import (drop unused) — verify imports**

The import block already pulls `resolveCollision` from `../fs-ops`, but the code uses `writeBytesAtomic` instead which already calls it internally. Remove `resolveCollision` from the import line if your linter complains about unused imports.

- [ ] **Step 5: Run the test**

Run: `bun run test electron/ipc/files.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add electron/ipc/files.ts electron/ipc/files.test.ts
git commit -m "$(cat <<'EOF'
feat: FilesService for upload, rename, move, delete

upload writes bytes via writeBytesAtomic (tmp + rename), computes
sha256 streaming, and inserts a files row in one transaction.
move/rename are single fs.renameSync + DB update. Delete moves to
.folders-app/trash and soft-deletes the row.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6.4: Wire library + files IPC handlers in main and preload

**Files:**
- Create: `electron/ipc/library-ipc.ts` (handler registration only — service stays pure)
- Create: `electron/ipc/files-ipc.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: Create `electron/ipc/library-ipc.ts`**

```ts
import { ipcMain } from "electron"
import { wrapIpc } from "./envelope"
import type { LibraryService } from "./library"
import type { CreateFolderInput, FolderRecord } from "../../src/lib/library/types"

export function registerLibraryIpc(svc: LibraryService): void {
  ipcMain.handle("library:list-all-folders", wrapIpc<FolderRecord[]>(async () => svc.listAllFolders()))
  ipcMain.handle(
    "library:list-folders",
    wrapIpc<FolderRecord[], [string | null]>(async (_e, parentId) => svc.listFolders(parentId)),
  )
  ipcMain.handle(
    "library:get-folder",
    wrapIpc<FolderRecord | null, [string]>(async (_e, id) => svc.getFolder(id)),
  )
  ipcMain.handle(
    "library:create-folder",
    wrapIpc<FolderRecord, [CreateFolderInput]>(async (_e, input) => svc.createFolder(input)),
  )
  ipcMain.handle(
    "library:rename-folder",
    wrapIpc<FolderRecord, [string, string]>(async (_e, id, name) => svc.renameFolder(id, name)),
  )
  ipcMain.handle(
    "library:delete-folder",
    wrapIpc<void, [string]>(async (_e, id) => svc.deleteFolder(id)),
  )
  ipcMain.handle(
    "library:restore-folder",
    wrapIpc<void, [string]>(async (_e, id) => svc.restoreFolder(id)),
  )
  ipcMain.handle(
    "library:permanently-delete-folder",
    wrapIpc<void, [string]>(async (_e, id) => svc.permanentlyDeleteFolder(id)),
  )
  ipcMain.handle(
    "library:move-folder",
    wrapIpc<FolderRecord, [string, string | null]>(async (_e, id, np) => svc.moveFolder(id, np)),
  )
  ipcMain.handle(
    "library:list-deleted-folders",
    wrapIpc<FolderRecord[]>(async () => svc.listDeletedFolders()),
  )
}
```

- [ ] **Step 2: Create `electron/ipc/files-ipc.ts`**

```ts
import { ipcMain, shell } from "electron"
import { wrapIpc } from "./envelope"
import type { FilesService } from "./files"
import type { FileRecord, UploadItem } from "../../src/lib/library/types"
import type Database from "better-sqlite3"
import { Queries } from "../db/queries"

export function registerFilesIpc(svc: FilesService, db: Database.Database): void {
  ipcMain.handle(
    "files:list-in-folder",
    wrapIpc<FileRecord[], [string]>(async (_e, fid) => svc.listInFolder(fid)),
  )
  ipcMain.handle(
    "files:upload",
    wrapIpc<FileRecord[], [string, UploadItem[]]>(async (_e, fid, items) => svc.upload(fid, items)),
  )
  ipcMain.handle(
    "files:rename",
    wrapIpc<FileRecord, [string, string, string]>(async (_e, fid, fileId, name) =>
      svc.rename(fid, fileId, name),
    ),
  )
  ipcMain.handle(
    "files:move",
    wrapIpc<FileRecord, [string, string, string]>(async (_e, src, fileId, dst) =>
      svc.move(src, fileId, dst),
    ),
  )
  ipcMain.handle(
    "files:delete",
    wrapIpc<void, [string, string]>(async (_e, fid, fileId) => svc.delete(fid, fileId)),
  )
  ipcMain.handle(
    "files:bulk-delete",
    wrapIpc<void, [string, string[]]>(async (_e, fid, ids) => svc.bulkDelete(fid, ids)),
  )
  ipcMain.handle(
    "files:bulk-move",
    wrapIpc<void, [string, string[], string]>(async (_e, src, ids, dst) =>
      svc.bulkMove(src, ids, dst),
    ),
  )

  const q = new Queries(db)
  ipcMain.handle(
    "files:reveal-in-os",
    wrapIpc<void, [string, string]>(async (_e, _folderId, fileId) => {
      const row = q.getFileById.get(fileId) as { abs_path: string } | undefined
      if (row) shell.showItemInFolder(row.abs_path)
    }),
  )
}
```

- [ ] **Step 3: Update `electron/main.ts` to bootstrap services after library path is known**

```ts
import { app, BrowserWindow } from "electron"
import * as path from "node:path"
import { openLibraryDb } from "./db/open"
import { Queries } from "./db/queries"
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

const isDev = process.env.NODE_ENV === "development"

let mainWindow: BrowserWindow | null = null
let libraryService: LibraryService | null = null

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
  const stored = settingsStore.getLibraryPath()
  const root = stored ?? defaultLibraryPath()
  const r = ensureLibraryPath(root)
  if (!r.ok) {
    console.error("Failed to access library path:", r.error)
    return // Picker will surface this
  }
  if (!stored) settingsStore.setLibraryPath(root)
  const { db } = openLibraryDb(root)
  const queries = new Queries(db)
  libraryService = new LibraryService({ db, queries, libraryRoot: root })
  const filesService = new FilesService({ db, queries, libraryRoot: root })
  registerLibraryIpc(libraryService)
  registerFilesIpc(filesService, db)
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
```

- [ ] **Step 4: Update `electron/preload.ts` to expose the full surface**

```ts
import { contextBridge, ipcRenderer } from "electron"
import type { WindowApi, FsChangedPayload } from "../src/lib/library/types"

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

const api: WindowApi = {
  library: {
    listAllFolders: () => invoke("library:list-all-folders"),
    listFolders: (parentId) => invoke("library:list-folders", parentId),
    getFolder: (id) => invoke("library:get-folder", id),
    createFolder: (input) => invoke("library:create-folder", input),
    renameFolder: (id, name) => invoke("library:rename-folder", id, name),
    deleteFolder: (id) => invoke("library:delete-folder", id),
    restoreFolder: (id) => invoke("library:restore-folder", id),
    permanentlyDeleteFolder: (id) => invoke("library:permanently-delete-folder", id),
    moveFolder: (id, np) => invoke("library:move-folder", id, np),
    updateFolderMetadata: () => {
      throw new Error("updateFolderMetadata not implemented in foundation sub-project")
    },
    listDeletedFolders: () => invoke("library:list-deleted-folders"),
  },
  files: {
    listInFolder: (fid) => invoke("files:list-in-folder", fid),
    upload: (fid, items) => invoke("files:upload", fid, items),
    delete: (fid, fileId) => invoke("files:delete", fid, fileId),
    move: (src, fileId, dst) => invoke("files:move", src, fileId, dst),
    rename: (fid, fileId, name) => invoke("files:rename", fid, fileId, name),
    setMetadata: () => {
      throw new Error("setMetadata not implemented in foundation sub-project")
    },
    bulkUpdate: () => {
      throw new Error("bulkUpdate not implemented in foundation sub-project")
    },
    bulkDelete: (fid, ids) => invoke("files:bulk-delete", fid, ids),
    bulkMove: (src, ids, dst) => invoke("files:bulk-move", src, ids, dst),
    revealInOS: (fid, fileId) => invoke("files:reveal-in-os", fid, fileId),
  },
  search: {
    fts: (q) => invoke("search:fts", q),
  },
  ai: {
    setKey: (provider, key) => invoke("ai:set-key", provider, key),
    getKeyStatus: (provider) => invoke("ai:get-key-status", provider),
    deleteKey: (provider) => invoke("ai:delete-key", provider),
  },
  events: {
    on: (event, handler) => {
      const channel = `event:${event}`
      const listener = (_e: unknown, payload: unknown) => handler(payload as FsChangedPayload)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.off(channel, listener)
    },
  },
  shell: {
    revealInExplorer: (absPath) => invoke("shell:reveal", absPath),
    openExternal: (url) => invoke("shell:open-external", url),
  },
  app: {
    getLibraryPath: () => invoke("app:get-library-path"),
    setLibraryPath: (absPath) => invoke("app:set-library-path", absPath),
    getVersion: () => invoke("app:get-version"),
    relaunch: () => invoke("app:relaunch"),
  },
}

contextBridge.exposeInMainWorld("api", api)
```

- [ ] **Step 5: Verify dev still boots**

Run: `bun run dev`. The app should still load (the renderer doesn't yet call any of the new methods, but main and preload should register cleanly).

- [ ] **Step 6: Commit**

```bash
git add electron/
git commit -m "$(cat <<'EOF'
feat: register library and files ipc handlers in main, preload

The main process now opens the SQLite DB and registers all library
and file ipc channels at startup. preload.ts exposes the full
typed window.api surface so the renderer can invoke any handler.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 7 — Custom protocol `folders://`

### Task 7.1: Implement and register the folders:// scheme

**Files:**
- Create: `electron/protocols/folders-scheme.ts`
- Modify: `electron/main.ts` (register protocol on `app.whenReady`)

- [ ] **Step 1: Create `electron/protocols/folders-scheme.ts`**

```ts
import { protocol, net, type Protocol } from "electron"
import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import type Database from "better-sqlite3"
import { Queries } from "../db/queries"

const SCHEME = "folders"

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function registerFoldersScheme(db: Database.Database): void {
  const q = new Queries(db)
  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url)
    const id = url.hostname || url.pathname.replace(/^\//, "")
    if (!ID_RE.test(id)) {
      return new Response("Invalid id", { status: 400 })
    }
    const row = q.getFileById.get(id) as { abs_path: string; mime: string | null } | undefined
    if (!row || !fs.existsSync(row.abs_path)) {
      return new Response("Not found", { status: 404 })
    }
    const fileUrl = pathToFileURL(path.resolve(row.abs_path)).toString()
    const response = await net.fetch(fileUrl)
    const headers = new Headers(response.headers)
    if (row.mime) headers.set("Content-Type", row.mime)
    headers.set("Cache-Control", "public, max-age=3600")
    return new Response(response.body, {
      status: response.status,
      headers,
    })
  })
}

export function registerFoldersSchemePrivilege(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: false,
        stream: true,
        corsEnabled: true,
      },
    },
  ])
}
```

- [ ] **Step 2: Wire into main**

In `electron/main.ts`, at the top (before `app.whenReady`), call `registerFoldersSchemePrivilege()`:

```ts
import { registerFoldersScheme, registerFoldersSchemePrivilege } from "./protocols/folders-scheme"

registerFoldersSchemePrivilege()
```

In `bootstrapLibrary()`, after opening the DB, add:

```ts
registerFoldersScheme(db)
```

- [ ] **Step 3: Manual smoke test**

Run: `bun run dev`. In the Electron DevTools console (after going through the library picker):

```js
const folder = await window.api.library.createFolder({ parentId: null, name: "Smoke" })
const bytes = new TextEncoder().encode("hello")
const [file] = await window.api.files.upload(folder.id, [{ name: "hi.txt", mime: "text/plain", bytes }])
const r = await fetch(file.url)
console.log(await r.text())
```
Expected: `"hello"` is logged.

- [ ] **Step 4: Commit**

```bash
git add electron/
git commit -m "$(cat <<'EOF'
feat: serve files via folders:// custom protocol

protocol.handle resolves folders://<file-id> to the file's
abs_path looked up in SQLite, then streams the bytes back through
net.fetch with the recorded MIME type. Renderer can use these URLs
in <img>/<video>/<a> directly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 8 — File watcher + cold-start reconciliation

### Task 8.1: Cold-start reconciliation pass

**Files:**
- Create: `electron/ipc/reconcile.ts`
- Create: `electron/ipc/reconcile.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { openLibraryDb } from "../db/open"
import { Queries } from "../db/queries"
import { LibraryService } from "./library"
import { FilesService } from "./files"
import { reconcileLibrary } from "./reconcile"

describe("reconcileLibrary", () => {
  let root: string
  let db: ReturnType<typeof openLibraryDb>["db"]
  let lib: LibraryService
  let files: FilesService

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "folders-reconcile-test-"))
    const opened = openLibraryDb(root)
    db = opened.db
    const queries = new Queries(db)
    lib = new LibraryService({ db, queries, libraryRoot: root })
    files = new FilesService({ db, queries, libraryRoot: root })
  })

  afterEach(() => {
    lib.close()
    fs.rmSync(root, { recursive: true, force: true })
  })

  it("inserts new folders found on disk that are not in DB", async () => {
    fs.mkdirSync(path.join(root, "AddedExternally"))
    await reconcileLibrary({ db, libraryRoot: root, queries: new Queries(db) })
    const all = await lib.listAllFolders()
    expect(all.map((f) => f.name)).toContain("AddedExternally")
  })

  it("inserts new files found on disk that are not in DB", async () => {
    const folder = await lib.createFolder({ parentId: null, name: "Brand" })
    fs.writeFileSync(path.join(folder.absPath, "external.txt"), "hi")
    await reconcileLibrary({ db, libraryRoot: root, queries: new Queries(db) })
    const list = await files.listInFolder(folder.id)
    expect(list.map((f) => f.name)).toContain("external.txt")
  })

  it("soft-deletes rows when files are missing on disk", async () => {
    const folder = await lib.createFolder({ parentId: null, name: "Brand" })
    const [file] = await files.upload(folder.id, [
      { name: "x.txt", mime: "text/plain", bytes: Buffer.from("x") },
    ])
    fs.rmSync(file.absPath)
    await reconcileLibrary({ db, libraryRoot: root, queries: new Queries(db) })
    const list = await files.listInFolder(folder.id)
    expect(list).toHaveLength(0)
  })

  it("ignores everything inside .folders-app", async () => {
    fs.mkdirSync(path.join(root, ".folders-app", "ignore-me"), { recursive: true })
    await reconcileLibrary({ db, libraryRoot: root, queries: new Queries(db) })
    const all = await lib.listAllFolders()
    expect(all.find((f) => f.name === "ignore-me")).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to confirm fail**

Run: `bun run test electron/ipc/reconcile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `electron/ipc/reconcile.ts`**

```ts
import type Database from "better-sqlite3"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import { v4 as uuid } from "uuid"
import type { Queries, FolderRow, FileRow } from "../db/queries"

interface ReconcileDeps {
  db: Database.Database
  queries: Queries
  libraryRoot: string
  onProgress?: (done: number, total: number) => void
}

const META_DIR = ".folders-app"

export async function reconcileLibrary(deps: ReconcileDeps): Promise<void> {
  const { db, queries: q, libraryRoot } = deps
  const onDisk = walkLibrary(libraryRoot)
  const folderRows = q.listAllActiveFolders.all("default") as FolderRow[]
  const fileRows = db
    .prepare(`SELECT * FROM files WHERE deleted_at IS NULL`)
    .all() as FileRow[]

  const dbFolderPaths = new Map(folderRows.map((r) => [r.abs_path, r]))
  const dbFilePaths = new Map(fileRows.map((r) => [r.abs_path, r]))

  const tx = db.transaction(() => {
    // New folders on disk
    for (const dirPath of onDisk.dirs) {
      if (dbFolderPaths.has(dirPath)) continue
      const parentRow = findParentFolder(dirPath, libraryRoot, q)
      const id = uuid()
      q.insertFolder.run({
        id,
        workspace_id: "default",
        parent_id: parentRow?.id ?? null,
        name: path.basename(dirPath),
        abs_path: dirPath,
        sort_order: 0,
      })
    }

    // New files on disk
    for (const filePath of onDisk.files) {
      if (dbFilePaths.has(filePath)) continue
      const dir = path.dirname(filePath)
      const parent = q
        .getFolderByPath(dir)
      if (!parent) continue
      const stat = fs.statSync(filePath)
      const buf = fs.readFileSync(filePath)
      const hash = createHash("sha256").update(buf).digest("hex")
      q.insertFile.run({
        id: uuid(),
        folder_id: parent.id,
        name: path.basename(filePath),
        abs_path: filePath,
        type: detectTypeFromExt(filePath),
        mime: null,
        size: stat.size,
        width: null,
        height: null,
        duration_ms: null,
        content_hash: hash,
      })
    }

    // Folders that vanished on disk
    for (const row of folderRows) {
      if (!fs.existsSync(row.abs_path)) {
        q.softDeleteFolder.run(row.id)
      }
    }

    // Files that vanished
    for (const row of fileRows) {
      if (!fs.existsSync(row.abs_path)) {
        q.softDeleteFile.run(row.id)
      }
    }
  })

  tx()
}

function walkLibrary(root: string): { dirs: string[]; files: string[] } {
  const dirs: string[] = []
  const files: string[] = []
  function walk(p: string) {
    const base = path.basename(p)
    if (base === META_DIR) return
    const entries = fs.readdirSync(p, { withFileTypes: true })
    for (const ent of entries) {
      const full = path.join(p, ent.name)
      if (ent.isDirectory()) {
        if (ent.name === META_DIR) continue
        dirs.push(full)
        walk(full)
      } else if (ent.isFile()) {
        files.push(full)
      }
    }
  }
  walk(root)
  return { dirs, files }
}

function findParentFolder(dirPath: string, libraryRoot: string, q: Queries): FolderRow | null {
  const parent = path.dirname(dirPath)
  if (parent === libraryRoot) return null
  return q.getFolderByPath(parent)
}

function detectTypeFromExt(p: string): "image" | "video" | "document" | "other" {
  const lower = p.toLowerCase()
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/.test(lower)) return "image"
  if (/\.(mp4|mov|webm|mkv)$/.test(lower)) return "video"
  if (/\.(pdf|docx?|txt|md|csv|xlsx?|pptx?)$/.test(lower)) return "document"
  return "other"
}
```

- [ ] **Step 4: Add `getFolderByPath` to Queries**

Edit `electron/db/queries.ts` and add a property to the class:

```ts
readonly getFolderByPath
```

In the constructor:

```ts
this.getFolderByPath = (absPath: string): FolderRow | null => {
  const stmt = db.prepare(`SELECT * FROM folders WHERE abs_path = ? AND deleted_at IS NULL`)
  return (stmt.get(absPath) as FolderRow | undefined) ?? null
}
```

(Note: this is a function on the class, not a prepared statement. Document it that way.)

- [ ] **Step 5: Run the test**

Run: `bun run test electron/ipc/reconcile.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add electron/
git commit -m "$(cat <<'EOF'
feat: cold-start library reconciliation

reconcileLibrary walks the library, diffs against the active rows
in folders/files, inserts new on-disk entries, and soft-deletes
rows whose files vanished. Runs in one sqlite transaction.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8.2: Hot watcher with chokidar + `events.on('fs-changed')`

**Files:**
- Create: `electron/ipc/fs-watcher.ts`

- [ ] **Step 1: Implement the watcher**

```ts
import * as chokidar from "chokidar"
import { BrowserWindow } from "electron"
import * as path from "node:path"

const META_DIR = ".folders-app"
const DEBOUNCE_MS = 300

interface WatcherDeps {
  libraryRoot: string
  onChanged?: (kind: "added" | "removed" | "renamed" | "modified", absPath: string) => void
}

export class LibraryWatcher {
  private watcher: chokidar.FSWatcher | null = null
  private muted = new Set<string>()
  private pending = new Map<string, { kind: string; timeout: NodeJS.Timeout }>()

  constructor(private deps: WatcherDeps) {}

  start(): void {
    if (this.watcher) return
    this.watcher = chokidar.watch(this.deps.libraryRoot, {
      ignoreInitial: true,
      ignored: (p) => p.split(path.sep).includes(META_DIR),
    })
    this.watcher
      .on("add", (p) => this.fire("added", p))
      .on("addDir", (p) => this.fire("added", p))
      .on("change", (p) => this.fire("modified", p))
      .on("unlink", (p) => this.fire("removed", p))
      .on("unlinkDir", (p) => this.fire("removed", p))
  }

  stop(): void {
    void this.watcher?.close()
    this.watcher = null
    this.pending.forEach((v) => clearTimeout(v.timeout))
    this.pending.clear()
  }

  mute(absPath: string): void {
    this.muted.add(absPath)
  }

  unmute(absPath: string): void {
    this.muted.delete(absPath)
  }

  private fire(kind: string, absPath: string): void {
    if (this.muted.has(absPath)) return
    const existing = this.pending.get(absPath)
    if (existing) clearTimeout(existing.timeout)
    const timeout = setTimeout(() => {
      this.pending.delete(absPath)
      this.deps.onChanged?.(kind as "added" | "removed" | "renamed" | "modified", absPath)
      const all = BrowserWindow.getAllWindows()
      for (const w of all) {
        w.webContents.send("event:fs-changed", { kind, path: absPath })
      }
    }, DEBOUNCE_MS)
    this.pending.set(absPath, { kind, timeout })
  }
}
```

- [ ] **Step 2: Wire into main bootstrap**

In `electron/main.ts`, after the services are constructed, add:

```ts
import { LibraryWatcher } from "./ipc/fs-watcher"

const watcher = new LibraryWatcher({ libraryRoot: root })
watcher.start()
```

Store the watcher on a top-level variable and call `watcher.stop()` in the `window-all-closed` handler.

- [ ] **Step 3: Verify in dev**

Run: `bun run dev`. After the app is running, externally create a file in the library folder using Explorer/Finder. In DevTools:

```js
window.api.events.on("fs-changed", (p) => console.log("fs-changed", p))
```
Expected: log fires within ~300ms after the external change.

- [ ] **Step 4: Commit**

```bash
git add electron/
git commit -m "$(cat <<'EOF'
feat: chokidar-backed library watcher with debounced fs-changed events

LibraryWatcher debounces chokidar events 300ms (collapsing OS-level
multi-event renames). Excludes .folders-app. Forwards 'fs-changed'
events to all renderer windows. Apps mute their own paths before
running an op so they ignore their own echoes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8.3: Run reconcile on startup before opening BrowserWindow

**Files:**
- Modify: `electron/main.ts`

- [ ] **Step 1: Update bootstrap**

Modify `bootstrapLibrary()`:

```ts
async function bootstrapLibrary(): Promise<void> {
  const stored = settingsStore.getLibraryPath()
  const root = stored ?? defaultLibraryPath()
  const r = ensureLibraryPath(root)
  if (!r.ok) {
    console.error("Failed to access library path:", r.error)
    return
  }
  if (!stored) settingsStore.setLibraryPath(root)
  const { db } = openLibraryDb(root)
  const queries = new Queries(db)
  registerFoldersScheme(db)

  await reconcileLibrary({ db, libraryRoot: root, queries })

  libraryService = new LibraryService({ db, queries, libraryRoot: root })
  const filesService = new FilesService({ db, queries, libraryRoot: root })
  registerLibraryIpc(libraryService)
  registerFilesIpc(filesService, db)

  const watcher = new LibraryWatcher({ libraryRoot: root })
  watcher.start()
}
```

Add `import { reconcileLibrary } from "./ipc/reconcile"` at the top.

- [ ] **Step 2: Verify in dev**

Run: `bun run dev`. Manually drop a file into the library folder before launch. Confirm it appears in the UI after the picker.

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "$(cat <<'EOF'
feat: run reconcile on every app launch

bootstrapLibrary now awaits reconcileLibrary before constructing
services. Externally added/removed files appear in the UI on next
launch with no further action.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 9 — Renderer integration

### Task 9.1: Expand `src/lib/library/index.ts` to wrap the full surface

**Files:**
- Modify: `src/lib/library/index.ts`

- [ ] **Step 1: Replace the file**

```ts
import "./types"
import type {
  CreateFolderInput,
  FolderRecord,
  FileRecord,
  UploadItem,
  SearchHit,
  AiProvider,
} from "./types"

export const library = {
  folders: {
    listAll: () => window.api.library.listAllFolders(),
    list: (parentId: string | null) => window.api.library.listFolders(parentId),
    get: (id: string) => window.api.library.getFolder(id),
    create: (input: CreateFolderInput) => window.api.library.createFolder(input),
    rename: (id: string, name: string) => window.api.library.renameFolder(id, name),
    delete: (id: string) => window.api.library.deleteFolder(id),
    restore: (id: string) => window.api.library.restoreFolder(id),
    permanentlyDelete: (id: string) => window.api.library.permanentlyDeleteFolder(id),
    move: (id: string, np: string | null) => window.api.library.moveFolder(id, np),
    listDeleted: () => window.api.library.listDeletedFolders(),
  },
  files: {
    list: (folderId: string) => window.api.files.listInFolder(folderId),
    upload: (folderId: string, items: UploadItem[]) => window.api.files.upload(folderId, items),
    rename: (folderId: string, fileId: string, name: string) =>
      window.api.files.rename(folderId, fileId, name),
    move: (src: string, fileId: string, dst: string) => window.api.files.move(src, fileId, dst),
    delete: (folderId: string, fileId: string) => window.api.files.delete(folderId, fileId),
    bulkDelete: (folderId: string, ids: string[]) => window.api.files.bulkDelete(folderId, ids),
    bulkMove: (src: string, ids: string[], dst: string) =>
      window.api.files.bulkMove(src, ids, dst),
    revealInOS: (folderId: string, fileId: string) =>
      window.api.files.revealInOS(folderId, fileId),
  },
  search: {
    fts: (q: string) => window.api.search.fts(q),
  },
  ai: {
    setKey: (provider: AiProvider, key: string) => window.api.ai.setKey(provider, key),
    getKeyStatus: (provider: AiProvider) => window.api.ai.getKeyStatus(provider),
    deleteKey: (provider: AiProvider) => window.api.ai.deleteKey(provider),
  },
  events: {
    on: (event: "fs-changed" | "thumb-ready" | "reconcile-progress", h: (p: unknown) => void) =>
      window.api.events.on(event, h),
  },
  app: {
    getLibraryPath: () => window.api.app.getLibraryPath(),
    setLibraryPath: (p: string) => window.api.app.setLibraryPath(p),
    getVersion: () => window.api.app.getVersion(),
  },
}

export type { FolderRecord, FileRecord, UploadItem, SearchHit, AiProvider, CreateFolderInput }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/library/
git commit -m "$(cat <<'EOF'
refactor: full typed library wrapper for renderer

src/lib/library/index.ts is the single import surface for renderer
code. Components do not call window.api directly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9.2: Replace `src/lib/folder-storage.ts` to delegate to `library.*`

**Files:**
- Modify: `src/lib/folder-storage.ts`

- [ ] **Step 1: Read the current file**

Run: `cat src/lib/folder-storage.ts`

- [ ] **Step 2: Replace it**

```ts
import { library } from "@/lib/library"
import type { FolderRecord, FileRecord } from "@/lib/library/types"
import type { Project, FolderFile, FolderFileType } from "./data"

/**
 * Hydrates the in-memory Project[] from the on-disk SQLite library.
 * Each Project corresponds to one folder row + its file rows merged in.
 */
export async function loadFolders(): Promise<Project[]> {
  const folders = await library.folders.listAll()
  const projects: Project[] = []
  for (const f of folders) {
    const files = await library.files.list(f.id)
    projects.push(folderToProject(f, files))
  }
  return projects
}

/** No-op: persistence is per-mutation now. Kept for compatibility with old call sites. */
export function saveFolders(_folders: Project[]): void {}
export function clearFolders(): void {}

/** Returns the raw bytes for upload; data URLs are no longer used. */
export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}

/** Maps a MIME / filename to the legacy FolderFileType discriminator. */
export function detectFileType(mimeOrName: string): FolderFileType {
  const lower = mimeOrName.toLowerCase()
  if (lower.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/.test(lower)) return "image"
  if (lower.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/.test(lower)) return "video"
  if (/\.(pdf|docx?|txt|md|csv|xlsx?|pptx?)$/.test(lower) || lower.includes("pdf") || lower.includes("document"))
    return "document"
  return "other"
}

function folderToProject(f: FolderRecord, files: FileRecord[]): Project {
  return {
    id: f.id,
    title: f.name,
    fileCount: files.length,
    images: files.filter((x) => x.type === "image").map((x) => x.url),
    isGenerating: false,
    progress: 100,
    createdAt: f.createdAt,
    isEmpty: files.length === 0,
    parentId: f.parentId ?? null,
    color: f.color,
    icon: f.icon,
    coverFileId: f.coverFileId,
    notes: f.notes,
    isFavorite: f.isFavorite,
    isPinned: f.isPinned,
    isArchived: f.isArchived,
    isLocked: f.isLocked,
    workflowStatus: f.workflowStatus,
    dueDate: f.dueDate,
    files: files.map(fileRecordToFolderFile),
    activity: [],
    tags: [],
    customFields: {},
    checklist: [],
    sharedWith: [],
  }
}

function fileRecordToFolderFile(f: FileRecord): FolderFile {
  return {
    id: f.id,
    name: f.name,
    url: f.url,
    type: f.type,
    size: f.size,
    uploadedAt: f.uploadedAt,
    description: f.description,
    favorite: f.isFavorite,
    rotation: f.rotation,
    flipH: f.flipH,
    flipV: f.flipV,
    pinned: f.isPinned,
    ocrText: f.ocrText,
    geo: f.geo,
  }
}
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors. If `Project` lacks any of the fields used above, leave the optional field undefined — do not edit `lib/data.ts` in this task; that's tracked in 9.4.

- [ ] **Step 4: Commit**

```bash
git add src/lib/folder-storage.ts
git commit -m "$(cat <<'EOF'
refactor: folder-storage delegates to library wrapper

loadFolders now reads from the SQLite library via window.api.
saveFolders is a no-op since saves happen per mutation through the
context's individual library calls. readFileAsDataURL is replaced
by readFileAsBytes which returns raw bytes for IPC upload.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9.3: Update `src/contexts/folder-context.tsx` mutators to call `library.*`

**Files:**
- Modify: `src/contexts/folder-context.tsx`

This is the largest renderer change. The context's external API stays the same, so no consumer components break. Internally each mutator now calls the library, then patches local state on success.

- [ ] **Step 1: Update the initial-load `useEffect`**

Find the existing effect that hydrates from `loadFolders()`. Change it to:

```tsx
useEffect(() => {
  let cancelled = false
  void (async () => {
    try {
      const data = await loadFolders()
      if (!cancelled) setFolders(data as FolderWithMeta[])
    } catch (err) {
      console.error("Failed to load library:", err)
    } finally {
      if (!cancelled) setHydrated(true)
    }
  })()
  return () => {
    cancelled = true
  }
}, [])
```

Add `const [hydrated, setHydrated] = useState(false)` near the other `useState` calls and expose it on the context value as `hydrated`.

- [ ] **Step 2: Replace `createFolder` mutator**

Replace the existing `createFolder` body with:

```tsx
const createFolder = useCallback(
  (init?: Partial<Project>): string => {
    const tempId = `tmp-${Date.now()}`
    const optimistic: FolderWithMeta = {
      id: tempId,
      title: init?.title ?? "Untitled",
      fileCount: 0,
      images: [],
      isGenerating: init?.isGenerating ?? false,
      progress: init?.progress ?? 0,
      createdAt: init?.createdAt ?? new Date().toISOString(),
      isEmpty: true,
      parentId: init?.parentId ?? null,
    }
    setFolders((prev) => [...prev, optimistic])
    void (async () => {
      try {
        const real = await library.folders.create({
          parentId: init?.parentId ?? null,
          name: optimistic.title,
        })
        setFolders((prev) =>
          prev.map((f) => (f.id === tempId ? { ...f, id: real.id, title: real.name } : f)),
        )
      } catch (err) {
        setFolders((prev) => prev.filter((f) => f.id !== tempId))
        toast.error((err as Error).message)
      }
    })()
    return tempId
  },
  [],
)
```

- [ ] **Step 3: Replace `renameFolder`, `deleteFolder`, `moveFolder`, `restoreFolder`**

```tsx
const renameFolder = useCallback((id: string, title: string) => {
  setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, title } : f)))
  void library.folders.rename(id, title).catch((err) => {
    toast.error((err as Error).message)
  })
}, [])

const deleteFolder = useCallback((id: string) => {
  setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, deletedAt: new Date().toISOString() } : f)))
  void library.folders.delete(id).catch((err) => toast.error((err as Error).message))
}, [])

const restoreFolder = useCallback((id: string) => {
  setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, deletedAt: undefined } : f)))
  void library.folders.restore(id).catch((err) => toast.error((err as Error).message))
}, [])

const moveFolder = useCallback((id: string, newParentId: string | null) => {
  setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, parentId: newParentId } : f)))
  void library.folders.move(id, newParentId).catch((err) => toast.error((err as Error).message))
}, [])
```

- [ ] **Step 4: Replace `uploadFiles`**

```tsx
const uploadFiles = useCallback(async (folderId: string, files: FileList | File[]) => {
  const list = Array.from(files instanceof FileList ? Array.from(files) : files)
  const items: UploadItem[] = []
  for (const f of list) {
    items.push({ name: f.name, mime: f.type || "application/octet-stream", bytes: await f.arrayBuffer() })
  }
  try {
    const created = await library.files.upload(folderId, items)
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              fileCount: (f.fileCount ?? 0) + created.length,
              isEmpty: false,
              files: [...(f.files ?? []), ...created.map(libraryFileToFolderFile)],
            }
          : f,
      ),
    )
  } catch (err) {
    toast.error((err as Error).message)
  }
}, [])

function libraryFileToFolderFile(f: FileRecord): FolderFile {
  return {
    id: f.id,
    name: f.name,
    url: f.url,
    type: f.type,
    size: f.size,
    uploadedAt: f.uploadedAt,
    favorite: f.isFavorite,
    pinned: f.isPinned,
    rotation: f.rotation,
    flipH: f.flipH,
    flipV: f.flipV,
  }
}
```

Add `import type { UploadItem, FileRecord } from "@/lib/library/types"` at the top, and `import { library } from "@/lib/library"`, `import { toast } from "sonner"`.

- [ ] **Step 5: Subscribe to fs-changed events for live refresh**

Add inside the provider, after the initial-load effect:

```tsx
useEffect(() => {
  const unsub = library.events.on("fs-changed", () => {
    void (async () => {
      const data = await loadFolders()
      setFolders(data as FolderWithMeta[])
    })()
  })
  return unsub
}, [])
```

- [ ] **Step 6: Run typecheck and dev**

Run: `bun run typecheck` → 0 errors.
Run: `bun run dev` → app launches, picker shows on first run, creating a folder writes to disk, dropping a file uploads through IPC, and the folder card image renders via `folders://`.

- [ ] **Step 7: Commit**

```bash
git add src/contexts/folder-context.tsx
git commit -m "$(cat <<'EOF'
refactor: folder context mutators call the library wrapper

createFolder/renameFolder/deleteFolder/restoreFolder/moveFolder/
uploadFiles now route through window.api with optimistic updates
and toast-based rollback. The context subscribes to fs-changed so
external Explorer/Finder edits show up live.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9.4: Update `src/lib/data.ts` types to add the new optional fields

**Files:**
- Modify: `src/lib/data.ts`

Project / FolderFile interfaces in `src/lib/data.ts` are referenced by every component. Some of the new fields surfaced from the library wrapper (e.g. `parentId`, `coverFileId`, etc.) are already present per the existing CLAUDE.md description. Verify and add anything missing.

- [ ] **Step 1: Read `src/lib/data.ts`**

Run: `cat src/lib/data.ts | head -80`

- [ ] **Step 2: If `Project` is missing `parentId`, `coverFileId`, `workflowStatus`, `dueDate` — add them as optional fields in the `Project` interface**

Search `Project` definition. If a field is missing, add it as optional. Do **not** rename or remove existing fields.

- [ ] **Step 3: Verify typecheck**

Run: `bun run typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit (only if any changes were needed)**

```bash
git add src/lib/data.ts
git commit -m "$(cat <<'EOF'
refactor: add new optional fields to Project for library bridge

parentId/coverFileId/workflowStatus/dueDate were already implied by
the FolderContext API but missing on Project. Adding them as
optional preserves all existing usage.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9.5: Replace `<img>` data URL paste handlers in `file-upload-zone.tsx`

**Files:**
- Modify: `src/components/file-upload-zone.tsx`

- [ ] **Step 1: Read the current file**

Run: `cat src/components/file-upload-zone.tsx`

- [ ] **Step 2: Replace any call to `readFileAsDataURL` with `readFileAsBytes` and route through `library.files.upload`**

Find the upload handler. Replace data-URL building with:

```ts
import { library } from "@/lib/library"
import { readFileAsBytes } from "@/lib/folder-storage"

async function handleFiles(files: FileList | File[], folderId: string) {
  const arr = Array.from(files instanceof FileList ? Array.from(files) : files)
  const items = await Promise.all(
    arr.map(async (f) => ({
      name: f.name,
      mime: f.type || "application/octet-stream",
      bytes: await readFileAsBytes(f),
    })),
  )
  await library.files.upload(folderId, items)
}
```

Replace the prior data-URL-based code path entirely.

- [ ] **Step 3: Verify dev**

Run: `bun run dev`. Drop a file into a folder. Confirm:
- Upload succeeds.
- The image renders via `folders://<id>`.
- `localStorage` no longer contains base64 (open DevTools → Application → Storage → check size; should be < 100KB now).

- [ ] **Step 4: Commit**

```bash
git add src/components/file-upload-zone.tsx
git commit -m "$(cat <<'EOF'
refactor: file-upload-zone uploads via library wrapper

The drop/paste handler reads bytes (not data URLs) and uploads
through window.api.files.upload. <img> sources now resolve to
folders://<id> so renderer memory stays small even for large
libraries.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 10 — AI key stubs, search FTS stub, build & auto-update

### Task 10.1: AI key management (stubs for sub-project #3)

**Files:**
- Create: `electron/ipc/ai.ts`
- Modify: `electron/main.ts` (register)

- [ ] **Step 1: Implement `electron/ipc/ai.ts`**

```ts
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
      return JSON.parse(buf.toString("utf8"))
    }
    const dec = safeStorage.decryptString(buf)
    return JSON.parse(dec)
  } catch {
    return {}
  }
}

function saveKeys(keys: Record<string, string>): void {
  const json = JSON.stringify(keys)
  const file = keysPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(file, safeStorage.encryptString(json))
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
```

- [ ] **Step 2: Register in main**

Add to `bootstrapLibrary` (or `whenReady` block):

```ts
import { registerAiIpc } from "./ipc/ai"
registerAiIpc()
```

- [ ] **Step 3: Smoke test in DevTools**

```js
await window.api.ai.setKey("openai", "sk-test-123")
await window.api.ai.getKeyStatus("openai")  // { has: true }
await window.api.ai.deleteKey("openai")
await window.api.ai.getKeyStatus("openai")  // { has: false }
```

- [ ] **Step 4: Commit**

```bash
git add electron/
git commit -m "$(cat <<'EOF'
feat: ai key storage via electron safeStorage

setKey/getKeyStatus/deleteKey persist provider keys to userData/
ai-keys.dat encrypted via the OS keychain (DPAPI on Windows,
Keychain on macOS). No real AI calls yet — those land in
sub-project #3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10.2: Search FTS stub

**Files:**
- Create: `electron/ipc/search.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Implement**

```ts
import { ipcMain } from "electron"
import type Database from "better-sqlite3"
import { wrapIpc } from "./envelope"
import type { SearchHit } from "../../src/lib/library/types"

export function registerSearchIpc(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT
      f.id      AS file_id,
      f.folder_id AS folder_id,
      'name' AS matched_field,
      snippet(files_fts, 0, '<b>', '</b>', '…', 8) AS snippet
    FROM files_fts
    JOIN files f ON f.rowid = files_fts.rowid
    WHERE files_fts MATCH ? AND f.deleted_at IS NULL
    ORDER BY rank
    LIMIT 100
  `)
  ipcMain.handle(
    "search:fts",
    wrapIpc<SearchHit[], [string]>(async (_e, query) => {
      if (!query.trim()) return []
      const rows = stmt.all(query) as {
        file_id: string
        folder_id: string
        matched_field: SearchHit["matchedField"]
        snippet: string
      }[]
      return rows.map((r) => ({
        fileId: r.file_id,
        folderId: r.folder_id,
        matchedField: r.matched_field,
        snippet: r.snippet,
      }))
    }),
  )
}
```

- [ ] **Step 2: Register in `bootstrapLibrary`**

```ts
import { registerSearchIpc } from "./ipc/search"
registerSearchIpc(db)
```

- [ ] **Step 3: Smoke test**

In DevTools after creating a folder + uploading "report.pdf":
```js
await window.api.search.fts("report")
```
Expected: array with one hit referencing the file.

- [ ] **Step 4: Commit**

```bash
git add electron/
git commit -m "$(cat <<'EOF'
feat: fts5-backed search:fts ipc handler

A simple MATCH query over files_fts returns up to 100 hits ranked
by relevance with snippet highlighting. Sub-project #4 will add
semantic search via sqlite-vec on top of this.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10.3: Shell + app IPC handlers (reveal, open-external, version, relaunch)

**Files:**
- Create: `electron/ipc/shell.ts`
- Create: `electron/ipc/app-meta.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Create `electron/ipc/shell.ts`**

```ts
import { ipcMain, shell } from "electron"
import { wrapIpc } from "./envelope"

export function registerShellIpc(): void {
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
```

- [ ] **Step 2: Create `electron/ipc/app-meta.ts`**

```ts
import { app, ipcMain } from "electron"
import { wrapIpc } from "./envelope"

export function registerAppMetaIpc(): void {
  ipcMain.handle("app:get-version", wrapIpc<string>(async () => app.getVersion()))
  ipcMain.handle(
    "app:relaunch",
    wrapIpc<void>(async () => {
      app.relaunch()
      app.exit(0)
    }),
  )
}
```

- [ ] **Step 3: Register in main**

```ts
registerShellIpc()
registerAppMetaIpc()
```

- [ ] **Step 4: Commit**

```bash
git add electron/
git commit -m "$(cat <<'EOF'
feat: shell and app-meta ipc handlers

shell:reveal opens the OS file manager at the given path.
shell:open-external launches default-browser URLs. app:get-version
returns the package version. app:relaunch performs a soft restart.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10.4: Configure `electron-builder.yml` and ship a Windows build

**Files:**
- Create: `electron-builder.yml`
- Modify: `package.json` (add productName + version anchors if missing)

- [ ] **Step 1: Create `electron-builder.yml`**

```yaml
appId: io.folders.app
productName: Folders
artifactName: ${productName}-${version}-${os}-${arch}.${ext}
directories:
  buildResources: build
  output: release
files:
  - dist-electron/**/*
  - dist-renderer/**/*
  - electron/db/schema.sql
  - package.json
asar: true
asarUnpack:
  - "**/node_modules/better-sqlite3/**"
  - "**/node_modules/sharp/**"
extraResources:
  - from: electron/db/schema.sql
    to: schema.sql
publish:
  provider: github
  owner: PLACEHOLDER_OWNER
  repo: folders
  releaseType: draft
win:
  target:
    - target: nsis
      arch:
        - x64
        - arm64
  signAndEditExecutable: false
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  perMachine: false
mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  category: public.app-category.productivity
  hardenedRuntime: false
  gatekeeperAssess: false
```

Replace `PLACEHOLDER_OWNER` with the actual GitHub owner before tagging a release. Note that this can be done at release time — the dev `bun run package` works without it.

- [ ] **Step 2: Run `bun run package`**

Run: `bun run package`
Expected: a Windows `.exe` is produced under `release/` (signing failures are non-fatal — v1 is unsigned).

- [ ] **Step 3: Manually launch the produced installer**

Locate `release/Folders-0.1.0-windows-x64.exe`, run it, install. Launch the installed Folders app. Confirm:
- The library picker appears.
- A test folder can be created and a file uploaded.
- Closing and re-opening the app retains the data.

- [ ] **Step 4: Commit**

```bash
git add electron-builder.yml package.json
git commit -m "$(cat <<'EOF'
build: electron-builder config for windows nsis and mac dmg

NSIS for Windows x64+arm64 (per-user, allows install dir choice).
DMG for macOS x64+arm64. Native deps (better-sqlite3, sharp) are
unpacked from asar so they can be loaded at runtime. Publish points
at github releases as a draft (auto-update plumbing comes next).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10.5: Wire `electron-updater` for GitHub-Releases auto-update

**Files:**
- Create: `electron/auto-update.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Implement `electron/auto-update.ts`**

```ts
import { autoUpdater } from "electron-updater"
import { app, BrowserWindow } from "electron"

export function startAutoUpdate(getWindow: () => BrowserWindow | null): void {
  if (process.env.NODE_ENV === "development") return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("update-downloaded", () => {
    const w = getWindow()
    w?.webContents.send("event:update-ready", { version: app.getVersion() })
  })
  autoUpdater.on("error", (err) => {
    console.error("autoUpdater error:", err)
  })

  void autoUpdater.checkForUpdatesAndNotify()
  setInterval(() => void autoUpdater.checkForUpdatesAndNotify(), 4 * 60 * 60 * 1000)
}
```

- [ ] **Step 2: Wire into main bootstrap**

In `app.whenReady` block:

```ts
import { startAutoUpdate } from "./auto-update"
startAutoUpdate(() => mainWindow)
```

- [ ] **Step 3: Commit**

```bash
git add electron/
git commit -m "$(cat <<'EOF'
feat: electron-updater auto-update on github releases

In production, the app polls GitHub Releases at launch and every
4h. On update-downloaded a 'event:update-ready' message reaches
the renderer; the user is restarted on next quit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 11 — End-to-end smoke test

### Task 11.1: Add Playwright + write a smoke spec

**Files:**
- Create: `tests/e2e/smoke.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Add deps**

Run:
```sh
bun add -d @playwright/test
bunx playwright install
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    actionTimeout: 10_000,
  },
})
```

- [ ] **Step 3: Create `tests/e2e/smoke.spec.ts`**

```ts
import { test, expect, _electron as electron, type ElectronApplication, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

let app: ElectronApplication
let page: Page
let libraryRoot: string

test.beforeAll(async () => {
  libraryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "folders-e2e-"))
  app = await electron.launch({
    args: ["dist-electron/main.js"],
    env: {
      ...process.env,
      FOLDERS_E2E: "1",
      FOLDERS_E2E_LIBRARY: libraryRoot,
    },
  })
  page = await app.firstWindow()
})

test.afterAll(async () => {
  await app.close()
  fs.rmSync(libraryRoot, { recursive: true, force: true })
})

test("library picker accepts a path and the main UI mounts", async () => {
  // The picker takes the path from FOLDERS_E2E_LIBRARY automatically (see Task 11.2).
  await expect(page.getByText("Folders").first()).toBeVisible({ timeout: 15_000 })
})

test("creating a folder writes a real directory on disk", async () => {
  await page.evaluate(async () => {
    await window.api.library.createFolder({ parentId: null, name: "E2E Brand" })
  })
  expect(fs.existsSync(path.join(libraryRoot, "E2E Brand"))).toBe(true)
})

test("uploading a file persists bytes to disk", async () => {
  await page.evaluate(async () => {
    const folder = (await window.api.library.listAllFolders()).find((f) => f.name === "E2E Brand")!
    const bytes = new TextEncoder().encode("hello e2e")
    await window.api.files.upload(folder.id, [
      { name: "hi.txt", mime: "text/plain", bytes },
    ])
  })
  const filePath = path.join(libraryRoot, "E2E Brand", "hi.txt")
  expect(fs.readFileSync(filePath, "utf8")).toBe("hello e2e")
})
```

- [ ] **Step 4: Run E2E**

Run: `bun run build:electron && bun run test:e2e`
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/ playwright.config.ts package.json bun.lock
git commit -m "$(cat <<'EOF'
test: playwright-electron smoke spec

Three checks: app launches and renders, createFolder writes a real
directory under the test library, and files.upload persists exact
bytes to disk. Library root is provided via FOLDERS_E2E_LIBRARY so
the test does not contaminate the user's real ~/Folders.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11.2: Honor `FOLDERS_E2E_LIBRARY` in main bootstrap

**Files:**
- Modify: `electron/ipc/settings.ts`

- [ ] **Step 1: Update `defaultLibraryPath`**

Replace the function:

```ts
export function defaultLibraryPath(): string {
  if (process.env.FOLDERS_E2E_LIBRARY) {
    return process.env.FOLDERS_E2E_LIBRARY
  }
  return path.join(app.getPath("home"), "Folders")
}
```

- [ ] **Step 2: Update `FileSettingsStore.getLibraryPath` to also honor the env var**

Replace `getLibraryPath`:

```ts
getLibraryPath(): string | null {
  if (process.env.FOLDERS_E2E_LIBRARY) return process.env.FOLDERS_E2E_LIBRARY
  if (!fs.existsSync(this.file)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(this.file, "utf8")) as Record<string, unknown>
    const v = raw[LIBRARY_PATH_KEY]
    return typeof v === "string" ? v : null
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add electron/ipc/settings.ts
git commit -m "$(cat <<'EOF'
test: honor FOLDERS_E2E_LIBRARY env to skip picker in tests

When the env var is set, getLibraryPath returns it directly and
the renderer skips the picker. Lets playwright-electron bootstrap
into a known empty directory each run.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 12 — Final cleanup, docs, acceptance

### Task 12.1: Remove `ai-mocks.ts` consumers (left in place per spec)

Per spec §8.6 / §16, `lib/ai-mocks.ts` is intentionally left in place for sub-project #1 — it gets replaced in #3. **No action in this task except confirming nothing breaks.**

- [ ] **Step 1: Confirm `ai-mocks.ts` still exists and compiles**

Run: `bun run typecheck`
Expected: 0 errors. (Skip this task entirely if step 1 passes.)

---

### Task 12.2: Strip the legacy `Toaster` theme color from any dead-code paths

**Files:**
- Modify: `src/App.tsx` (only if `theme === "light"` branch references colors no longer in tokens)

- [ ] **Step 1: Verify no warnings in dev console after running the app**

Run: `bun run dev`. In DevTools console look for "use client" warnings or runtime errors. None expected.

- [ ] **Step 2: If errors are present, fix the smallest set of imports/usages and commit; otherwise skip**

(Conditional task — safe to skip if dev runs cleanly.)

---

### Task 12.3: Update `CLAUDE.md` to reflect the new architecture

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the `## Project shape` section**

```markdown
## Project shape

A Vite + React Router + Electron desktop app for Windows and macOS. State is persisted to a SQLite database at `<library>/.folders-app/library.db` and files are stored on the user's filesystem under `<library>/`. There is no backend, no sync, and no third-party providers — all AI features are BYOK and run client-side.

Renderer code lives in `src/`. Electron main / preload code lives in `electron/`.
```

- [ ] **Step 2: Replace `## Commands`**

```markdown
## Commands

Package manager is **bun**.

- `bun install` — install deps
- `bun run dev` — Vite + Electron concurrent dev
- `bun run build` — production build (renderer + main)
- `bun run package` — produce installers via electron-builder
- `bun run lint` — eslint
- `bun run typecheck` — tsc on both renderer and main configs
- `bun run test` — vitest (unit + integration)
- `bun run test:e2e` — playwright-electron smoke
```

- [ ] **Step 3: Update `### Persistence`**

```markdown
### Persistence (SQLite + filesystem)

- Files: stored as real files on disk under `<library>/`. Library path is chosen on first run; default `<home>/Folders/`.
- Metadata: SQLite at `<library>/.folders-app/library.db` via `better-sqlite3`. Schema in `electron/db/schema.sql`.
- Settings: `app_settings` table; bootstrap settings (library path) at `app.getPath("userData")/bootstrap-settings.json`.
- AI keys: encrypted with `safeStorage`, stored at `app.getPath("userData")/ai-keys.dat`.
- Files are served to the renderer through the custom `folders://<file-id>` protocol — never as data URLs.
```

- [ ] **Step 4: Replace `### i18n` (no behavioral change but path)**

Update the path references from `lib/...` to `src/lib/...`.

- [ ] **Step 5: Drop the `## v0.app sync` section if any leftover**

(Already removed in Task 0.2; double-check.)

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: update CLAUDE.md to reflect electron + sqlite architecture

The project is no longer a Next.js + localStorage app. Updated
project shape, commands, and persistence sections to point at
the Vite + Electron + SQLite reality.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12.4: Final acceptance pass

- [ ] **Step 1: Run lint + typecheck + tests**

Run:
```sh
bun run lint
bun run typecheck
bun run test
bun run test:e2e
```
Each must exit 0. Fix any failures before continuing.

- [ ] **Step 2: Manual smoke checklist**

Boot `bun run dev`. Run through every box from spec §13:

- [ ] App launches and shows the library picker on first run.
- [ ] After picking a path, the main UI renders.
- [ ] Creating a folder produces `<library>/<name>/` on disk (verify in Explorer/Finder).
- [ ] Renaming a folder in the UI renames it on disk.
- [ ] Dropping an image into a folder uploads it; thumbnail renders via `folders://<id>`; opening the file via Reveal in Explorer shows it.
- [ ] Closing and reopening the app preserves all data.
- [ ] Externally creating a folder in Explorer while the app runs: it appears in the UI within ~300ms.
- [ ] Externally deleting a folder in Explorer: marked deleted on next reconcile (close & reopen, or trigger a watcher event).
- [ ] No data URLs in `localStorage` (DevTools → Application).
- [ ] `bunx tsc --noEmit` and `bun run lint` are both clean.

- [ ] **Step 3: Tag and produce a 0.1.0 build**

```sh
git tag v0.1.0
bun run package
```

Inspect `release/` — confirm Windows .exe and (on macOS host) .dmg artifacts exist.

- [ ] **Step 4: Final commit if anything was tweaked**

If any minor fixes were applied during the manual smoke pass, commit them under one final message:

```bash
git commit -m "$(cat <<'EOF'
chore: final fixes from foundation acceptance pass

Closing out sub-project #1. Next: state refactor + virtualization
+ perf, then real BYOK AI, then semantic search, then workspaces
+ themes + onboarding.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Done

Sub-project #1 — Electron foundation — is complete when every checkbox in Phase 12 Task 12.4 step 2 is ticked. At that point:

- The app runs as a real desktop app on Windows (and macOS, if built on a Mac host).
- All file content lives on the user's disk in human-readable folder structure.
- All metadata lives in SQLite, never localStorage.
- v0.app integration is fully removed.
- Filesystem and DB stay consistent across app launches and external edits.
- AI key storage and FTS search are wired (real implementations land in #3 and #4).

Sub-projects #2 (perf + state refactor + undo/redo + version-history UI), #3 (real BYOK AI), #4 (semantic search + Cmd+K syntax + Saved Searches sidebar), and #5 (workspaces + themes + onboarding) each get their own spec → plan → implementation cycle starting from the foundation produced here.




