# Folders

Local-first folder management for Windows and macOS. Files live on your disk, metadata in a local SQLite database, AI features bring-your-own-key. No backend, no sync, no third-party providers.

## Status

In active migration from a Next.js prototype to a Vite + Electron desktop app. See `docs/superpowers/specs/2026-04-25-electron-foundation-design.md` for the full architecture.

## Development

```sh
bun install
bun run dev          # Vite + Electron concurrent dev
```

## Build

```sh
bun run build        # renderer + main process
bun run package      # produce installers via electron-builder
```

## Stack

- **Electron 33** desktop shell (Windows + macOS)
- **Vite 6** + **React 19** + **React Router 6** renderer
- **TypeScript 6**, **Tailwind CSS v4**, shadcn/ui
- **better-sqlite3** for local metadata, **chokidar** for filesystem watching, **sharp** for thumbnails
- **bun** as the package manager
