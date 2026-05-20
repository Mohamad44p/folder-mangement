# Folders

A local-first folder manager for Windows and macOS. Your files stay on your disk, your metadata stays in a local SQLite database, and AI features are bring-your-own-key. No backend. No sync. No third-party telemetry.

> Built as a desktop app on Electron + React. Designed for people who want a fast, calm, fully-offline place to organize files — with optional AI to do the boring parts.

## Highlights

- **Local-first.** Real files in real folders on your disk. Metadata in a single SQLite file. Nothing leaves your machine unless you opt in.
- **Soft-delete + undo.** Destructive actions go to a recoverable trash and toast an Undo for one-click restore.
- **Atomic ops.** Filesystem renames and DB writes are paired so you never end up with half-applied state. Filename collisions auto-suffix `(2)`, `(3)`.
- **Live FS watching.** External changes to your library are picked up automatically via `chokidar`, debounced so bulk operations don't thrash.
- **Smart folders.** Rule-based virtual folders over `tag`, `type`, `favorite`, `name`, `size`, `uploaded`.
- **Power search.** Query syntax with `tag:`, `type:`, `name:`, `before:`, `after:`, `size:>10MB`, `fav`, quoted phrases — one parser shared across the global palette and smart folders.
- **Versioning.** File history is kept under `.folders-app/versions/<file-id>/`.
- **Comments, annotations, reactions.** Lightweight collaboration primitives, stored locally.
- **Lightbox, slideshow, compare.** Built-in image viewers including side-by-side compare.
- **EXIF + thumbnails.** `sharp` for fast thumbs, `exifr` for image metadata.
- **Drag-and-drop.** Native HTML5 DnD, including drops from the OS.
- **Virtualized grid.** Large folders (>100 items) swap to `@tanstack/react-virtual` for smooth scrolling.
- **i18n.** English and Arabic out of the box, with full RTL and Arabic-Indic numerals.
- **Theming.** Dark / light / auto, density and reduced-motion toggles, custom accent color.
- **BYOK AI.** Anthropic, OpenAI, or OpenRouter keys stored encrypted via OS-level `safeStorage`. Drives auto-tagging, captions, OCR, and folder descriptions.
- **Auto-update.** `electron-updater` pulls signed releases from GitHub Releases.

## Download

Pre-built installers for Windows (NSIS) and macOS (DMG) are published on the [Releases page](https://github.com/Mohamad44p/folder-mangement/releases).

## Tech stack

- **Electron 33** desktop shell
- **Vite 6** + **React 19** + **React Router 6** renderer
- **TypeScript**, **Tailwind CSS v4**, **shadcn/ui** (`new-york`, `neutral`, `lucide` icons)
- **better-sqlite3** for local metadata (FTS5 enabled)
- **chokidar** for filesystem watching, **sharp** for thumbnails, **exifr** for EXIF
- **framer-motion** for motion, **@tanstack/react-virtual** for virtualization
- **bun** as the package manager

## Architecture

Three Electron processes with strict isolation:

| Process | Lives in | Responsibility |
|---|---|---|
| **Main** | `electron/main.ts` | SQLite, filesystem ops, OS keychain, window lifecycle |
| **Preload** | `electron/preload.ts` | Sandboxed bridge; exposes typed `window.api` via `contextBridge` |
| **Renderer** | `src/` | UI; `nodeIntegration: false`, `contextIsolation: true` |

The renderer never touches Node or the filesystem directly. The full IPC surface is typed in `src/lib/library/types.ts` and consumed through a single wrapper at `src/lib/library/index.ts`.

### Where things live on disk

```
<library>/
├── <your folders and files>
└── .folders-app/
    ├── library.db              # SQLite metadata (folders, files, tags, FTS5, ...)
    ├── trash/                  # Soft-deleted entries (recoverable)
    ├── versions/<file-id>/     # File version history
    └── thumbs/                 # Generated thumbnails

<userData>/
├── bootstrap-settings.json     # Library path (read before DB opens)
└── ai-keys.dat                 # AI keys, encrypted via safeStorage
```

Files reach the renderer via a custom `folders://<file-id>` protocol, so `<img src="folders://abc">` resolves to the real disk path without ever copying bytes into a data URL.

For a deeper dive, see [`CLAUDE.md`](./CLAUDE.md) and [`docs/superpowers/specs/2026-04-25-electron-foundation-design.md`](./docs/superpowers/specs/2026-04-25-electron-foundation-design.md).

## Development

Requires **[bun](https://bun.sh)**.

```sh
bun install          # installs deps; postinstall rebuilds native modules for Electron's Node ABI
bun run dev          # Vite + Electron concurrent dev
bun run lint         # eslint flat config
bun run typecheck    # tsc on renderer + main configs
```

## Build

```sh
bun run build        # renderer + main process
bun run package      # NSIS (Windows) + DMG (macOS) installers via electron-builder
```

If native modules go out of sync after a manual `npm rebuild`:

```sh
bun run rebuild:electron
```

## Project layout

```
electron/            # Main + preload (Node)
  main.ts
  preload.ts
  fs-ops.ts          # Atomic filesystem ops
  ipc/               # IPC handlers (incl. ai-real.ts for BYOK AI)
  protocols/         # folders:// scheme

src/                 # Renderer (React)
  contexts/          # SettingsProvider, I18nProvider, FolderProvider, DndProvider
  components/        # UI (shadcn-style)
  lib/
    library/         # Typed window.api wrapper
    smart-folder-engine.ts
    search-syntax.ts # Shared search parser
    i18n-dict.ts
    localize.ts
    play-state-manager.ts  # Single-file-playing invariant
```

Path alias: `@/*` → `src/*`.

## Contributing

Issues and pull requests are welcome. A few conventions worth knowing before you start:

- **Provider order in `src/main.tsx` is load-bearing.** `SettingsProvider → I18nProvider → DndProvider → FolderProvider → BrowserRouter`. Don't reorder without a reason.
- **All IPC goes through `library.*`.** Components must not call `window.api` directly.
- **i18n is mandatory for new strings.** Add the key to both `en` and `ar` blocks in `src/lib/i18n-dict.ts` and use `useT()`. Dynamic content (dates, byte sizes, numerals, tags) goes through `src/lib/localize.ts`.
- **Don't write to `--accent`.** That's shadcn's token. User accent writes `--accent-user` / `--accent-user-soft` / `--accent-user-ring`.
- **New search tokens land in `src/lib/search-syntax.ts`.** It's the single source of truth for the palette and smart folders.
- **Audio/video previews must respect the single-file-playing invariant.** Call `setPlayingFile(id)` on play; subscribe via `subscribeToPlayState`.

See `CLAUDE.md` for the full set of conventions.

## License

[MIT](./LICENSE) © Mohamad
