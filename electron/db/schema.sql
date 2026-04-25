-- PRAGMAs are set in openLibraryDb() before migrations run — keep them
-- out of this baseline so runMigrations can wrap the whole file in a
-- transaction (PRAGMA journal_mode / synchronous can't be changed
-- inside a transaction).

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
