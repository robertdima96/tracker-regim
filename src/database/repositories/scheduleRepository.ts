import type { SqlDriver } from '../driver'
import type { LocalDate, ScheduleEvent, ScheduleRevision } from '../../domain/types'

type DailyEventRow = {
  id: string
  template_id: string
  local_date: string
  planned_earliest: string
  planned_latest: string
  current_earliest: string
  current_latest: string
  status: string
  revision_id: string
}

function rowToEvent(row: DailyEventRow, kind: ScheduleEvent['kind'], actualAt?: string): ScheduleEvent {
  return {
    id: row.id,
    templateId: row.template_id,
    date: row.local_date,
    kind,
    plannedWindow: { earliest: row.planned_earliest, latest: row.planned_latest },
    currentWindow: { earliest: row.current_earliest, latest: row.current_latest },
    actualAt,
    status: row.status as ScheduleEvent['status'],
    revisionId: row.revision_id,
  }
}

export async function saveScheduleRevision(driver: SqlDriver, planId: string, revision: ScheduleRevision): Promise<void> {
  await driver.execute(
    `INSERT INTO schedule_revisions (id, plan_id, local_date, created_at, reason, trigger_event_id, engine_version)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [revision.id, planId, revision.localDate, revision.createdAt, revision.reason, revision.triggerEventId ?? null, revision.engineVersion],
  )
}

export async function upsertDailyEvent(driver: SqlDriver, event: ScheduleEvent): Promise<void> {
  await driver.execute(
    `INSERT INTO daily_events (id, template_id, local_date, planned_earliest, planned_latest, current_earliest, current_latest, status, revision_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       current_earliest = excluded.current_earliest,
       current_latest = excluded.current_latest,
       status = excluded.status,
       revision_id = excluded.revision_id`,
    [
      event.id,
      event.templateId,
      event.date,
      event.plannedWindow.earliest,
      event.plannedWindow.latest,
      event.currentWindow.earliest,
      event.currentWindow.latest,
      event.status,
      event.revisionId,
    ],
  )
}

export type DisplayableEvent = ScheduleEvent & { medicationId?: string; label: string }

export async function getDailyEventsForDate(driver: SqlDriver, planId: string, date: LocalDate): Promise<DisplayableEvent[]> {
  // actual_at lives on administration_records, not daily_events (see
  // 07_DATA_MODEL.md §4 — plan/rule state and actual history are
  // deliberately separate tables). The correlated subquery picks the most
  // recent 'taken'/'corrected' record per daily_event, mirroring
  // administrationRepository.ts's getEffectiveActualEvents.
  const rows = await driver.query<DailyEventRow & { kind: string; medication_id: string | null; label: string; actual_at: string | null }>(
    `SELECT de.*, et.kind AS kind, et.medication_id AS medication_id, et.label AS label,
       (
         SELECT ar.actual_at FROM administration_records ar
         WHERE ar.daily_event_id = de.id AND ar.action IN ('taken', 'corrected') AND ar.actual_at IS NOT NULL
         ORDER BY ar.recorded_at DESC LIMIT 1
       ) AS actual_at
     FROM daily_events de
     JOIN event_templates et ON de.template_id = et.id
     WHERE et.plan_id = ? AND de.local_date = ?
     ORDER BY de.current_earliest`,
    [planId, date],
  )
  return rows.map((row) => ({
    ...rowToEvent(row, row.kind as ScheduleEvent['kind'], row.actual_at ?? undefined),
    medicationId: row.medication_id ?? undefined,
    label: row.label,
  }))
}
