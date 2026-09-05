import type { SqlDriver } from './driver'
import { SCHEMA_STATEMENTS } from './schema'

export async function migrate(driver: SqlDriver): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await driver.execute(statement)
  }
}

// Deletion order respects foreign keys: children before the parents they reference.
const TABLES_CHILD_FIRST = [
  'notification_records',
  'administration_records',
  'daily_events',
  'schedule_revisions',
  'constraints',
  'instruction_sets',
  'event_templates',
  'medications',
  'user_profiles',
  'treatment_plans',
]

/** Wipes all data (used by Settings' "Reset app") — a destructive, user-confirmed action, not part of normal operation. */
export async function resetAllData(driver: SqlDriver): Promise<void> {
  for (const table of TABLES_CHILD_FIRST) {
    await driver.execute(`DELETE FROM ${table}`)
  }
}
