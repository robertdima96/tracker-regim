import type { SqlDriver } from '../database/driver'
import type { TreatmentPlan } from '../domain/types'
import { newId } from '../domain/id'
import { createPlan, getActivePlan, listPlans, updatePlanStatus } from '../database/repositories/planRepository'
import { listEventTemplatesActiveOn } from '../database/repositories/eventTemplateRepository'
import { recalculateAndPersist } from './scheduleService'
import { todayLocalDate } from '../scheduler/time'

export type WizardState =
  | { screen: 'welcome' }
  | { screen: 'mealSetup'; plan: TreatmentPlan }
  | { screen: 'medicationList'; plan: TreatmentPlan }
  | { screen: 'planReview'; plan: TreatmentPlan }
  | { screen: 'today'; plan: TreatmentPlan }

/**
 * Derives which screen to show from persisted state alone (no separate
 * "wizard step" field) — a draft plan resumes wherever it's missing data,
 * an active plan always goes straight to Today. Meal/wake/sleep anchors
 * must exist before medications can reference them in a timing rule, so
 * meal setup comes before the medication list in this flow (the PRD's own
 * screen list orders them the other way around, but doesn't need
 * medications to reference meals at creation time the way this
 * implementation does).
 */
export async function getWizardState(driver: SqlDriver): Promise<WizardState> {
  const active = await getActivePlan(driver)
  if (active) return { screen: 'today', plan: active }

  const plans = await listPlans(driver)
  const draft = plans.find((p) => p.status === 'draft')
  if (!draft) return { screen: 'welcome' }

  const templates = await listEventTemplatesActiveOn(driver, draft.id, draft.startDate)
  const hasMealAnchors = templates.some((t) => t.kind === 'meal' || t.kind === 'wake' || t.kind === 'sleep')
  if (!hasMealAnchors) return { screen: 'mealSetup', plan: draft }

  const hasMedications = templates.some((t) => t.kind === 'medication')
  if (!hasMedications) return { screen: 'medicationList', plan: draft }

  return { screen: 'planReview', plan: draft }
}

export async function createDraftPlan(driver: SqlDriver, name: string, timezone: string): Promise<TreatmentPlan> {
  const now = new Date().toISOString()
  const plan: TreatmentPlan = {
    id: newId(),
    name,
    startDate: todayLocalDate(timezone),
    status: 'draft',
    timezone,
    createdAt: now,
    updatedAt: now,
  }
  await createPlan(driver, plan)
  return plan
}

export async function activatePlan(driver: SqlDriver, plan: TreatmentPlan): Promise<TreatmentPlan> {
  const now = new Date().toISOString()
  await updatePlanStatus(driver, plan.id, 'active', now)
  const activated: TreatmentPlan = { ...plan, status: 'active', updatedAt: now }
  await recalculateAndPersist(driver, activated, todayLocalDate(plan.timezone), 'plan_activated')
  return activated
}
