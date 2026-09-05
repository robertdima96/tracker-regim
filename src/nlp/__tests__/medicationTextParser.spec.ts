import { describe, expect, it } from 'vitest'
import { parseMedicationText, type AnchorRef } from '../medicationTextParser'

const anchors: AnchorRef[] = [
  { id: 'breakfast-id', label: 'Breakfast', kind: 'meal' },
  { id: 'lunch-id', label: 'Lunch', kind: 'meal' },
  { id: 'dinner-id', label: 'Dinner', kind: 'meal' },
  { id: 'wake-id', label: 'Wake', kind: 'wake' },
  { id: 'bedtime-id', label: 'Bedtime', kind: 'sleep' },
]

describe('parseMedicationText', () => {
  it('parses a fixed-time dose with strength', () => {
    const result = parseMedicationText('Nolpaza 40mg at 8am', anchors)
    expect(result.displayName).toBe('Nolpaza')
    expect(result.strengthValue).toBe(40)
    expect(result.strengthUnit).toBe('mg')
    expect(result.doses).toEqual([{ timingType: 'fixed', fixedTime: '08:00' }])
    expect(result.warnings).toEqual([])
  })

  it('parses 24-hour fixed time and strips "every day"', () => {
    const result = parseMedicationText('Drug X every day at 22:00', anchors)
    expect(result.displayName).toBe('Drug X')
    expect(result.doses).toEqual([{ timingType: 'fixed', fixedTime: '22:00' }])
  })

  it('defaults a plain number with no qualifier to minimum', () => {
    const result = parseMedicationText('Nolpaza 60 minutes before breakfast', anchors)
    expect(result.doses).toEqual([
      { timingType: 'relative', anchorId: 'breakfast-id', anchorLabel: 'Breakfast', relation: 'before', ruleType: 'minimum', minMinutes: 60 },
    ])
  })

  it('parses "exactly" as an exact rule', () => {
    const result = parseMedicationText('Nolpaza exactly 60 minutes before breakfast', anchors)
    expect(result.doses[0]).toMatchObject({ ruleType: 'exact', minMinutes: 60, maxMinutes: 60 })
  })

  it('parses "at least" as minimum', () => {
    const result = parseMedicationText('Take B at least 60 minutes before breakfast', anchors)
    expect(result.displayName).toBe('B')
    expect(result.doses[0]).toMatchObject({ ruleType: 'minimum', minMinutes: 60, relation: 'before' })
  })

  it('parses a range with a hyphen', () => {
    const result = parseMedicationText('Gastrofait 20-30 min before breakfast', anchors)
    expect(result.doses[0]).toMatchObject({ ruleType: 'range', minMinutes: 20, maxMinutes: 30, relation: 'before' })
  })

  it('parses a range with "to"', () => {
    const result = parseMedicationText('Gastrofait 20 to 30 min before breakfast', anchors)
    expect(result.doses[0]).toMatchObject({ ruleType: 'range', minMinutes: 20, maxMinutes: 30 })
  })

  it('converts hours to minutes', () => {
    const result = parseMedicationText('Drug 1 hour before dinner', anchors)
    expect(result.doses[0]).toMatchObject({ minMinutes: 60, relation: 'before', anchorId: 'dinner-id' })
  })

  it('expands an anchor list into one dose per anchor', () => {
    const result = parseMedicationText('Gastrofait 20-30 min before breakfast, lunch, and dinner', anchors)
    expect(result.doses).toHaveLength(3)
    expect(result.doses.map((d) => (d.timingType === 'relative' ? d.anchorId : undefined))).toEqual(['breakfast-id', 'lunch-id', 'dinner-id'])
    for (const dose of result.doses) {
      expect(dose).toMatchObject({ ruleType: 'range', minMinutes: 20, maxMinutes: 30, relation: 'before' })
    }
  })

  it('expands "each meal" to every configured meal anchor', () => {
    const result = parseMedicationText('Asketon 15 minutes before each meal', anchors)
    expect(result.doses.map((d) => (d.timingType === 'relative' ? d.anchorId : undefined))).toEqual(['breakfast-id', 'lunch-id', 'dinner-id'])
  })

  it('resolves bed/bedtime/sleep synonyms to the sleep anchor', () => {
    const result = parseMedicationText('Gastrofait immediately before bed', anchors)
    expect(result.doses[0]).toMatchObject({ anchorId: 'bedtime-id', ruleType: 'exact', minMinutes: 0, maxMinutes: 0 })
  })

  it('resolves wake/waking up synonyms to the wake anchor with "after"', () => {
    const result = parseMedicationText('Drug 10 minutes after waking up', anchors)
    expect(result.doses[0]).toMatchObject({ anchorId: 'wake-id', relation: 'after', minMinutes: 10 })
  })

  it('treats "with X" as an exact zero-offset dose', () => {
    const result = parseMedicationText('Drug with breakfast', anchors)
    expect(result.doses[0]).toMatchObject({ anchorId: 'breakfast-id', ruleType: 'exact', minMinutes: 0, maxMinutes: 0 })
  })

  it('parses multiple independent clauses in one sentence', () => {
    const result = parseMedicationText('Drug 60 min before breakfast, 30 min after dinner', anchors)
    expect(result.doses).toHaveLength(2)
    expect(result.doses[0]).toMatchObject({ anchorId: 'breakfast-id', relation: 'before', minMinutes: 60 })
    expect(result.doses[1]).toMatchObject({ anchorId: 'dinner-id', relation: 'after', minMinutes: 30 })
  })

  it('strips a leading "take"/"please take"', () => {
    const result = parseMedicationText('Please take Nolpaza at 8am', anchors)
    expect(result.displayName).toBe('Nolpaza')
  })

  it('warns instead of guessing when an anchor cannot be resolved', () => {
    const result = parseMedicationText('Drug 60 min before yoga', anchors)
    expect(result.doses).toEqual([])
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('warns when no timing information is found at all', () => {
    const result = parseMedicationText('Nolpaza', anchors)
    expect(result.displayName).toBe('Nolpaza')
    expect(result.doses).toEqual([])
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
