import Database from "better-sqlite3"
import * as fs from "node:fs"
import * as path from "node:path"
import { runMigrations } from "./migrations"

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

const META_DIR = ".folders-app"

export function openLibraryDb(libraryRoot: string): OpenedDb {
  const metaDir = path.join(libraryRoot, META_DIR)
  fs.mkdirSync(metaDir, { recursive: true })

  const dbPath = path.join(metaDir, "library.db")
  const db = new Database(dbPath)

  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  db.pragma("synchronous = NORMAL")
  db.pragma("busy_timeout = 5000")
  db.pragma("temp_store = MEMORY")
  db.pragma("cache_size = -16384")

  const baselineSql = fs.readFileSync(resolveSchemaPath(), "utf8")
  runMigrations(db, baselineSql)
  verifyIntegrity(db)

  return { db, path: dbPath }
}

function resolveSchemaPath(): string {
  const candidates = [
    path.join(__dirname, "schema.sql"),
    path.join(__dirname, "..", "..", "electron", "db", "schema.sql"),
    path.join(process.cwd(), "electron", "db", "schema.sql"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  throw new Error("schema.sql not found in any candidate path")
}

function verifyIntegrity(db: Database.Database): void {
  const row = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string }
  if (row.integrity_check !== "ok") {
    throw new IntegrityError(`SQLite integrity check failed: ${row.integrity_check}`)
  }
}
