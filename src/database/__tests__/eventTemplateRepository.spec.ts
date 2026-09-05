import { describe, expect, it } from 'vitest'
import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver'
import { migrate } from '../migrate'
import { createPlan } from '../repositories/planRepository'
import { createEventTemplate, listEventTemplatesActiveOn, updateEventTemplate } from '../repositories/eventTemplateRepository'
import type { TreatmentPlan } from '../../domain/types'

const DATE = '2026-09-05'

async function freshDriverWithPlan() {
  const driver = createNodeSqliteDriver()
  await migrate(driver)
  const plan: TreatmentPlan = {
    id: 'plan-1', name: 'Test', startDate: DATE, status: 'draft', timezone: 'UTC',
    createdAt: '2026-09-05T00:00:00.000Z', updatedAt: '2026-09-05T00:00:00.000Z',
  }
  await createPlan(driver, plan)
  return { driver, plan }
}

describe('updateEventTemplate', () => {
  it('updates an existing template in place, keeping its id (no duplicate row)', async () => {
    const { driver, plan } = await freshDriverWithPlan()
    await createEventTemplate(driver, {
      id: 'breakfast', planId: plan.id, kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' },
      preferredWindow: { earliest: '2026-09-05T05:00:00.000Z', latest: '2026-09-05T07:00:00.000Z' },
      activeFrom: DATE,
    })

    await updateEventTemplate(driver, {
      id: 'breakfast', planId: plan.id, kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' },
      preferredWindow: { earliest: '2026-09-05T06:00:00.000Z', latest: '2026-09-05T08:00:00.000Z' },
      activeFrom: DATE,
    })

    const templates = await listEventTemplatesActiveOn(driver, plan.id, DATE)
    expect(templates.length).toBe(1)
    expect(templates[0].preferredWindow?.earliest).toBe('2026-09-05T06:00:00.000Z')
  })
})
