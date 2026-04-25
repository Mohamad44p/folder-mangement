# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

A **Vite + React Router + Electron desktop app** for Windows and macOS. State is persisted to a SQLite database at `<library>/.folders-app/library.db` (via `better-sqlite3`); files are stored on the user's filesystem under `<library>/`. There is no backend, no sync, and no third-party providers — AI features are BYOK and run client-side. Renderer code lives in `src/`; Electron main/preload in `electron/`.

## Commands

Package manager is **bun**.

- `bun install` — install deps (postinstall rebuilds native modules for Electron's Node ABI)
- `bun run dev` — Vite + Electron concurrent dev
- `bun run build` — production build (renderer + main)
- `bun run package` — installer artifacts via electron-builder (NSIS + DMG)
- `bun run lint` — eslint flat config (`eslint.config.js`)
- `bun run typecheck` — tsc on renderer + main configs
- `bun run rebuild:electron` — re-run electron-rebuild after a `npm rebuild`

## Architecture

### Process model (Electron)

Three processes:
- **Main** (Node, `electron/main.ts`) — owns SQLite, filesystem ops, OS keychain, window lifecycle.
- **Preload** (`electron/preload.ts`) — sandboxed; exposes typed `window.api` via `contextBridge`.
- **Renderer** (`src/`) — sandboxed, `nodeIntegration: false`, `contextIsolation: true`. Calls main only via `window.api`.

The full IPC surface is typed in `src/lib/library/types.ts` and consumed via the wrapper at `src/lib/library/index.ts`. Components do **not** call `window.api` directly — always go through `library.*`.

### Provider stack (`src/main.tsx`)

Order is load-bearing — keep it intact:

`SettingsProvider` → `I18nProvider` → `GenerationProvider` → `DndProvider` → `FolderProvider` → `BrowserRouter`

`I18nProvider` reads `language` from `SettingsProvider`, lower providers read folder state. Reordering breaks hooks at runtime.

### Central state: `src/contexts/folder-context.tsx`

One large context owns folders, files, smart folders, saved searches, workspaces, trash, lightbox/slideshow/compare modal state. Mutators are async — they call `library.*`, optimistically update local state, and roll back on error with a toast.

### Persistence

| Where | What |
|---|---|
| `<library>/<folder-name>/...` | Real folders and files on disk |
| `<library>/.folders-app/library.db` | SQLite metadata (folders, files, tags, comments, annotations, versions, FTS5) |
| `<library>/.folders-app/trash/` | Soft-deleted entries (recoverable) |
| `<library>/.folders-app/versions/<file-id>/` | File version history (last N copies) |
| `<library>/.folders-app/thumbs/` | Generated thumbnails |
| `app.getPath("userData")/bootstrap-settings.json` | Library path (read before DB opens) |
| `app.getPath("userData")/ai-keys.dat` | AI provider keys, encrypted via `safeStorage` |

### Custom protocol `folders://`

Files reach the renderer via `folders://<file-id>` URLs (registered in `electron/protocols/folders-scheme.ts`). `<img src="folders://abc">` resolves to the real disk path through main's protocol handler. **Never** use data URLs for file content.

### Filesystem ops (`electron/fs-ops.ts`)

All mutations are atomic at both layers — single `fs.renameSync` (atomic on same filesystem) plus a sqlite transaction. Filename collisions append `(2)`, `(3)`. Trash relocates files into `.folders-app/trash/<rel>` preserving the original path for restore.

### File watcher

`chokidar` watches `<library>/` excluding `.folders-app/`. Events debounced 300ms, forwarded as `events.on("fs-changed", …)`. App-initiated ops mute their target path before the FS write so chokidar ignores its own echo.

### i18n (`src/contexts/i18n-context.tsx`, `src/lib/i18n-dict.ts`, `src/lib/localize.ts`)

- Two languages: `en` and `ar`. Arabic flips `<html dir="rtl">` and uses Cairo font.
- Static UI strings: add a key to **both** language blocks in `i18n-dict.ts`, then `const { t } = useT()`.
- Dynamic content (folder titles, tags, dates, byte sizes, numerals) goes through `src/lib/localize.ts` — `localizeTitle`, `localizeTag`, `formatDateLocalized`, `formatBytesLocalized`, `localizeNumber` (Arabic-Indic digits). Don't format inline.

### Drag-and-drop (`src/contexts/dnd-context.tsx`)

Custom HTML5 DnD — not `react-dnd` or `dnd-kit`. `useDraggable({ kind, ... })` and `useDropTarget({ id, accept, onDropItem, onDropFiles, canDrop })`. The `"os-files"` accept type handles drops from the operating system.

### Theming

- Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.*`); design tokens live in `src/index.css`.
- shadcn config: `components.json` style `new-york`, base color `neutral`, `lucide` icons.
- User accent color writes `--accent-user` / `--accent-user-soft` / `--accent-user-ring` on `:root`. **Do not write to `--accent`** — that's shadcn's token.
- Theme is one of `dark | light | auto`. `auto` reads `prefers-color-scheme` and reapplies on OS theme change. The active theme is exposed as `data-theme` on `<html>` (always `dark` or `light` even when the user picked `auto`).
- Density and reduce-motion exposed as `data-density` / `data-reduce-motion` on `<html>`; `MotionConfig` wires Framer Motion to the same flag.

### Performance

- The main folder grid switches to `<VirtualFolderGrid>` when the active list exceeds 100 items (`@tanstack/react-virtual` window virtualizer, row-based, 1/2/3 responsive columns). Below that threshold the existing motion-animated grid renders.

### AI (BYOK)

- Provider keys (`anthropic` / `openai`) are stored at `userData/ai-keys.dat` encrypted via `safeStorage`. The `AiKeysSection` component in the settings popover manages them.
- `electron/ipc/ai-real.ts` implements `ai:auto-tag` and `ai:caption`. Auto-tag prompts the model for ≤8 lowercase tags and persists them into `file_ai_tags` (and updates `ai_tag_status`). Caption persists into the `caption` column.
- `folder-context.tsx` fires `library.ai.autoTag(fileId)` after each image upload; failures are silent (no key configured / network error / model failure).

### Power search

- `src/components/global-search-palette.tsx` parses the Cmd+K query for syntax tokens: `tag:`, `type:`, `name:`, `before:YYYY-MM-DD`, `after:YYYY-MM-DD`, `size:` with `>`/`<`/`>=`/`<=`/`=` operators and `B`/`KB`/`MB`/`GB` units, plus `fav` / `favorite`. Quoted multi-word values are honoured: `name:"vacation 2026"`.
- `src/lib/search-syntax.ts` is the standalone reusable parser with the same syntax. The palette currently has its own copy of the parser; consolidate when the search UI is rewritten.

### Undo

- Destructive actions (currently `deleteFolder`) emit a sonner toast with an Undo action that calls `restoreFolder`. Soft-delete moves the on-disk folder to `.folders-app/trash/<rel>` so the restore is a single rename back.

### Path alias

`@/*` → `src/*`, configured in `tsconfig.json` and resolved by `vite-tsconfig-paths`.

### Single-file-playing invariant (`src/lib/play-state-manager.ts`)

Module-level singleton ensures only one previewable file plays across the app. Any new audio/video preview component must call `setPlayingFile(id)` on play and subscribe via `subscribeToPlayState`.

### Smart folders (`src/lib/smart-folder-engine.ts`)

Rule-based virtual folders evaluated client-side over the in-memory file set. Supported fields: `tag | type | favorite | name | size | uploaded`. Add new fields here and in `src/components/smart-folder-editor.tsx`.

## Distribution

Built as desktop installers via `electron-builder` (NSIS for Windows, DMG for macOS). Auto-update via `electron-updater` reading from GitHub Releases. v1 ships unsigned; signing decisions are deferred.
