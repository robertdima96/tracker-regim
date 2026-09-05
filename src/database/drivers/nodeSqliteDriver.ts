import Database from 'better-sqlite3'
import type { SqlDriver, SqlRow } from '../driver'

/**
 * Test-only driver backed by better-sqlite3, a real (not mocked) SQLite
 * engine that runs synchronously in plain Node — no browser/device needed.
 * Production uses capacitorSqliteDriver.ts via @capacitor-community/sqlite
 * instead; both implement the same SqlDriver interface, so repository code
 * and its tests exercise identical SQL against a real database either way.
 */
export function createNodeSqliteDriver(filename: string = ':memory:'): SqlDriver {
  const db = new Database(filename)
  db.pragma('foreign_keys = ON')

  return {
    async execute(sql: string, params: unknown[] = []): Promise<void> {
      db.prepare(sql).run(...params)
    },
    async query<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[]
    },
  }
}
