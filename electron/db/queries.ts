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
  private readonly db: Database.Database

  readonly insertFolder
  readonly getFolderById
  readonly listFoldersByParent
  readonly listFoldersByParentRoot
  readonly listAllActiveFolders
  readonly updateFolderName
  readonly updateFolderPath
  readonly updateFolderParentAndPath
  readonly softDeleteFolder
  readonly restoreFolderRow
  readonly hardDeleteFolder
  readonly listDeletedFolders

  readonly insertFile
  readonly getFileById
  readonly listFilesByFolder
  readonly updateFileName
  readonly updateFilePath
  readonly updateFileFolderAndPath
  readonly softDeleteFile
  readonly restoreFileRow
  readonly hardDeleteFile
  readonly listDeletedFiles
  readonly findFileByHash

  readonly insertFolderTag
  readonly removeFolderTag
  readonly listFolderTags
  readonly insertFileTag
  readonly removeFileTag
  readonly listFileTags

  readonly getSetting
  readonly upsertSetting

  constructor(db: Database.Database) {
    this.db = db

    this.insertFolder = db.prepare(`
      INSERT INTO folders (id, workspace_id, parent_id, name, abs_path, sort_order)
      VALUES (@id, @workspace_id, @parent_id, @name, @abs_path, @sort_order)
    `)
    this.getFolderById = db.prepare<[string]>(`SELECT * FROM folders WHERE id = ?`)
    this.listFoldersByParent = db.prepare<[string, string]>(`
      SELECT * FROM folders
      WHERE workspace_id = ? AND parent_id = ? AND deleted_at IS NULL
      ORDER BY sort_order, created_at
    `)
    this.listFoldersByParentRoot = db.prepare<[string]>(`
      SELECT * FROM folders
      WHERE workspace_id = ? AND parent_id IS NULL AND deleted_at IS NULL
      ORDER BY sort_order, created_at
    `)
    this.listAllActiveFolders = db.prepare<[string]>(`
      SELECT * FROM folders
      WHERE workspace_id = ? AND deleted_at IS NULL
      ORDER BY created_at
    `)
    this.updateFolderName = db.prepare<[string, string, string]>(`
      UPDATE folders SET name = ?, abs_path = ?, updated_at = datetime('now') WHERE id = ?
    `)
    this.updateFolderPath = db.prepare<[string, string]>(`
      UPDATE folders SET abs_path = ?, updated_at = datetime('now') WHERE id = ?
    `)
    this.updateFolderParentAndPath = db.prepare<[string | null, string, string]>(`
      UPDATE folders SET parent_id = ?, abs_path = ?, updated_at = datetime('now') WHERE id = ?
    `)
    this.softDeleteFolder = db.prepare<[string]>(`
      UPDATE folders SET deleted_at = datetime('now') WHERE id = ?
    `)
    this.restoreFolderRow = db.prepare<[string]>(
      `UPDATE folders SET deleted_at = NULL WHERE id = ?`,
    )
    this.hardDeleteFolder = db.prepare<[string]>(`DELETE FROM folders WHERE id = ?`)
    this.listDeletedFolders = db.prepare(`
      SELECT * FROM folders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC
    `)

    this.insertFile = db.prepare(`
      INSERT INTO files (
        id, folder_id, name, abs_path, type, mime, size,
        width, height, duration_ms, content_hash
      ) VALUES (
        @id, @folder_id, @name, @abs_path, @type, @mime, @size,
        @width, @height, @duration_ms, @content_hash
      )
    `)
    this.getFileById = db.prepare<[string]>(`SELECT * FROM files WHERE id = ?`)
    this.listFilesByFolder = db.prepare<[string]>(`
      SELECT * FROM files WHERE folder_id = ? AND deleted_at IS NULL ORDER BY uploaded_at
    `)
    this.updateFileName = db.prepare<[string, string, string]>(`
      UPDATE files SET name = ?, abs_path = ?, modified_at = datetime('now') WHERE id = ?
    `)
    this.updateFilePath = db.prepare<[string, string]>(`
      UPDATE files SET abs_path = ?, modified_at = datetime('now') WHERE id = ?
    `)
    this.updateFileFolderAndPath = db.prepare<[string, string, string]>(`
      UPDATE files SET folder_id = ?, abs_path = ?, modified_at = datetime('now') WHERE id = ?
    `)
    this.softDeleteFile = db.prepare<[string]>(
      `UPDATE files SET deleted_at = datetime('now') WHERE id = ?`,
    )
    this.restoreFileRow = db.prepare<[string]>(
      `UPDATE files SET deleted_at = NULL WHERE id = ?`,
    )
    this.hardDeleteFile = db.prepare<[string]>(`DELETE FROM files WHERE id = ?`)
    this.listDeletedFiles = db.prepare(`
      SELECT * FROM files WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC
    `)
    this.findFileByHash = db.prepare<[string]>(`
      SELECT * FROM files WHERE content_hash = ? AND deleted_at IS NULL LIMIT 1
    `)

    this.insertFolderTag = db.prepare<[string, string]>(
      `INSERT OR IGNORE INTO folder_tags (folder_id, tag) VALUES (?, ?)`,
    )
    this.removeFolderTag = db.prepare<[string, string]>(
      `DELETE FROM folder_tags WHERE folder_id = ? AND tag = ?`,
    )
    this.listFolderTags = db.prepare<[string]>(
      `SELECT tag FROM folder_tags WHERE folder_id = ?`,
    )
    this.insertFileTag = db.prepare<[string, string]>(
      `INSERT OR IGNORE INTO file_tags (file_id, tag) VALUES (?, ?)`,
    )
    this.removeFileTag = db.prepare<[string, string]>(
      `DELETE FROM file_tags WHERE file_id = ? AND tag = ?`,
    )
    this.listFileTags = db.prepare<[string]>(`SELECT tag FROM file_tags WHERE file_id = ?`)

    this.getSetting = db.prepare<[string]>(`SELECT value FROM app_settings WHERE key = ?`)
    this.upsertSetting = db.prepare<[string, string]>(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
  }

  getFolderByPath(absPath: string): FolderRow | null {
    const stmt = this.db.prepare<[string]>(
      `SELECT * FROM folders WHERE abs_path = ? AND deleted_at IS NULL`,
    )
    return (stmt.get(absPath) as FolderRow | undefined) ?? null
  }
}
