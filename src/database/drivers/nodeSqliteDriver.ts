import { DatabaseSync } from 'node:sqlite'
import type { SqlDriver, SqlRow } from '../driver'

/**
 * Test-only driver backed by Node's built-in node:sqlite (stable API,
 * marked experimental — Node 22.5+), a real (not mocked) SQLite engine
 * that runs synchronously in plain Node with no native compilation step.
 * Deliberately not better-sqlite3: it requires compiling a native addon
 * per-platform, which fails outright on a machine without a full C++
 * toolchain (hit exactly this on Windows without the VS Build Tools
 * Windows SDK component) — node:sqlite ships inside Node itself, so
 * there's nothing to compile.
 *
 * Production uses capacitorSqliteDriver.ts via @capacitor-community/sqlite
 * instead; both implement the same SqlDriver interface, so repository code
 * and its tests exercise identical SQL against a real database either way.
 */
export function createNodeSqliteDriver(filename: string = ':memory:'): SqlDriver {
  const db = new DatabaseSync(filename)
  db.exec('PRAGMA foreign_keys = ON')

  return {
    async execute(sql: string, params: unknown[] = []): Promise<void> {
      db.prepare(sql).run(...(params as never[]))
    },
    async query<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []): Promise<T[]> {
      return db.prepare(sql).all(...(params as never[])) as T[]
    },
  }
}
