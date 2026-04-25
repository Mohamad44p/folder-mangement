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

export interface CommentRow {
  id: string
  file_id: string
  parent_id: string | null
  author: string | null
  text: string | null
  resolved: number
  timestamp: string
}

export interface AnnotationRow {
  id: string
  file_id: string
  kind: string
  x: number | null
  y: number | null
  w: number | null
  h: number | null
  x2: number | null
  y2: number | null
  color: string | null
  text: string | null
  created_at: string
}

export interface ReactionRow {
  file_id: string
  emoji: string
  by: string
}

export interface ActivityRow {
  id: string
  folder_id: string
  kind: string
  actor: string | null
  description: string | null
  timestamp: string
}

export interface SavedSearchRow {
  id: string
  name: string
  query: string
  created_at: string
}

export interface ChecklistRow {
  id: string
  folder_id: string
  text: string
  done: number
  created_at: string
}

export interface VersionRow {
  id: string
  file_id: string
  abs_path: string
  size: number | null
  content_hash: string | null
  created_at: string
}

export interface SmartFolderRow {
  id: string
  workspace_id: string
  name: string
  rules_json: string
  sort: string | null
  view: string | null
  density: string | null
  group_kind: string | null
  recents_only: number
  created_at: string
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

  readonly updateFileGeo
  readonly updateFileDimensions
  readonly upsertFileExif
  readonly getFileExif

  readonly getFilePalette
  readonly upsertFilePalette

  readonly insertComment
  readonly listCommentsByFile
  readonly updateCommentText
  readonly setCommentResolved
  readonly deleteComment

  readonly insertAnnotation
  readonly listAnnotationsByFile
  readonly deleteAnnotation

  readonly listReactionsByFile
  readonly findReaction
  readonly insertReaction
  readonly deleteReaction

  readonly insertActivity
  readonly listActivityByFolder

  readonly listSavedSearches
  readonly insertSavedSearch
  readonly deleteSavedSearch

  readonly listFolderFields
  readonly upsertFolderField
  readonly deleteFolderField

  readonly listChecklist
  readonly insertChecklistItem
  readonly toggleChecklistItem
  readonly renameChecklistItem
  readonly deleteChecklistItem
  readonly getChecklistItem

  readonly insertVersion
  readonly listVersionsByFile

  readonly listSmartFolders
  readonly insertSmartFolder
  readonly updateSmartFolder
  readonly deleteSmartFolder

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

    this.updateFileGeo = db.prepare<[number | null, number | null, string]>(
      `UPDATE files SET geo_lat = ?, geo_lng = ?, modified_at = datetime('now') WHERE id = ?`,
    )
    this.updateFileDimensions = db.prepare<[number | null, number | null, string]>(
      `UPDATE files SET width = ?, height = ?, modified_at = datetime('now') WHERE id = ?`,
    )
    this.upsertFileExif = db.prepare<[string, string]>(`
      INSERT INTO file_exif (file_id, data) VALUES (?, ?)
      ON CONFLICT(file_id) DO UPDATE SET data = excluded.data
    `)
    this.getFileExif = db.prepare<[string]>(
      `SELECT data FROM file_exif WHERE file_id = ?`,
    )

    this.getFilePalette = db.prepare<[string]>(
      `SELECT colors FROM file_palette WHERE file_id = ?`,
    )
    this.upsertFilePalette = db.prepare<[string, string]>(`
      INSERT INTO file_palette (file_id, colors) VALUES (?, ?)
      ON CONFLICT(file_id) DO UPDATE SET colors = excluded.colors
    `)

    this.insertComment = db.prepare(`
      INSERT INTO file_comments (id, file_id, parent_id, author, text, resolved)
      VALUES (@id, @file_id, @parent_id, @author, @text, @resolved)
    `)
    this.listCommentsByFile = db.prepare<[string]>(
      `SELECT * FROM file_comments WHERE file_id = ? ORDER BY timestamp ASC`,
    )
    this.updateCommentText = db.prepare<[string, string]>(
      `UPDATE file_comments SET text = ? WHERE id = ?`,
    )
    this.setCommentResolved = db.prepare<[number, string]>(
      `UPDATE file_comments SET resolved = ? WHERE id = ?`,
    )
    this.deleteComment = db.prepare<[string]>(
      `DELETE FROM file_comments WHERE id = ?`,
    )

    this.insertAnnotation = db.prepare(`
      INSERT INTO file_annotations (id, file_id, kind, x, y, w, h, x2, y2, color, text)
      VALUES (@id, @file_id, @kind, @x, @y, @w, @h, @x2, @y2, @color, @text)
    `)
    this.listAnnotationsByFile = db.prepare<[string]>(
      `SELECT * FROM file_annotations WHERE file_id = ? ORDER BY created_at ASC`,
    )
    this.deleteAnnotation = db.prepare<[string]>(
      `DELETE FROM file_annotations WHERE id = ?`,
    )

