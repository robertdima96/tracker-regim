import type { SqlDriver } from '../driver'
import type { LocalDate } from '../../domain/types'

export type ScheduledNotificationRow = {
  recordId: string
  dailyEventId: string
  platformId: string
  fireAt: string
}

/** Every notification_records row still in 'scheduled' state for a given plan/date — the "previous scheduled set" side of the diff algorithm (blueprint §4). */
export async function listScheduledNotifications(driver: SqlDriver, planId: string, date: LocalDate): Promise<ScheduledNotificationRow[]> {
  return driver.query<ScheduledNotificationRow>(
    `SELECT nr.id AS recordId, nr.daily_event_id AS dailyEventId, nr.platform_notification_id AS platformId, nr.fire_at AS fireAt
     FROM notification_records nr
     JOIN daily_events de ON nr.daily_event_id = de.id
     JOIN event_templates et ON de.template_id = et.id
     WHERE et.plan_id = ? AND de.local_date = ? AND nr.state = 'scheduled'`,
    [planId, date],
  )
}

export async function insertScheduledNotification(
  driver: SqlDriver,
  record: { id: string; dailyEventId: string; platformId: string; fireAt: string; revisionId: string },
): Promise<void> {
  await driver.execute(
    `INSERT INTO notification_records (id, daily_event_id, platform_notification_id, scheduled_at, fire_at, state, schedule_revision_id)
     VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`,
    [record.id, record.dailyEventId, record.platformId, new Date().toISOString(), record.fireAt, record.revisionId],
  )
}

export async function markNotificationCancelled(driver: SqlDriver, recordId: string): Promise<void> {
  await driver.execute(`UPDATE notification_records SET state = 'cancelled' WHERE id = ?`, [recordId])
}

/** The single next reminder due today, for the Settings notification-health block. */
export async function nextScheduledFireAt(driver: SqlDriver, planId: string, date: LocalDate): Promise<string | undefined> {
  const rows = await driver.query<{ fireAt: string }>(
    `SELECT nr.fire_at AS fireAt
     FROM notification_records nr
     JOIN daily_events de ON nr.daily_event_id = de.id
     JOIN event_templates et ON de.template_id = et.id
     WHERE et.plan_id = ? AND de.local_date = ? AND nr.state = 'scheduled'
     ORDER BY nr.fire_at ASC LIMIT 1`,
    [planId, date],
  )
  return rows[0]?.fireAt
}

/** Count of currently-scheduled reminders today, for the Settings notification-health block. */
export async function countScheduled(driver: SqlDriver, planId: string, date: LocalDate): Promise<number> {
  const rows = await driver.query<{ n: number }>(
    `SELECT COUNT(*) AS n
     FROM notification_records nr
     JOIN daily_events de ON nr.daily_event_id = de.id
     JOIN event_templates et ON de.template_id = et.id
     WHERE et.plan_id = ? AND de.local_date = ? AND nr.state = 'scheduled'`,
    [planId, date],
  )
  return rows[0]?.n ?? 0
}
