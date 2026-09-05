import { describe, expect, it } from 'vitest'
import { createNodeSqliteDriver } from '../../database/drivers/nodeSqliteDriver'
import { migrate } from '../../database/migrate'
import { createEventTemplate } from '../../database/repositories/eventTemplateRepository'
import { activatePlan, createDraftPlan, getWizardState } from '../planService'
import { localTimeToInstant } from '../../scheduler/time'

async function freshDriver() {
  const driver = createNodeSqliteDriver()
  await migrate(driver)
  return driver
}

describe('getWizardState', () => {
  it('shows welcome when no plan exists', async () => {
    const driver = await freshDriver()
    expect(await getWizardState(driver)).toEqual({ screen: 'welcome' })
  })

  it('resumes at mealSetup for a draft plan with no meal/wake/sleep anchors yet', async () => {
    const driver = await freshDriver()
    const plan = await createDraftPlan(driver, 'Gastric treatment', 'UTC')
    expect(await getWizardState(driver)).toEqual({ screen: 'mealSetup', plan })
  })

  it('resumes at medicationList once anchors exist but no medications', async () => {
    const driver = await freshDriver()
    const plan = await createDraftPlan(driver, 'Gastric treatment', 'UTC')
    await createEventTemplate(driver, {
      id: 'breakfast', planId: plan.id, kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' },
      preferredWindow: { earliest: localTimeToInstant(plan.startDate, '08:00', 'UTC'), latest: localTimeToInstant(plan.startDate, '10:00', 'UTC') },
      activeFrom: plan.startDate,
    })
    const state = await getWizardState(driver)
    expect(state.screen).toBe('medicationList')
  })

  it('resumes at planReview once anchors and medications both exist', async () => {
    const driver = await freshDriver()
    const plan = await createDraftPlan(driver, 'Gastric treatment', 'UTC')
    await createEventTemplate(driver, {
      id: 'breakfast', planId: plan.id, kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' },
      preferredWindow: { earliest: localTimeToInstant(plan.startDate, '08:00', 'UTC'), latest: localTimeToInstant(plan.startDate, '10:00', 'UTC') },
      activeFrom: plan.startDate,
    })
    await createEventTemplate(driver, {
      id: 'drug-a', planId: plan.id, kind: 'medication', label: 'Drug A', recurrence: { type: 'daily' },
      fixedLocalTime: '08:00', activeFrom: plan.startDate,
    })
    const state = await getWizardState(driver)
    expect(state.screen).toBe('planReview')
  })

  it('goes straight to today once activated', async () => {
    const driver = await freshDriver()
    const plan = await createDraftPlan(driver, 'Gastric treatment', 'UTC')
    await createEventTemplate(driver, {
      id: 'drug-a', planId: plan.id, kind: 'medication', label: 'Drug A', recurrence: { type: 'daily' },
      fixedLocalTime: '08:00', activeFrom: plan.startDate,
    })
    const activated = await activatePlan(driver, plan)
    expect(activated.status).toBe('active')
    const state = await getWizardState(driver)
    expect(state.screen).toBe('today')
  })
})
