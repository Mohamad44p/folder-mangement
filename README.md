# Folders — visual folder management

A dark-mode folder grid UI for organizing files in the browser. Each card shows
the folder name, file count, last-updated timestamp, and a stack of preview
thumbnails. Includes nested subfolders, smart folders, drag-and-drop, bulk
actions, trash recovery, workspaces, and a slideshow / compare lightbox.

Frontend-only — no server, no API. All state lives in `localStorage`.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/alexs-projects-ce23ae4b/v0-ai-clips-xxx)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/zywwjfhpyuB)

## Stack

- **Next.js 16** (App Router) on **React 19**
- **TypeScript 6**
- **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config.*` — tokens live in `app/globals.css`)
- **shadcn/ui** (`new-york` style, `neutral` base, Lucide icons) — only `dropdown-menu` and `select` are vendored; the rest of the UI is hand-rolled
- **Radix UI** primitives, **Framer Motion**, **Recharts**, **date-fns**, **react-hook-form** + **zod**
- **bun** as the package manager (`bun.lock` is committed)

## Quick start

```bash
bun install
bun run dev          # http://localhost:3000
```

Other scripts:

| Command           | What it does                                         |
| ----------------- | ---------------------------------------------------- |
| `bun run build`   | Production build                                     |
| `bun run start`   | Serve the built app                                  |
| `bun run lint`    | `eslint .`                                           |
| `bunx tsc --noEmit` | Explicit type-check (build ignores TS errors — see below) |

> `next.config.mjs` sets `typescript.ignoreBuildErrors: true` and
> `eslint.ignoreDuringBuilds: true`, so `bun run build` will not catch type or
> lint errors. Run `bunx tsc --noEmit` and `bun run lint` explicitly in CI.

There is no test runner configured.

## Features

**Folders & files**

- Nested folders (flat in storage, tree by `parentId`)
- Drag-and-drop reordering, moving between folders, and OS file drops
- Bulk edit, bulk rename with patterns, cross-folder rename
- Folder templates, decorators (color / icon / cover), checklists, due dates,
  custom fields, notes, comments, reactions
- Trash with restore

**Views**

- Grid, calendar, map, activity heatmap, activity timeline, storage chart
- Image lightbox with annotations, slideshow, and compare mode
- PDF and inline video preview

**Search & organisation**

- Global command palette
- Smart folders (rule-based, evaluated client-side over the in-memory file set)
- Saved searches, image search, duplicate finder, EXIF panel
- Tags, favourites, workflow status, workspaces

**Productivity**

- Keyboard shortcuts (see the in-app shortcuts modal)
- Onboarding tour
- Import / export (zip) and folder sharing modal

**Internationalisation**

- English and Arabic (RTL, Cairo font)
- Arabic-Indic numerals via `lib/localize.ts`

## Project layout

```
app/
  globals.css         # Tailwind v4 tokens, theme variables
  layout.tsx          # Provider stack (see below)
  page.tsx            # Main grid
components/
  project-folder/     # Folder card (default + failed states, sparkles, menu)
  ui/                 # Vendored shadcn primitives (dropdown-menu, select)
  *.tsx               # Modals, panels, toolbars, views
contexts/
  settings-context.tsx     # theme, language, accent, density, reduce-motion
  i18n-context.tsx         # reads language, exposes `useT()`
  generation-context.tsx   # per-card generation animation
  dnd-context.tsx          # custom HTML5 DnD
  folder-context.tsx       # folders, files, smart folders, trash, workspaces, lightbox state, …
lib/
  folder-storage.ts        # localStorage v1 schema for folders
  folder-templates.ts
  smart-folder-engine.ts   # rule eval (tag | type | favorite | name | size | uploaded)
  i18n-dict.ts             # en + ar strings
  localize.ts              # localizeTitle / localizeTag / formatBytesLocalized / …
  play-state-manager.ts    # singleton for "only one preview plays at a time"
  keyboard-shortcuts.ts
  rename-pattern.ts
  zip-export.ts
  exif.ts
  data.ts
  ai-mocks.ts
  color-palette.ts
  markdown.tsx
  utils.ts
