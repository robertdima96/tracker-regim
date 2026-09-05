import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import type { SqlDriver, SqlRow } from '../driver'

const DB_NAME = 'doseflow'

let sharedConnection: SQLiteConnection | undefined
let sharedDb: SQLiteDBConnection | undefined

/**
 * The single app-wide SQLiteConnection instance. main.ts's web bootstrap
 * (initWebStore) must use this same instance, not a separate one — the
 * plugin's web store setup is tied to the connection object, not just the
 * underlying native bridge.
 */
export function getSqliteConnection(): SQLiteConnection {
  if (!sharedConnection) sharedConnection = new SQLiteConnection(CapacitorSQLite)
  return sharedConnection
}

async function getDb(): Promise<SQLiteDBConnection> {
  if (sharedDb) return sharedDb
  const connection = getSqliteConnection()

  const consistent = (await connection.checkConnectionsConsistency()).result
  const alreadyOpen = (await connection.isConnection(DB_NAME, false)).result
  sharedDb =
    consistent && alreadyOpen
      ? await connection.retrieveConnection(DB_NAME, false)
      : await connection.createConnection(DB_NAME, false, 'no-encryption', 1, false)
  await sharedDb.open()
  return sharedDb
}

/**
 * Production driver backed by the real Capacitor SQLite plugin — native on
 * iOS/Android, jeep-sqlite (sql.js + IndexedDB) on web. main.ts must run
 * the web bootstrap (registering jeep-sqlite and calling initWebStore)
 * before this driver's first use when running on the web platform.
 */
export function createCapacitorSqliteDriver(): SqlDriver {
  return {
    async execute(sql: string, params: unknown[] = []): Promise<void> {
      const db = await getDb()
      await db.run(sql, params)
      // Web-only durability: the plugin keeps web data in an in-memory
      // sql.js instance until explicitly flushed to IndexedDB. Calling
      // this on every write costs little for a personal daily-use app's
      // write volume and avoids losing data if the tab closes uncleanly.
      // No-op cost on native, where SQLite already writes through.
      await getSqliteConnection().saveToStore(DB_NAME)
    },
    async query<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []): Promise<T[]> {
      const db = await getDb()
      const result = await db.query(sql, params)
      return (result.values ?? []) as T[]
    },
  }
}
