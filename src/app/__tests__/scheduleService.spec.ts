import { describe, expect, it } from 'vitest'
import { createNodeSqliteDriver } from '../../database/drivers/nodeSqliteDriver'
import { migrate } from '../../database/migrate'
import { createPlan } from '../../database/repositories/planRepository'
import { createEventTemplate } from '../../database/repositories/eventTemplateRepository'
import { createConstraint } from '../../database/repositories/constraintRepository'
import { getDailyEventsForDate } from '../../database/repositories/scheduleRepository'
import { logAdministration, recalculateAndPersist } from '../scheduleService'
import { localTimeToInstant } from '../../scheduler/time'
import type { TreatmentPlan } from '../../domain/types'

const DATE = '2026-09-05'
const NOW = '2026-09-05T00:00:00.000Z'

async function setUpPlanWithMealDependentDrug(driver: Awaited<ReturnType<typeof createNodeSqliteDriver>>) {
  const plan: TreatmentPlan = {
    id: 'plan-1',
    name: 'Gastric treatment',
    startDate: DATE,
    status: 'active',
    timezone: 'UTC',
    createdAt: NOW,
    updatedAt: NOW,
  }
  await createPlan(driver, plan)

  await createEventTemplate(driver, {
    id: 'breakfast',
    planId: plan.id,
    kind: 'meal',
    label: 'Breakfast',
    recurrence: { type: 'daily' },
    preferredWindow: { earliest: localTimeToInstant(DATE, '08:00', 'UTC'), latest: localTimeToInstant(DATE, '10:00', 'UTC') },
    activeFrom: DATE,
  })
  await createEventTemplate(driver, {
    id: 'drug-a',
    planId: plan.id,
    kind: 'medication',
    label: 'Drug A',
    recurrence: { type: 'daily' },
    activeFrom: DATE,
  })
  await createConstraint(driver, {
    id: 'c1',
    planId: plan.id,
    sourceTemplateId: 'drug-a',
    targetTemplateId: 'breakfast',
    relation: 'before',
    minOffsetMinutes: 60,
    hardness: 'hard',
    source: 'clinician',
    createdAt: NOW,
  })

  return plan
}

describe('scheduleService (end-to-end against real SQLite)', () => {
  it('persists an initial schedule and recalculates + persists after logging a dose', async () => {
    const driver = createNodeSqliteDriver()
    await migrate(driver)
    const plan = await setUpPlanWithMealDependentDrug(driver)

    const initial = await recalculateAndPersist(driver, plan, DATE, 'plan_activated')
    expect(initial.conflicts).toEqual([])
    const persistedInitial = await getDailyEventsForDate(driver, plan.id, DATE)
    expect(persistedInitial.length).toBe(2)

    const afterDose = await logAdministration(
      driver,
      plan,
      DATE,
      'drug-a',
      'taken',
      localTimeToInstant(DATE, '08:17', 'UTC'),
      'user',
    )
    const breakfast = afterDose.events.find((e) => e.templateId === 'breakfast')!
    expect(breakfast.currentWindow.earliest).toBe(localTimeToInstant(DATE, '09:17', 'UTC'))

    const persistedAfter = await getDailyEventsForDate(driver, plan.id, DATE)
    const persistedBreakfast = persistedAfter.find((e) => e.templateId === 'breakfast')!
    expect(persistedBreakfast.currentWindow.earliest).toBe(localTimeToInstant(DATE, '09:17', 'UTC'))

    // Regression: daily_events has no actual_at column of its own (it
    // lives on administration_records) — a fresh fetch after logging a
    // dose must still surface it, not just the in-memory result from
    // logAdministration's own return value.
    const persistedDrugA = persistedAfter.find((e) => e.templateId === 'drug-a')!
    expect(persistedDrugA.actualAt).toBe(localTimeToInstant(DATE, '08:17', 'UTC'))
  })

  it('skip marks the daily event skipped without inventing an actual time', async () => {
    const driver = createNodeSqliteDriver()
    await migrate(driver)
    const plan = await setUpPlanWithMealDependentDrug(driver)
    await recalculateAndPersist(driver, plan, DATE, 'plan_activated')

    const afterSkip = await logAdministration(driver, plan, DATE, 'drug-a', 'skipped', undefined, 'user')
    const drugA = afterSkip.events.find((e) => e.templateId === 'drug-a')!
    expect(drugA.status).toBe('skipped')
    expect(drugA.actualAt).toBeUndefined()
  })
})
