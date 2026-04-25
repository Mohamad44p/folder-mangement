---
date: 2026-04-25
status: approved (pending user review of written spec)
sub-project: 1 of 5
authors: brainstorming session
---

# Electron foundation: Vite + React Router + local SQLite/filesystem storage

## 1. Context

The existing app is a Next.js 16 / React 19 frontend-only folder-management UI. Every meaningful component is a client component. All state — including uploaded file contents as base64 data URLs — is persisted to `localStorage`. AI features are mocked in `lib/ai-mocks.ts`. There is no backend, no auth, no sync.

The product goal is to transform this into a **real, local-first desktop app** for Windows and macOS with no servers, no third-party providers, no sync, no accounts. Files live on the user's disk; metadata in a local SQLite database. AI features will be real (BYOK — user supplies their own provider keys), but that is a later sub-project.

## 2. Scope decomposition

The full transformation is broken into 5 independent sub-projects, each shipping its own spec → plan → implementation cycle. **This spec covers sub-project #1 only.** Each later sub-project will be specced separately.

| # | Sub-project | Status |
|---|---|---|
| 1 | **Electron shell + real local storage** | **this spec** |
| 2 | State refactor + virtualization + perf (split god-context, `@tanstack/virtual`, undo/redo, version history surface) | pending |
| 3 | Real AI (BYOK): replace `lib/ai-mocks.ts` with real auto-tag / caption / OCR / cover-suggest / auto-organize against user's chosen provider | pending |
| 4 | Semantic search + Cmd+K syntax + Saved Searches sidebar surface (sqlite-vec, query parser, chips/autocomplete) | pending |
| 5 | Workspaces actually scoping folder trees + themes (light/auto/per-folder color tags) + onboarding tour | pending |

## 3. Decisions locked in this design

- **Desktop only**, **Windows + macOS** (Linux post-v1).
- **Electron** framework.
- Storage on user's disk in **visible-mirror layout**: real folders, real files, plus a hidden `.folders-app/` for metadata, thumbnails, trash, version history, and AI cache.
- Default library location: `<user home>/Folders/` (configurable in settings).
- **No backend, no accounts, no sync, no E2EE.**
- v0.app sync to be **removed completely** in this sub-project.
- Sharing simplified to **"Export as ZIP"** only (existing `lib/zip-export.ts` already does this).
- Frontend stack: **Vite + React Router**, replacing Next.js.
- v1 ships **unsigned** (Trusted Signing on Windows, Apple Developer Program later).
- Distribution: **GitHub Releases** + `electron-updater`. No update server.
- Web build is **dropped**.

## 4. Out of scope (deferred to later sub-projects)

