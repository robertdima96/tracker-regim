import type { SqlDriver } from '../database/driver'
import type { LocalDate, ScheduleRevisionReason, TreatmentPlan } from '../domain/types'
import { calculateSchedule, dailyEventId, type CalculateScheduleResult } from '../scheduler/schedule'
import { listEventTemplatesActiveOn } from '../database/repositories/eventTemplateRepository'
import { listConstraintsByPlan } from '../database/repositories/constraintRepository'
import { getEffectiveActualEvents, getSkippedTemplateIds, recordAdministration, type AdministrationAction } from '../database/repositories/administrationRepository'
import { saveScheduleRevision, upsertDailyEvent, getDailyEventsForDate } from '../database/repositories/scheduleRepository'

const ENGINE_VERSION = 'v0'

function newId(): string {
  return crypto.randomUUID()
}

/**
 * Recomputes today's schedule from persisted templates/constraints/actual
 * events and writes the result back (a schedule_revisions row plus one
 * upserted daily_events row per event). Call this whenever the Today
 * screen loads, and after every logAdministration — a daily_events row
 * must exist before logAdministration can reference it as a foreign key.
 */
export async function recalculateAndPersist(
  driver: SqlDriver,
  plan: TreatmentPlan,
  date: LocalDate,
  reason: ScheduleRevisionReason,
  triggerEventId?: string,
): Promise<CalculateScheduleResult> {
  const [templates, constraints, actualEvents, skippedIds, previousEvents] = await Promise.all([
    listEventTemplatesActiveOn(driver, plan.id, date),
    listConstraintsByPlan(driver, plan.id),
    getEffectiveActualEvents(driver, plan.id, date),
    getSkippedTemplateIds(driver, plan.id, date),
    getDailyEventsForDate(driver, plan.id, date),
  ])

  const revisionId = newId()
  const result = calculateSchedule({
    templates,
    constraints,
    date,
    timezone: plan.timezone,
    actualEvents,
    previousSchedule: previousEvents,
    engineVersion: ENGINE_VERSION,
    revisionId,
  })

  // calculateSchedule has no concept of "skipped" — it only ever derives
  // 'upcoming'/'taken' from actual events, by design (see
  // 2026-09-05-scaffold-and-scheduler-design.md). Skip is a user action
  // recorded separately and applied as a status override here, rather
  // than teaching the pure algorithm a status it never needs to reason
  // about internally.
  const skippedSet = new Set(skippedIds)
  for (const event of result.events) {
    if (skippedSet.has(event.templateId)) event.status = 'skipped'
  }

  await saveScheduleRevision(driver, plan.id, {
    id: revisionId,
    planId: plan.id,
    localDate: date,
    createdAt: new Date().toISOString(),
    reason,
    triggerEventId,
    engineVersion: ENGINE_VERSION,
  })
  for (const event of result.events) {
    await upsertDailyEvent(driver, event)
  }

  return result
}

/**
 * Records a dose action and recalculates. The daily_events row this
 * references must already exist (via a prior recalculateAndPersist call —
 * normally the one the Today screen makes on load) since
 * administration_records.daily_event_id is a foreign key.
 */
export async function logAdministration(
  driver: SqlDriver,
  plan: TreatmentPlan,
  date: LocalDate,
  templateId: string,
  action: AdministrationAction,
  actualAt: string | undefined,
  source: string,
  note?: string,
): Promise<CalculateScheduleResult> {
  const targetDailyEventId = dailyEventId(templateId, date)
  await recordAdministration(driver, {
    id: newId(),
    dailyEventId: targetDailyEventId,
    action,
    actualAt,
    recordedAt: new Date().toISOString(),
    source,
    note,
  })
  return recalculateAndPersist(driver, plan, date, 'event_logged', targetDailyEventId)
}
