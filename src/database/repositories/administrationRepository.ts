import type { SqlDriver } from '../driver'
import type { Instant, LocalDate } from '../../domain/types'
import type { ActualEvent } from '../../scheduler/schedule'

export type AdministrationAction = 'taken' | 'skipped' | 'corrected' | 'undone'

export async function recordAdministration(
  driver: SqlDriver,
  record: { id: string; dailyEventId: string; action: AdministrationAction; actualAt?: Instant; recordedAt: Instant; source: string; note?: string },
): Promise<void> {
  await driver.execute(
    `INSERT INTO administration_records (id, daily_event_id, action, actual_at, recorded_at, source, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [record.id, record.dailyEventId, record.action, record.actualAt ?? null, record.recordedAt, record.source, record.note ?? null],
  )
}

type LatestRow = { template_id: string; action: AdministrationAction; actual_at: string | null }

async function getLatestAdministrationsForDate(driver: SqlDriver, planId: string, date: LocalDate): Promise<LatestRow[]> {
  return driver.query<LatestRow>(
    `SELECT de.template_id AS template_id, ar.action AS action, ar.actual_at AS actual_at
     FROM administration_records ar
     JOIN daily_events de ON ar.daily_event_id = de.id
     JOIN event_templates et ON de.template_id = et.id
     WHERE et.plan_id = ? AND de.local_date = ?
       AND ar.recorded_at = (
         SELECT MAX(ar2.recorded_at) FROM administration_records ar2 WHERE ar2.daily_event_id = ar.daily_event_id
       )`,
    [planId, date],
  )
}

/**
 * The 'taken'/'corrected' actions both represent a real logged instant and
 * feed the scheduler as an immutable actual event; 'skipped' and 'undone'
 * do not (see getSkippedTemplateIds for 'skipped' handling — status
 * override, not an actual instant).
 */
export async function getEffectiveActualEvents(driver: SqlDriver, planId: string, date: LocalDate): Promise<ActualEvent[]> {
  const rows = await getLatestAdministrationsForDate(driver, planId, date)
  return rows
    .filter((r) => (r.action === 'taken' || r.action === 'corrected') && r.actual_at)
    .map((r) => ({ templateId: r.template_id, actualAt: r.actual_at! }))
}

export async function getSkippedTemplateIds(driver: SqlDriver, planId: string, date: LocalDate): Promise<string[]> {
  const rows = await getLatestAdministrationsForDate(driver, planId, date)
  return rows.filter((r) => r.action === 'skipped').map((r) => r.template_id)
}
