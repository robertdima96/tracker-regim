import { describe, expect, it } from 'vitest'
import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver'
import { migrate } from '../migrate'
import { createPlan } from '../repositories/planRepository'
import { createEventTemplate } from '../repositories/eventTemplateRepository'
import { saveScheduleRevision, upsertDailyEvent } from '../repositories/scheduleRepository'
import { recordAdministration, listHistoryForPlan } from '../repositories/administrationRepository'
import type { TreatmentPlan, ScheduleEvent } from '../../domain/types'

async function setUp() {
  const driver = createNodeSqliteDriver()
  await migrate(driver)
  const plan: TreatmentPlan = {
    id: 'plan-1', name: 'Test', startDate: '2026-09-01', status: 'active', timezone: 'UTC',
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
  }
  await createPlan(driver, plan)
  await createEventTemplate(driver, {
    id: 'drug-a', planId: plan.id, kind: 'medication', label: 'Drug A', recurrence: { type: 'daily' },
    fixedLocalTime: '08:00', activeFrom: plan.startDate,
  })
  return { driver, plan }
}

async function persistDay(driver: Awaited<ReturnType<typeof createNodeSqliteDriver>>, planId: string, date: string, status: ScheduleEvent['status'] = 'taken') {
  await saveScheduleRevision(driver, planId, {
    id: `rev-${date}`, planId, localDate: date, createdAt: `${date}T00:00:00.000Z`, reason: 'plan_activated', engineVersion: 'v0',
  })
  await upsertDailyEvent(driver, {
    id: `drug-a::${date}`, templateId: 'drug-a', date, kind: 'medication',
    plannedWindow: { earliest: `${date}T08:00:00.000Z`, latest: `${date}T08:00:00.000Z` },
    currentWindow: { earliest: `${date}T08:00:00.000Z`, latest: `${date}T08:00:00.000Z` },
    status, revisionId: `rev-${date}`,
  })
}

describe('listHistoryForPlan', () => {
  it('returns daily events on or after sinceDate, newest first, with the logged actual time', async () => {
    const { driver, plan } = await setUp()
    await persistDay(driver, plan.id, '2026-09-01')
    await recordAdministration(driver, {
      id: 'r1', dailyEventId: 'drug-a::2026-09-01', action: 'taken', actualAt: '2026-09-01T08:05:00.000Z',
      recordedAt: '2026-09-01T08:05:00.000Z', source: 'user',
    })
    await persistDay(driver, plan.id, '2026-09-02')

    const history = await listHistoryForPlan(driver, plan.id, '2026-09-01')
    expect(history.map((h) => h.date)).toEqual(['2026-09-02', '2026-09-01'])
    expect(history[1].actualAt).toBe('2026-09-01T08:05:00.000Z')
    expect(history[0].actualAt).toBeNull()
  })

  it('excludes days before sinceDate', async () => {
    const { driver, plan } = await setUp()
    await persistDay(driver, plan.id, '2026-09-01')
    await persistDay(driver, plan.id, '2026-09-02')

    const history = await listHistoryForPlan(driver, plan.id, '2026-09-02')
    expect(history.map((h) => h.date)).toEqual(['2026-09-02'])
  })
})