- Real AI implementations (sub-project #3).
- Semantic search and embeddings (sub-project #4).
- Multi-workspace isolation logic, themes beyond accent, onboarding tour (sub-project #5).
- Splitting `folder-context.tsx` into smaller contexts; virtualization; undo/redo (sub-project #2).
- Code signing, Mac/Win store distribution.
- Mobile / web / Linux builds.

## 5. Architecture

### 5.1 Process model

Three processes:

1. **Main process** (Node.js): owns SQLite, filesystem operations, OS keychain access, native window lifecycle. Single instance per app. Code lives under `electron/`.
2. **Preload script** (sandboxed bridge): runs in a privileged context but with `contextIsolation: true`. Uses `contextBridge.exposeInMainWorld('api', …)` to expose a typed `window.api` to the renderer. Renderer cannot reach Node directly.
3. **Renderer process** (Chromium): all React/UI code. `nodeIntegration: false`, `contextIsolation: true`, sandboxed. Can only talk to main via `window.api`.

### 5.2 File tree (target)

```
electron/                            # Node-side (NEW)
  main.ts                            # createWindow, registerIPC, registerProtocol
  preload.ts                         # contextBridge → window.api
  ipc/
    library.ts                       # folder CRUD + tree queries
    files.ts                         # file CRUD + reveal-in-OS
    ai.ts                            # key management only this sub-project; calls in #3
    search.ts                        # FTS for now; semantic in sub-project #4
    fs-watcher.ts                    # chokidar watcher + debounced events
    settings.ts                      # library path, theme, density, etc.
  protocols/
    folders-scheme.ts                # `folders://<file-id>` → real disk path
  fs-ops.ts                          # atomic moves, renames, trash, versions
  db/
    schema.sql                       # initial schema
    migrations/                      # numbered .sql files
    open.ts                          # opens DB, runs migrations, integrity check
    queries.ts                       # prepared statements

src/                                 # all renderer code (was app/ + components/ + …)
  main.tsx                           # entry: providers + <App />
  App.tsx                            # routes
  index.css                          # was app/globals.css
  components/                        # MOVED, no internal edits this sub-project
  contexts/                          # MOVED
  lib/                               # MOVED + new library/ wrapper
    library/
      index.ts                       # typed wrapper around window.api
      types.ts                       # shared types (mirrored in electron/)
  hooks/                             # MOVED

public/                              # unchanged
index.html                           # NEW (Vite root)
vite.config.ts                       # NEW
electron-builder.yml                 # NEW
tsconfig.json                        # updated path alias to src/
tsconfig.electron.json               # NEW (Node target for main process)
package.json                         # rewritten scripts; renamed; deps adjusted
```

### 5.3 IPC contract — `window.api`

End-to-end TypeScript types shared via `src/lib/library/types.ts` (single source of truth, imported by both renderer and main).

```ts
// All methods return Promise<T>. Main wraps every handler to return
// { ok: true, data: T } | { ok: false, error: { code: string; message: string } }
// The preload unwraps and either returns data or throws a typed Error.

window.api = {
  library: {
    listAllFolders(): Promise<Folder[]>                  // hydrate full tree on app load
    listFolders(parentId: string | null): Promise<Folder[]>
    getFolder(id: string): Promise<Folder | null>
    createFolder(input: CreateFolderInput): Promise<Folder>
    renameFolder(id: string, name: string): Promise<void>
    deleteFolder(id: string): Promise<void>             // soft delete → trash
    restoreFolder(id: string): Promise<void>
    permanentlyDeleteFolder(id: string): Promise<void>
    moveFolder(id: string, newParentId: string | null): Promise<void>
    updateFolderMetadata(id: string, patch: Partial<FolderMetadata>): Promise<void>
    duplicateFolder(id: string): Promise<Folder>
    getDescendantIds(id: string): Promise<string[]>
    buildPathTitles(id: string): Promise<string[]>
    getStats(): Promise<Stats>
  },

  files: {
    listInFolder(folderId: string): Promise<FolderFile[]>
    upload(folderId: string, items: UploadItem[]): Promise<FolderFile[]>  // bytes via Buffer/Uint8Array
    delete(folderId: string, fileId: string): Promise<void>
    move(srcFolderId: string, fileId: string, dstFolderId: string): Promise<void>
    rename(folderId: string, fileId: string, name: string): Promise<void>
    setMetadata(folderId: string, fileId: string, patch: Partial<FileMetadata>): Promise<void>
    bulkUpdate(folderId: string, fileIds: string[], patch: Partial<FileMetadata>): Promise<void>
    bulkDelete(folderId: string, fileIds: string[]): Promise<void>
    bulkMove(srcFolderId: string, fileIds: string[], dstFolderId: string): Promise<void>
    revealInOS(folderId: string, fileId: string): Promise<void>
    listVersions(fileId: string): Promise<FileVersion[]>
    restoreVersion(fileId: string, versionId: string): Promise<void>
  },

  search: {
    fts(query: string): Promise<SearchHit[]>            // SQLite FTS5
    parse(rawQuery: string): Promise<ParsedQuery>       // syntax parser stub (filled in #4)
    // semantic(...) added in sub-project #4
  },

  ai: {
    // Stubs in this sub-project — real implementations in sub-project #3.
    setKey(provider: AiProvider, key: string): Promise<void>           // → safeStorage
    getKeyStatus(provider: AiProvider): Promise<{ has: boolean }>
    deleteKey(provider: AiProvider): Promise<void>
  },

  events: {
    on(event: 'fs-changed' | 'thumb-ready' | 'reconcile-progress',
       handler: (payload: any) => void): () => void
  },

  shell: {
    revealInExplorer(absPath: string): Promise<void>    // shell.showItemInFolder
    openExternal(url: string): Promise<void>
  },

  app: {
    getLibraryPath(): Promise<string>
    setLibraryPath(absPath: string): Promise<{ ok: boolean; error?: string }>
    getVersion(): Promise<string>
    relaunch(): Promise<void>
  },
}
```

### 5.4 Custom protocol `folders://`

Registered in main via `protocol.registerFileProtocol('folders', …)`. Maps `folders://<file-id>` to the file's current `abs_path` from the DB.

- Renderer uses `<img src="folders://abc-123">` directly — no IPC, no base64. Chromium fetches the bytes through main's protocol handler at native speed.
- Replaces every current data-URL usage. This is **the** fix for the localStorage memory bloat.
- Only `folders://` URLs resolve; `file://` is blocked. Prevents path-traversal.
- Cache headers set so Chromium caches thumbnails in-memory between renders.

## 6. Storage layer

### 6.1 On-disk layout

```
<library>/                                # default ~/Folders, configurable
  Brand Project/                          # real folder, exact UI name
    moodboard.jpg                         # real file, original filename
    Drafts/
      v2.psd
  Vacation 2026/
    DSC_0142.jpg
  .folders-app/                           # hidden meta dir (dot + Win +H attribute)
    library.db                            # SQLite (better-sqlite3)
    library.db-wal                        # WAL journaling
    library.db-shm
    thumbs/                               # generated thumbs (regeneratable)
      <file-id>.webp
    trash/                                # soft-deleted
      <original-relpath>
    versions/                             # version history
      <file-id>/<timestamp>.<ext>
    ai-cache/                             # cached AI results (sub-project #3)
    settings.json                         # mirror of app_settings table for crash-recovery
```

### 6.2 SQLite schema (initial migration `001_init.sql`)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- Workspaces
CREATE TABLE workspaces (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  icon         TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO workspaces (id, name, icon) VALUES ('default', 'Personal', '🗂️');

-- Folder tree
CREATE TABLE folders (
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
  workflow_status   TEXT,                     -- 'todo' | 'in-progress' | 'review' | 'done'
  due_date          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT,                     -- soft delete (= trash)
  sort_order        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX folders_parent       ON folders(parent_id);
CREATE INDEX folders_workspace    ON folders(workspace_id);
CREATE INDEX folders_deleted      ON folders(deleted_at);

-- Files
CREATE TABLE files (
  id                TEXT PRIMARY KEY,
  folder_id         TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  abs_path          TEXT NOT NULL UNIQUE,
  type              TEXT NOT NULL,            -- 'image'|'video'|'document'|'other'
  mime              TEXT,
  size              INTEGER,
  width             INTEGER,
  height            INTEGER,
  duration_ms       INTEGER,
  content_hash      TEXT,                     -- sha256 (dedup, corruption check)
  uploaded_at       TEXT NOT NULL DEFAULT (datetime('now')),
  modified_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT,
  rotation          INTEGER NOT NULL DEFAULT 0,
  flip_h            INTEGER NOT NULL DEFAULT 0,
  flip_v            INTEGER NOT NULL DEFAULT 0,
  is_favorite       INTEGER NOT NULL DEFAULT 0,
  is_pinned         INTEGER NOT NULL DEFAULT 0,
  ocr_text          TEXT,                     -- populated by sub-project #3
  caption           TEXT,                     -- populated by sub-project #3
  ai_tag_status     TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'done'|'failed'|'skipped'
  description       TEXT,
  geo_lat           REAL,
  geo_lng           REAL
);
CREATE INDEX files_folder   ON files(folder_id);
CREATE INDEX files_hash     ON files(content_hash);
CREATE INDEX files_deleted  ON files(deleted_at);
CREATE INDEX files_type     ON files(type);

-- Full-text search (populated via triggers on files)
CREATE VIRTUAL TABLE files_fts USING fts5(
  name, ocr_text, caption, description,
  content='files', content_rowid='rowid'
);
CREATE TRIGGER files_ai AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, name, ocr_text, caption, description)
  VALUES (new.rowid, new.name, new.ocr_text, new.caption, new.description);
END;
CREATE TRIGGER files_ad AFTER DELETE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, ocr_text, caption, description)
  VALUES ('delete', old.rowid, old.name, old.ocr_text, old.caption, old.description);
END;
CREATE TRIGGER files_au AFTER UPDATE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, ocr_text, caption, description)
  VALUES ('delete', old.rowid, old.name, old.ocr_text, old.caption, old.description);
  INSERT INTO files_fts(rowid, name, ocr_text, caption, description)
  VALUES (new.rowid, new.name, new.ocr_text, new.caption, new.description);
END;

-- Tags (folder + file, manual + AI)
CREATE TABLE folder_tags (folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
                          tag TEXT NOT NULL, PRIMARY KEY(folder_id, tag));
CREATE TABLE file_tags   (file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
                          tag TEXT NOT NULL, PRIMARY KEY(file_id, tag));
CREATE TABLE file_ai_tags (file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
                           tag TEXT NOT NULL, confidence REAL NOT NULL,
                           PRIMARY KEY(file_id, tag));

-- Per-file annotations, comments, reactions
CREATE TABLE file_annotations (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, x REAL, y REAL, w REAL, h REAL, x2 REAL, y2 REAL,
  color TEXT, text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE file_comments (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES file_comments(id) ON DELETE CASCADE,
  author TEXT, text TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE file_reactions (file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
                             emoji TEXT NOT NULL, by TEXT NOT NULL,
                             PRIMARY KEY(file_id, emoji, by));

-- File version history
CREATE TABLE file_versions (
  id           TEXT PRIMARY KEY,
  file_id      TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  abs_path     TEXT NOT NULL,
  size         INTEGER,
  content_hash TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX file_versions_file ON file_versions(file_id);

-- Folder activity log
CREATE TABLE folder_activity (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  actor       TEXT,
  description TEXT,
  timestamp   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX folder_activity_folder ON folder_activity(folder_id);

-- Folder workflow extras
CREATE TABLE folder_checklist (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE folder_custom_fields (
  folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  key TEXT NOT NULL, value TEXT NOT NULL,
  PRIMARY KEY(folder_id, key)
);

-- Smart folders + saved searches
CREATE TABLE smart_folders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rules_json TEXT NOT NULL,    -- existing rule shape from lib/smart-folder-engine
  sort TEXT, view TEXT, density TEXT, group_kind TEXT,
  recents_only INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE saved_searches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, query TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single-row config table
CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT);

-- EXIF / palette stored as JSON blobs for now (consumed by sub-project #3+)
CREATE TABLE file_exif    (file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
                           data TEXT NOT NULL);
CREATE TABLE file_palette (file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
                           colors TEXT NOT NULL); -- JSON array
```

Notes on schema:
- All timestamps stored as ISO 8601 text (`datetime('now')`); the renderer parses with `date-fns`.
- `abs_path` is **canonical** ground truth. Reconciliation keeps it consistent with `<library>/` contents.
- `file_versions` rows reference files in `.folders-app/versions/<file-id>/`. Pruning to last N happens in `electron/fs-ops.ts`.
- Sub-project #4 will add `vec_files` virtual table via the `sqlite-vec` extension; that's a future migration, not initial.

### 6.3 Filesystem operations (`electron/fs-ops.ts`)

All ops are atomic at both the DB and FS layers and run inside a single `BEGIN IMMEDIATE` transaction:

| Op | FS action | DB action |
|---|---|---|
| Create folder | `fs.mkdirSync(path, { recursive: false })`. If collision, append `(n)`. | `INSERT INTO folders` with `abs_path`. |
| Rename folder | `fs.renameSync(oldPath, newPath)`. | `UPDATE folders SET name=?, abs_path=?, updated_at=now`. |
| Move folder | `fs.renameSync(oldPath, newPath)`. | `UPDATE folders SET parent_id=?, abs_path=?`. Recursively update descendants' `abs_path` (single SQL with CTE). |
| Trash folder | `fs.renameSync(path → .folders-app/trash/<rel>)`. | `UPDATE folders SET deleted_at=now`. |
| Restore folder | reverse | clear `deleted_at`. |
| Empty trash | `fs.rmSync(.folders-app/trash/*, { recursive, force })`. | `DELETE FROM folders WHERE deleted_at IS NOT NULL`. |
| Upload file | Write bytes to `tmp` path → `fs.renameSync(tmp, final)`. Compute SHA-256 streaming during write. Generate thumb via `sharp` for images. | `INSERT INTO files` with `content_hash` and dimensions. |
| Rename file | `fs.renameSync`. | `UPDATE files SET name=?, abs_path=?, modified_at=now`. |
| Move file | `fs.renameSync`. | `UPDATE files SET folder_id=?, abs_path=?`. |
| Delete file (soft) | `fs.renameSync(path → .folders-app/trash/<rel>)`. | `UPDATE files SET deleted_at=now`. |
| Overwrite file (future) | Copy current to `.folders-app/versions/<file-id>/<ts>.<ext>` → write new bytes atomically. Prune to last N. | `INSERT INTO file_versions`. |

**Filename collision policy:** when target name exists, append ` (2)`, ` (3)`, etc. until free. Same algorithm for files and folders. UI shows the resolved name.

**Atomic same-filesystem rename** is guaranteed because `<library>/` and `.folders-app/trash/` and `.folders-app/versions/` are all on the same filesystem (children of `<library>/`).

## 7. Filesystem watcher + reconciliation

### 7.1 Cold-start reconcile

Runs on every app launch, before first paint of the folder grid.

1. Walk `<library>/` recursively (excluding `.folders-app/`). Build map `{ relPath → fs.Stats }`.
2. Run a single SQL query for current `folders` and `files` (active only, not trashed).
3. Three-way diff:
   - **In FS, not in DB** → `INSERT` with default metadata. Mark file rows `ai_tag_status='pending'` (sub-project #3 will pick these up).
   - **In DB, not in FS** → soft-delete (`deleted_at = now`), surfaces in Trash with a "missing" badge.
   - **Same `content_hash`, different path** → `UPDATE abs_path` (rename detection).
4. Emit `reconcile-progress` events to renderer for libraries > 1000 entries.
5. Open the BrowserWindow only after step 4 completes.

### 7.2 Hot watcher

`chokidar.watch('<library>/', { ignoreInitial: true, ignored: '**/.folders-app/**' })`.

- Debounce per-path 300ms (collapses Finder/Explorer's multi-event renames).
- Events forwarded as `events.on('fs-changed', { kind, path })`.
- Renderer's `FolderContext` listens, refreshes the affected subtree.

### 7.3 Race protection

- App-initiated mutations register the target path in a `Set<string> mutedPaths` before the fs op. The chokidar handler ignores events whose path is muted. Path is unmuted after the DB transaction commits.
- All DB writes use `BEGIN IMMEDIATE` — better-sqlite3 is synchronous, so writes never interleave.
- `WAL` journaling allows reads concurrent with writes.

## 8. Renderer integration — migrating without breaking 50+ components

### 8.1 Principle

The public API of `FolderContext` (~250 methods) stays the same. The 50+ consumer components are not edited in this sub-project. Only `lib/folder-storage.ts` and the internals of `contexts/folder-context.tsx` change.

### 8.2 New module: `src/lib/library/`

Typed wrapper around `window.api.library.*` and `window.api.files.*`. Components do **not** call `window.api` directly — they go through `library.*`.

```ts
// src/lib/library/index.ts
export const library = {
  folders: {
    listAll: () => window.api.library.listAllFolders(),
    create: (input: CreateFolderInput) => window.api.library.createFolder(input),
    rename: (id: string, name: string) => window.api.library.renameFolder(id, name),
    // … 1:1 with FolderContext mutators
  },
  files: { /* … */ },
  search: { /* … */ },
  ai: { /* … */ },
  events: { /* … */ },
}
```

### 8.3 Diff to `lib/folder-storage.ts`

```ts
// BEFORE
export function loadFolders(): Project[] | null { /* localStorage.getItem */ }
export function saveFolders(folders: Project[]) { /* localStorage.setItem */ }
export function readFileAsDataURL(file: File): Promise<string> { /* FileReader */ }

// AFTER
export async function loadFolders(): Promise<Project[]> {
  return await library.folders.listAll()
}
// saveFolders is removed — saves are per-mutation now via library.* calls
export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  // Replaces readFileAsDataURL. Returns raw bytes for IPC upload.
  return new Uint8Array(await file.arrayBuffer())
}
```

### 8.4 Diff to `contexts/folder-context.tsx`

- The initial `useEffect` that hydrates from localStorage now hydrates from `library.folders.listAll()`. Already wrapped in an effect, so async is fine.
- Each mutator method:
  1. Optimistically updates local React state.
  2. Calls `library.*` mutator.
  3. On success: reconcile with returned canonical row.
  4. On failure: rollback local state, show error toast.
- A new `useEffect` subscribes to `events.on('fs-changed', …)` and reloads the affected subtree.

Mutator wrapper helper:

```ts
async function mutate<T>(optimistic: () => void, op: () => Promise<T>, rollback: () => void): Promise<T | null> {
  optimistic()
  try { return await op() }
  catch (err) {
    rollback()
    toast.error(formatIpcError(err))
    return null
  }
}
```

### 8.5 Rendering files: `<img src=…>` change

- Old: `<img src={file.url}>` where `file.url` was a base64 data URL.
- New: `file.url` becomes `folders://<file-id>`. Same JSX, identical to consumers.
- Thumbnail variant: `folders://<file-id>?thumb=1` resolves to `.folders-app/thumbs/<file-id>.webp` if present, falls back to original.

### 8.6 Components needing tiny adjustments

- `lib/zip-export.ts` → already URL-based. Now `fetch('folders://…').then(r => r.blob())` works without changes (the protocol is fetchable).
- `components/file-upload-zone.tsx` and any paste handlers → call `library.files.upload(folderId, [{ name, bytes, mime }])` instead of pushing data URLs.
- `lib/ai-mocks.ts` → unchanged in this sub-project (replaced in #3).

## 9. v0.app removal (must-do in this sub-project)

- `README.md`: delete v0 sync section, replace with build/install instructions.
- `CLAUDE.md`: delete the "v0.app sync" section.
- `app/layout.tsx` (during Vite migration): drop `generator: "v0.app"` metadata.
- Remove dependency `@vercel/analytics` and the `<Analytics />` mount.
- Rename `package.json` → `name: "folders"`, remove the v0 build hooks.
- Delete any v0 CI integration files if present.

The v0 project itself should be **disconnected from the user's v0.app account** — that's a manual user step, not something we automate. Spec notes this; implementation README will surface the instruction.

## 10. Error handling

### 10.1 IPC error envelope

```ts
type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }
type IpcError = {
  code:
    | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED'
    | 'DB_ERROR' | 'FS_ERROR' | 'INTEGRITY_ERROR'
    | 'INVALID_INPUT' | 'LIBRARY_MISSING' | 'UNKNOWN'
  message: string
  details?: Record<string, unknown>
}
```

Preload unwraps: `ok:true` → returns data; `ok:false` → throws `LibraryError` with code preserved. Renderer catches and shows a toast keyed off `code`.

### 10.2 Recovery cases

- **Library directory missing/inaccessible at startup** → show recovery screen offering: relocate, restore from `.folders-app/trash`, or start fresh.
- **DB corruption (`PRAGMA integrity_check` fails)** → backup the corrupt DB to `.folders-app/library.db.corrupt-<ts>` and rebuild from filesystem (cold-start reconcile populates everything except non-fs data — annotations, comments, etc., which are warned as lost).
- **Quota / disk-full on upload** → fail the upload with `FS_ERROR`, do not commit DB row, surface toast. **Never silently swallow** (the existing `lib/folder-storage.ts` does — that's a bug being fixed here).
- **Concurrent app instance** → `app.requestSingleInstanceLock()` ensures only one main process. Second launch focuses the existing window.

## 11. Testing

| Layer | Tooling | Coverage |
|---|---|---|
| Unit | `vitest` | `lib/library/*`, `lib/smart-folder-engine`, `lib/rename-pattern`, IPC argument validation. ~50 tests. |
| Integration (Node) | `vitest` + `tmp` dirs | `electron/fs-ops`, `electron/db/*`, cold-start reconciliation, hot-watcher race protection, version-history pruning, atomic rename guarantees. |
| E2E | Playwright + `playwright-electron` | One smoke flow: launch app → choose library location → create folder → drop image → restart → assert persistence + thumbnail. |
| Manual | `docs/smoke-test.md` checklist | Per-release: create / rename / move / delete / restore / empty trash / reveal in OS / library relocate / DB rebuild from FS / kill-during-upload. |

CI: GitHub Actions matrix (Win / Mac), runs `vitest` + `playwright-electron` on every PR. Builds release artifacts on tag push.

## 12. Build & packaging

### 12.1 Vite config

- `vite.config.ts` with React plugin + `vite-tsconfig-paths` (preserves `@/*` aliases).
- Static asset base = `./` (relative; required for Electron's `file://` loading in production).
- Dev server only — Electron loads `http://localhost:5173` in dev, the built `dist-renderer/index.html` in prod.

### 12.2 Electron main bundling

- `esbuild` bundles `electron/main.ts` + `electron/preload.ts` to `dist-electron/`. Native deps (`better-sqlite3`, `chokidar`) marked external; `electron-builder` handles their prebuilds.
- TypeScript via `tsconfig.electron.json` with `target: ES2022`, `module: CommonJS`, Node 20 lib.

### 12.3 `electron-builder.yml`

- `appId: io.folders.app`
- `productName: Folders`
- `win`: NSIS installer, x64 + arm64.
- `mac`: DMG, x64 + arm64. Notarization disabled in v1.
- `publish`: GitHub provider (private repo OK; reads token from CI env).
- `files`: ships `dist-electron/`, `dist-renderer/`, `node_modules/better-sqlite3/build/**`, etc.
- `extraResources`: `electron/db/schema.sql`, `electron/db/migrations/*.sql`.

### 12.4 Auto-update

- `electron-updater` with `provider: github` reads from Releases.
- Update check on app launch + every 4 hours while running.
- User notified via in-app toast when update is downloaded; restart on next quit or by button.

### 12.5 Scripts (`package.json`)

Package manager is **bun** (per `CLAUDE.md`). Run as `bun run <script>`.

```json
{
  "scripts": {
    "dev": "concurrently -k \"bun run dev:renderer\" \"bun run dev:electron\"",
    "dev:renderer": "vite",
    "dev:electron": "wait-on tcp:5173 && bun run build:electron && cross-env NODE_ENV=development electron dist-electron/main.js",
    "build": "bun run build:renderer && bun run build:electron && electron-builder",
    "build:renderer": "vite build",
    "build:electron": "esbuild electron/main.ts electron/preload.ts --bundle --platform=node --target=node20 --external:electron --external:better-sqlite3 --external:chokidar --outdir=dist-electron",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit && tsc -p tsconfig.electron.json --noEmit"
  }
}
```

Note: `bun install` is used for deps. `bunx <tool>` runs one-off binaries (e.g. `bunx tsc --noEmit`).

## 13. Acceptance criteria for this sub-project

- [ ] App launches as a real `.exe` (Win) and `.app` (Mac) bundle.
- [ ] First-run prompts for library location; defaults to `~/Folders/`.
- [ ] All existing UI (50+ components) renders and functions identically to the old localStorage version, except files now load via `folders://` instead of base64.
- [ ] Files written to disk match what's shown in the UI (creating "Brand Project" creates `~/Folders/Brand Project/`).
- [ ] Renaming a folder in the UI renames the on-disk folder.
- [ ] Reveal-in-OS works on every folder + file.
- [ ] App handles user moving/renaming/deleting files in Explorer/Finder while running.
- [ ] DB and filesystem stay consistent across restarts (cold-start reconcile passes).
- [ ] All v0.app references removed.
- [ ] `bunx tsc --noEmit` and `bun run lint` both clean.
- [ ] `vitest` passes.
- [ ] One Playwright-Electron smoke test passes.
- [ ] Production builds for Win + Mac via `bun run build`.
- [ ] No data URLs in `localStorage` or in any `<img>` `src` attribute.

## 14. Migration notes for existing localStorage data

The current app is unreleased — there are no end users to migrate. The only entity holding localStorage data is the developer dogfooding via `next dev`.

That data lives at the browser origin where it was created (e.g. `http://localhost:3000`). It is **not** automatically reachable from the Vite dev origin (`http://localhost:5173`) or from the production Electron renderer (`file://`) — different origins, separate localStorage stores.

The honest options:

1. **Fresh start (recommended).** Accept the loss. The data is a few test folders.
2. **Manual export before migration.** Add a one-shot "Export to JSON" button to the current Next.js build *before* removing it; the user runs it once at `localhost:3000`, downloads a JSON, then on first Electron launch chooses "Import from JSON". Requires ~30 lines of code in two places.

Default to option 1 for v1. If the developer asks for option 2, add ~30 LOC of import path. After v1 ships, neither path is relevant for end users (clean install = empty library).

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Native module compatibility (`better-sqlite3` + Electron version) | Pin Electron to LTS-supported version. Use `electron-rebuild` in postinstall. |
| Chokidar reliability on Windows network drives | Document "library on local disk only" for v1. Detect network paths, warn user. |
| Cold-start reconcile slow on huge libraries | Show progress dialog. Defer thumb generation until idle. Cap initial reconcile depth, lazy-load deep subtrees. |
| User edits files in OS while app is in middle of mutation | `mutedPaths` set + transaction isolation. Worst case: hot-watcher event ignored, next reconcile catches it. |
| `folders://` protocol leaks file paths | Resolver only accepts known UUIDs from `files.id`. Reject anything else. |
| Disk-full mid-upload | Atomic tmp → final rename pattern. Tmp deleted on failure. DB row not inserted. |
| User picks library location on a removable drive that disappears | LIBRARY_MISSING error → recovery screen on next launch. |

## 16. Future work (deferred)

- Sub-project #2: split `folder-context.tsx`, add `@tanstack/virtual`, undo/redo with toast, surface version history UI.
- Sub-project #3: BYOK AI (auto-tag, OCR, caption, cover-suggest, auto-organize). Replace `lib/ai-mocks.ts`. Keys via `safeStorage`. Worker process for batch jobs.
- Sub-project #4: `sqlite-vec` extension, Cmd+K syntax parser (`tag:travel size:>5MB before:2026-01-01`), Saved Searches sidebar.
- Sub-project #5: workspaces actually scoping the folder tree, light/auto themes, per-folder color tags, onboarding tour.
- Code signing (Trusted Signing on Win, Apple Developer Program on Mac).
- Mac App Store / Microsoft Store distribution.
- Linux build (AppImage / Flathub).

## 17. Open questions (answered before writing-plans phase)

None remaining. All material decisions above have explicit answers.
