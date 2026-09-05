import { describe, expect, it } from 'vitest'
import { createNodeSqliteDriver } from '../../database/drivers/nodeSqliteDriver'
import { migrate } from '../../database/migrate'
import { createPlan } from '../../database/repositories/planRepository'
import { createEventTemplate, listEventTemplatesActiveOn } from '../../database/repositories/eventTemplateRepository'
import { createConstraint, listConstraintsByPlan } from '../../database/repositories/constraintRepository'
import { removeDose, removeMedication } from '../medicationService'
import type { TreatmentPlan } from '../../domain/types'

const DATE = '2026-09-05'

async function setUp() {
  const driver = createNodeSqliteDriver()
  await migrate(driver)
  const plan: TreatmentPlan = {
    id: 'plan-1', name: 'Test', startDate: DATE, status: 'active', timezone: 'UTC',
    createdAt: DATE, updatedAt: DATE,
  }
  await createPlan(driver, plan)
  await createEventTemplate(driver, {
    id: 'breakfast', planId: plan.id, kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' },
    preferredWindow: { earliest: '2026-09-05T05:00:00.000Z', latest: '2026-09-05T07:00:00.000Z' }, activeFrom: DATE,
  })
  await createEventTemplate(driver, {
    id: 'dose-a', planId: plan.id, kind: 'medication', label: 'Drug', recurrence: { type: 'daily' }, activeFrom: DATE,
  })
  await createConstraint(driver, {
    id: 'c1', planId: plan.id, sourceTemplateId: 'dose-a', targetTemplateId: 'breakfast',
    relation: 'before', minOffsetMinutes: 60, hardness: 'hard', source: 'clinician', createdAt: DATE,
  })
  return { driver, plan }
}

describe('removeDose', () => {
  it('removes the template from today onward and deletes its constraints, keeping other templates', async () => {
    const { driver, plan } = await setUp()
    await removeDose(driver, 'dose-a', DATE)

    const active = await listEventTemplatesActiveOn(driver, plan.id, DATE)
    expect(active.map((t) => t.id)).toEqual(['breakfast'])

    const constraints = await listConstraintsByPlan(driver, plan.id)
    expect(constraints).toEqual([])
  })
})

describe('removeMedication', () => {
  it('removes every listed dose template', async () => {
    const { driver, plan } = await setUp()
    await createEventTemplate(driver, {
      id: 'dose-b', planId: plan.id, kind: 'medication', label: 'Drug', recurrence: { type: 'daily' }, activeFrom: DATE,
    })
    await removeMedication(driver, ['dose-a', 'dose-b'], DATE)

    const active = await listEventTemplatesActiveOn(driver, plan.id, DATE)
    expect(active.map((t) => t.id)).toEqual(['breakfast'])
  })
})