```

## Architecture notes

### Provider stack (`app/layout.tsx`)

Order is load-bearing — keep it intact:

```
SettingsProvider → I18nProvider → GenerationProvider → DndProvider → FolderProvider
```

`I18nProvider` reads `language` from `SettingsProvider`, and several lower
providers read folder state. Reordering will break hooks at runtime.

### Central state

`contexts/folder-context.tsx` is the one large context. It owns folders, files,
smart folders, saved searches, workspaces, trash, lightbox / slideshow / compare
modal state, drag selection, sidebar / trash flags, and the CRUD operations
that mutate them. New folder or file features should attach here rather than
introduce a sibling context.

### Persistence

| Key                          | Contents                                                |
| ---------------------------- | ------------------------------------------------------- |
| `folder-mgr:v2`              | `{ folders, version: 1 }`                               |
| `folder-mgr:settings:v2`     | theme, language, accent, density, reduceMotion          |

Uploaded files are read with `FileReader.readAsDataURL` and stored inline as
data URLs. Quota errors are swallowed silently — be conservative about what
gets persisted, since nothing else clears storage on quota failure.

### Drag-and-drop

Custom HTML5 DnD (not `react-dnd` or `dnd-kit`):

```tsx
const drag = useDraggable({ kind: "file", id, payload });
const drop = useDropTarget({
  id: folderId,
  accept: ["file", "folder", "os-files"],
  onDropItem: (item) => …,
  onDropFiles: (files) => …,    // accept "os-files" handles drops from the OS
  canDrop: (item) => …,
});
```

### i18n

- Two languages in `lib/i18n-dict.ts`: `en` and `ar`.
- Static UI strings: add a key to **both** language blocks, then `const { t } = useT()`.
- Dynamic content (folder titles, tags, dates, byte sizes, numerals) goes
  through `lib/localize.ts` — `localizeTitle`, `localizeTag`,
  `formatDateLocalized`, `formatBytesLocalized`, `localizeNumber`. Don't
  format these inline.
- Arabic flips `<html dir="rtl">` and uses Cairo font (set in `app/layout.tsx`).

### Theming

- Tokens live in `app/globals.css` — there is no `tailwind.config.*`.
- User accent color writes `--accent-user`, `--accent-user-soft`,
  `--accent-user-ring` on `:root`. **Do not write to `--accent`** — that's
  shadcn's token and we deliberately don't clobber it.
- Density and reduce-motion are exposed as `data-density` and
  `data-reduce-motion` attributes on `<html>`; `MotionConfig` wires Framer
  Motion to the same flag.

### Smart folders

Rules are evaluated client-side in `lib/smart-folder-engine.ts` over the
in-memory file set. Supported fields: `tag | type | favorite | name | size |
uploaded`. Add new rule fields here and in the editor
(`components/smart-folder-editor.tsx`).

### Single-file-playing invariant

`lib/play-state-manager.ts` is a module-level singleton that ensures only one
previewable file plays across the app. Any new audio/video preview component
should call `setPlayingFile(id)` on play and subscribe via
`subscribeToPlayState` to pause itself when another file starts.

### Path alias

`@/*` → repo root (configured in `tsconfig.json` and the shadcn config).
Imports like `@/components/...`, `@/lib/...`, `@/contexts/...` are the
convention.

## v0.app sync

This repo auto-syncs from v0.app deployments. Changes pushed from v0 may
overwrite local edits, so prefer surgical changes and avoid sweeping reformats
in files v0 also touches. Continue building on
[v0.app/chat/zywwjfhpyuB](https://v0.app/chat/zywwjfhpyuB).

## Deployment

The app is live on Vercel:
[vercel.com/alexs-projects-ce23ae4b/v0-ai-clips-xxx](https://vercel.com/alexs-projects-ce23ae4b/v0-ai-clips-xxx).

Vercel auto-deploys from `main`. Set the install command to `bun install` and
the build command to `bun run build` if Vercel doesn't detect bun from the
lockfile.
