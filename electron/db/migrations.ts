import type Database from "better-sqlite3"

/**
 * Versioned schema migrations.
 *
 * Each entry in FUTURE_MIGRATIONS describes one transition, applied
 * exactly once and in order. Version 1 is the baseline schema in
 * schema.sql (applied via runMigrations on a fresh DB or stamped onto
 * any pre-versioning DB on first upgrade).
 *
 * To add a new schema change:
 *   1. Append a Migration entry with version = previous + 1.
 *   2. Put the SQL in `up`. Do NOT modify schema.sql for an existing
 *      column — schema.sql describes a fresh-install baseline only.
 *   3. The runner wraps each migration in a transaction; throwing
 *      rolls it back and leaves the version unchanged.
 */
interface Migration {
  version: number
  description: string
  up: (db: Database.Database) => void
}

const FUTURE_MIGRATIONS: Migration[] = [
  // No post-baseline migrations yet. Add new entries with version >= 2.
]

export function runMigrations(
  db: Database.Database,
  baselineSchemaSql: string,
): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const row = db
    .prepare("SELECT MAX(version) as v FROM _schema_version")
    .get() as { v: number | null } | undefined
  const current = row?.v ?? 0

  if (current < 1) {
    // Fresh DB or pre-versioning DB. Apply baseline (idempotent: schema.sql
    // is CREATE IF NOT EXISTS throughout, so existing tables stay intact)
    // and stamp version 1.
    const tx = db.transaction(() => {
      db.exec(baselineSchemaSql)
      db.prepare("INSERT INTO _schema_version (version) VALUES (1)").run()
    })
    tx()
  }

  for (const migration of FUTURE_MIGRATIONS) {
    if (migration.version <= Math.max(current, 1)) continue
    const tx = db.transaction(() => {
      migration.up(db)
      db.prepare("INSERT INTO _schema_version (version) VALUES (?)").run(
        migration.version,
      )
    })
    tx()
  }
}

export function currentSchemaVersion(db: Database.Database): number {
  const row = db
    .prepare("SELECT MAX(version) as v FROM _schema_version")
    .get() as { v: number | null } | undefined
  return row?.v ?? 0
}