    this.listReactionsByFile = db.prepare<[string]>(
      `SELECT file_id, emoji, by FROM file_reactions WHERE file_id = ?`,
    )
    this.findReaction = db.prepare<[string, string, string]>(
      `SELECT 1 FROM file_reactions WHERE file_id = ? AND emoji = ? AND by = ?`,
    )
    this.insertReaction = db.prepare<[string, string, string]>(
      `INSERT OR IGNORE INTO file_reactions (file_id, emoji, by) VALUES (?, ?, ?)`,
    )
    this.deleteReaction = db.prepare<[string, string, string]>(
      `DELETE FROM file_reactions WHERE file_id = ? AND emoji = ? AND by = ?`,
    )

    this.insertActivity = db.prepare(`
      INSERT INTO folder_activity (id, folder_id, kind, actor, description)
      VALUES (@id, @folder_id, @kind, @actor, @description)
    `)
    this.listActivityByFolder = db.prepare<[string, number]>(
      `SELECT * FROM folder_activity WHERE folder_id = ? ORDER BY timestamp DESC LIMIT ?`,
    )

    this.listSavedSearches = db.prepare(
      `SELECT * FROM saved_searches ORDER BY created_at DESC`,
    )
    this.insertSavedSearch = db.prepare<[string, string, string]>(
      `INSERT INTO saved_searches (id, name, query) VALUES (?, ?, ?)`,
    )
    this.deleteSavedSearch = db.prepare<[string]>(
      `DELETE FROM saved_searches WHERE id = ?`,
    )

    this.listFolderFields = db.prepare<[string]>(
      `SELECT key, value FROM folder_custom_fields WHERE folder_id = ? ORDER BY key`,
    )
    this.upsertFolderField = db.prepare<[string, string, string]>(`
      INSERT INTO folder_custom_fields (folder_id, key, value) VALUES (?, ?, ?)
      ON CONFLICT(folder_id, key) DO UPDATE SET value = excluded.value
    `)
    this.deleteFolderField = db.prepare<[string, string]>(
      `DELETE FROM folder_custom_fields WHERE folder_id = ? AND key = ?`,
    )

    this.listChecklist = db.prepare<[string]>(
      `SELECT * FROM folder_checklist WHERE folder_id = ? ORDER BY created_at ASC`,
    )
    this.insertChecklistItem = db.prepare<[string, string, string]>(
      `INSERT INTO folder_checklist (id, folder_id, text) VALUES (?, ?, ?)`,
    )
    this.toggleChecklistItem = db.prepare<[string]>(
      `UPDATE folder_checklist SET done = CASE done WHEN 0 THEN 1 ELSE 0 END WHERE id = ?`,
    )
    this.renameChecklistItem = db.prepare<[string, string]>(
      `UPDATE folder_checklist SET text = ? WHERE id = ?`,
    )
    this.deleteChecklistItem = db.prepare<[string]>(
      `DELETE FROM folder_checklist WHERE id = ?`,
    )
    this.getChecklistItem = db.prepare<[string]>(
      `SELECT * FROM folder_checklist WHERE id = ?`,
    )

    this.insertVersion = db.prepare(`
      INSERT INTO file_versions (id, file_id, abs_path, size, content_hash)
      VALUES (@id, @file_id, @abs_path, @size, @content_hash)
    `)
    this.listVersionsByFile = db.prepare<[string]>(
      `SELECT * FROM file_versions WHERE file_id = ? ORDER BY created_at DESC`,
    )

    this.listSmartFolders = db.prepare<[string]>(
      `SELECT * FROM smart_folders WHERE workspace_id = ? ORDER BY created_at ASC`,
    )
    this.insertSmartFolder = db.prepare(`
      INSERT INTO smart_folders (
        id, workspace_id, name, rules_json, sort, view, density, group_kind, recents_only
      ) VALUES (
        @id, @workspace_id, @name, @rules_json, @sort, @view, @density, @group_kind, @recents_only
      )
    `)
    this.updateSmartFolder = db.prepare(`
      UPDATE smart_folders
        SET name = @name,
            rules_json = @rules_json,
            sort = @sort,
            view = @view,
            density = @density,
            group_kind = @group_kind,
            recents_only = @recents_only
        WHERE id = @id
    `)
    this.deleteSmartFolder = db.prepare<[string]>(
      `DELETE FROM smart_folders WHERE id = ?`,
    )

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
