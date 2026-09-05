import type { SqlDriver } from '../driver'
import type { RelativeConstraint } from '../../domain/types'

export type StoredConstraint = RelativeConstraint & { planId: string; createdAt: string }

type ConstraintRow = {
  id: string
  plan_id: string
  source_template_id: string
  target_template_id: string
  relation: string
  min_offset_minutes: number | null
  max_offset_minutes: number | null
  hardness: string
  source_type: string
  note: string | null
  created_at: string
}

function rowToConstraint(row: ConstraintRow): StoredConstraint {
  return {
    id: row.id,
    planId: row.plan_id,
    sourceTemplateId: row.source_template_id,
    targetTemplateId: row.target_template_id,
    relation: row.relation as RelativeConstraint['relation'],
    minOffsetMinutes: row.min_offset_minutes ?? 0,
    maxOffsetMinutes: row.max_offset_minutes ?? undefined,
    hardness: row.hardness as RelativeConstraint['hardness'],
    source: row.source_type as RelativeConstraint['source'],
    createdAt: row.created_at,
  }
}

export async function createConstraint(driver: SqlDriver, constraint: StoredConstraint): Promise<void> {
  await driver.execute(
    `INSERT INTO constraints (id, plan_id, source_template_id, target_template_id, relation, min_offset_minutes, max_offset_minutes, hardness, source_type, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      constraint.id,
      constraint.planId,
      constraint.sourceTemplateId,
      constraint.targetTemplateId,
      constraint.relation,
      constraint.minOffsetMinutes,
      constraint.maxOffsetMinutes ?? null,
      constraint.hardness,
      constraint.source,
      null,
      constraint.createdAt,
    ],
  )
}

export async function listConstraintsByPlan(driver: SqlDriver, planId: string): Promise<StoredConstraint[]> {
  const rows = await driver.query<ConstraintRow>('SELECT * FROM constraints WHERE plan_id = ? ORDER BY id', [planId])
  return rows.map(rowToConstraint)
}
