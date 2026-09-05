import type { SqlDriver } from '../database/driver'
import type { LocalDate } from '../domain/types'
import { deactivateEventTemplate } from '../database/repositories/eventTemplateRepository'
import { deleteConstraintsForTemplate } from '../database/repositories/constraintRepository'
import { previousLocalDate } from '../scheduler/time'

/** Removes a single dose (one EventTemplate + its constraints), effective today. */
export async function removeDose(driver: SqlDriver, templateId: string, today: LocalDate): Promise<void> {
  await deleteConstraintsForTemplate(driver, templateId)
  await deactivateEventTemplate(driver, templateId, previousLocalDate(today))
}

/** Removes every dose belonging to one medication (all its EventTemplates), effective today. */
export async function removeMedication(driver: SqlDriver, doseTemplateIds: string[], today: LocalDate): Promise<void> {
  for (const templateId of doseTemplateIds) {
    await removeDose(driver, templateId, today)
  }
}
