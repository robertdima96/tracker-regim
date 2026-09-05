import type { SqlDriver } from '../driver'
import type { EventTemplate, LocalDate } from '../../domain/types'

export type StoredEventTemplate = EventTemplate & {
  planId: string
  medicationId?: string
  activeFrom: LocalDate
  activeUntil?: LocalDate
}

type EventTemplateRow = {
  id: string
  plan_id: string
  medication_id: string | null
  kind: string
  label: string
  recurrence_json: string
  preferred_earliest: string | null
  preferred_latest: string | null
  fixed_local_time: string | null
  active_from: string
  active_until: string | null
}

function rowToTemplate(row: EventTemplateRow): StoredEventTemplate {
  return {
    id: row.id,
    kind: row.kind as EventTemplate['kind'],
    label: row.label,
    recurrence: JSON.parse(row.recurrence_json),
    preferredWindow:
      row.preferred_earliest && row.preferred_latest ? { earliest: row.preferred_earliest, latest: row.preferred_latest } : undefined,
    fixedLocalTime: row.fixed_local_time ?? undefined,
    planId: row.plan_id,
    medicationId: row.medication_id ?? undefined,
    activeFrom: row.active_from,
    activeUntil: row.active_until ?? undefined,
  }
}

export async function createEventTemplate(driver: SqlDriver, template: StoredEventTemplate): Promise<void> {
  await driver.execute(
    `INSERT INTO event_templates (id, plan_id, medication_id, kind, label, recurrence_json, preferred_earliest, preferred_latest, fixed_local_time, active_from, active_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      template.id,
      template.planId,
      template.medicationId ?? null,
      template.kind,
      template.label,
      JSON.stringify(template.recurrence),
      template.preferredWindow?.earliest ?? null,
      template.preferredWindow?.latest ?? null,
      template.fixedLocalTime ?? null,
      template.activeFrom,
      template.activeUntil ?? null,
    ],
  )
}

export async function updateEventTemplate(driver: SqlDriver, template: StoredEventTemplate): Promise<void> {
  await driver.execute(
    `UPDATE event_templates SET
       label = ?, recurrence_json = ?, preferred_earliest = ?, preferred_latest = ?, fixed_local_time = ?
     WHERE id = ?`,
    [
      template.label,
      JSON.stringify(template.recurrence),
      template.preferredWindow?.earliest ?? null,
      template.preferredWindow?.latest ?? null,
      template.fixedLocalTime ?? null,
      template.id,
    ],
  )
}

/**
 * "Delete" is a deactivation (active_until set), not a row delete — this
 * preserves any daily_events/administration_records history that already
 * references this template (07_DATA_MODEL.md §4: plan changes must not
 * erase what was true when history was recorded), and avoids the FK
 * constraint a hard delete would hit the moment any history exists.
 *
 * `lastActiveDate` is inclusive (the template still counts as active on
 * that date) — pass `previousLocalDate(today)` to remove it starting
 * today, per listEventTemplatesActiveOn's `active_until >= date` check.
 */
export async function deactivateEventTemplate(driver: SqlDriver, templateId: string, lastActiveDate: LocalDate): Promise<void> {
  await driver.execute('UPDATE event_templates SET active_until = ? WHERE id = ?', [lastActiveDate, templateId])
}

export async function listEventTemplatesActiveOn(driver: SqlDriver, planId: string, date: LocalDate): Promise<StoredEventTemplate[]> {
  const rows = await driver.query<EventTemplateRow>(
    `SELECT * FROM event_templates
     WHERE plan_id = ? AND active_from <= ? AND (active_until IS NULL OR active_until >= ?)
     ORDER BY id`,
    [planId, date, date],
  )
  return rows.map(rowToTemplate)
}

/** Every template ever created for this plan, including deactivated ones — for a full backup export, not schedule generation. */
export async function listAllEventTemplatesForPlan(driver: SqlDriver, planId: string): Promise<StoredEventTemplate[]> {
  const rows = await driver.query<EventTemplateRow>('SELECT * FROM event_templates WHERE plan_id = ? ORDER BY id', [planId])
  return rows.map(rowToTemplate)
}
