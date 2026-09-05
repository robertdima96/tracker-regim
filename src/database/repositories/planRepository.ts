import type { SqlDriver } from '../driver'
import type { TreatmentPlan } from '../../domain/types'

type PlanRow = {
  id: string
  name: string
  start_date: string
  end_date: string | null
  status: string
  timezone_policy: string
  notes: string | null
  created_at: string
  updated_at: string
}

function rowToPlan(row: PlanRow): TreatmentPlan {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    status: row.status as TreatmentPlan['status'],
    timezone: row.timezone_policy,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createPlan(driver: SqlDriver, plan: TreatmentPlan): Promise<void> {
  await driver.execute(
    `INSERT INTO treatment_plans (id, name, start_date, end_date, status, timezone_policy, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [plan.id, plan.name, plan.startDate, plan.endDate ?? null, plan.status, plan.timezone, plan.notes ?? null, plan.createdAt, plan.updatedAt],
  )
}

export async function getPlan(driver: SqlDriver, id: string): Promise<TreatmentPlan | undefined> {
  const rows = await driver.query<PlanRow>('SELECT * FROM treatment_plans WHERE id = ?', [id])
  return rows[0] ? rowToPlan(rows[0]) : undefined
}

export async function listPlans(driver: SqlDriver): Promise<TreatmentPlan[]> {
  const rows = await driver.query<PlanRow>('SELECT * FROM treatment_plans ORDER BY created_at')
  return rows.map(rowToPlan)
}

export async function getActivePlan(driver: SqlDriver): Promise<TreatmentPlan | undefined> {
  const rows = await driver.query<PlanRow>("SELECT * FROM treatment_plans WHERE status = 'active' ORDER BY created_at DESC LIMIT 1")
  return rows[0] ? rowToPlan(rows[0]) : undefined
}

export async function updatePlanStatus(driver: SqlDriver, id: string, status: TreatmentPlan['status'], updatedAt: string): Promise<void> {
  await driver.execute('UPDATE treatment_plans SET status = ?, updated_at = ? WHERE id = ?', [status, updatedAt, id])
}
