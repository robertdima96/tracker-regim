import type { SqlDriver } from './driver'
import { SCHEMA_STATEMENTS } from './schema'

export async function migrate(driver: SqlDriver): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await driver.execute(statement)
  }
}
