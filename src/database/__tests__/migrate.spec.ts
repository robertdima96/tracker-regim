import { describe, expect, it } from 'vitest'
import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver'
import { migrate, resetAllData } from '../migrate'

describe('migrate', () => {
  it('creates all ten schema tables', async () => {
    const driver = createNodeSqliteDriver()
    await migrate(driver)

    const tables = await driver.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    const names = tables.map((t) => t.name)

    expect(names).toEqual(
      [
        'administration_records',
        'constraints',
        'daily_events',
        'event_templates',
        'instruction_sets',
        'medications',
        'notification_records',
        'schedule_revisions',
        'treatment_plans',
        'user_profiles',
      ].sort(),
    )
  })

  it('is safe to run twice (idempotent, no data loss)', async () => {
    const driver = createNodeSqliteDriver()
    await migrate(driver)
    await driver.execute(
      "INSERT INTO treatment_plans (id, name, start_date, status, timezone_policy, created_at, updated_at) VALUES ('p1','Test','2026-09-05','draft','device','2026-09-05T00:00:00.000Z','2026-09-05T00:00:00.000Z')",
    )
    await migrate(driver)
    const rows = await driver.query('SELECT * FROM treatment_plans')
    expect(rows.length).toBe(1)
  })
})

describe('resetAllData', () => {
  it('deletes every row without violating foreign key constraints', async () => {
    const driver = createNodeSqliteDriver()
    await migrate(driver)
    await driver.execute(
      "INSERT INTO treatment_plans (id, name, start_date, status, timezone_policy, created_at, updated_at) VALUES ('p1','Test','2026-09-05','draft','device','2026-09-05T00:00:00.000Z','2026-09-05T00:00:00.000Z')",
    )
    await driver.execute(
      "INSERT INTO medications (id, plan_id, display_name, active_from) VALUES ('m1','p1','Drug','2026-09-05')",
    )

    await resetAllData(driver)

    expect(await driver.query('SELECT * FROM treatment_plans')).toEqual([])
    expect(await driver.query('SELECT * FROM medications')).toEqual([])
  })
})
