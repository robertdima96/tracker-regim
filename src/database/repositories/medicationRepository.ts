import type { SqlDriver } from '../driver'
import type { Medication } from '../../domain/types'

type MedicationRow = {
  id: string
  plan_id: string
  display_name: string
  strength_value: number | null
  strength_unit: string | null
  form: string | null
  notes: string | null
  active_from: string
  active_until: string | null
}

function rowToMedication(row: MedicationRow): Medication {
  return {
    id: row.id,
    planId: row.plan_id,
    displayName: row.display_name,
    strengthValue: row.strength_value ?? undefined,
    strengthUnit: row.strength_unit ?? undefined,
    form: row.form ?? undefined,
    notes: row.notes ?? undefined,
    activeFrom: row.active_from,
    activeUntil: row.active_until ?? undefined,
  }
}

export async function createMedication(driver: SqlDriver, medication: Medication): Promise<void> {
  await driver.execute(
    `INSERT INTO medications (id, plan_id, display_name, strength_value, strength_unit, form, notes, active_from, active_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      medication.id,
      medication.planId,
      medication.displayName,
      medication.strengthValue ?? null,
      medication.strengthUnit ?? null,
      medication.form ?? null,
      medication.notes ?? null,
      medication.activeFrom,
      medication.activeUntil ?? null,
    ],
  )
}

export async function listMedicationsByPlan(driver: SqlDriver, planId: string): Promise<Medication[]> {
  const rows = await driver.query<MedicationRow>('SELECT * FROM medications WHERE plan_id = ? ORDER BY active_from', [planId])
  return rows.map(rowToMedication)
}
