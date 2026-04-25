import type Database from "better-sqlite3"
import * as fs from "node:fs"
import * as path from "node:path"
import { v4 as uuid } from "uuid"
import { Queries, type FolderRow } from "../db/queries"
import {
  atomicCreateDir,
  atomicMoveToTrash,
  atomicRename,
  trashRoot,
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
    const rows =
      parentId === null
        ? (this.q.listFoldersByParentRoot.all(DEFAULT_WORKSPACE) as FolderRow[])
        : (this.q.listFoldersByParent.all(DEFAULT_WORKSPACE, parentId) as FolderRow[])
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
    const id = input.id ?? uuid()
    this.q.insertFolder.run({
      id,
      workspace_id: input.workspaceId ?? DEFAULT_WORKSPACE,
      parent_id: input.parentId ?? null,
      name: path.basename(finalPath),
      abs_path: finalPath,
      sort_order: 0,
    })
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
    const trashed = path.join(
      trashRoot(this.root),
      path.relative(this.root, row.abs_path),
    )
    if (fs.existsSync(trashed)) {
      fs.mkdirSync(path.dirname(row.abs_path), { recursive: true })
      const finalPath = atomicRename(trashed, row.abs_path)
      this.q.updateFolderPath.run(finalPath, id)
    }
    this.q.restoreFolderRow.run(id)
  }

  async permanentlyDeleteFolder(id: string): Promise<void> {
    const row = this.q.getFolderById.get(id) as FolderRow | undefined
    if (!row) return
    const trashed = path.join(
      trashRoot(this.root),
      path.relative(this.root, row.abs_path),
    )
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
    if (newParentId && !newParentRow) {
      throw notFound(`parent ${newParentId} not found`)
    }
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
   * Runs inside an outer transaction.
   */
  private cascadePathUpdate(oldPrefix: string, newPrefix: string): void {
    const oldWithSep = `${oldPrefix}${path.sep}%`
    const folderStmt = this.db.prepare<[string, number, string]>(
      `UPDATE folders
       SET abs_path = ? || substr(abs_path, ? + 1),
           updated_at = datetime('now')
       WHERE abs_path LIKE ?`,
    )
    folderStmt.run(newPrefix, oldPrefix.length, oldWithSep)

    const fileStmt = this.db.prepare<[string, number, string]>(
      `UPDATE files
       SET abs_path = ? || substr(abs_path, ? + 1),
           modified_at = datetime('now')
       WHERE abs_path LIKE ?`,
    )
    fileStmt.run(newPrefix, oldPrefix.length, oldWithSep)
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
  if (/[<>:"/\\|?*]/.test(trimmed)) {
    throw invalid(`invalid folder name: ${name}`)
  }
  return trimmed
}

function notFound(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "NOT_FOUND" })
}

function invalid(msg: string): Error & { code: string } {
  return Object.assign(new Error(msg), { code: "INVALID_INPUT" })
}
