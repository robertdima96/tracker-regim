import { describe, expect, it } from 'vitest'
import { calculateSchedule } from '../schedule'
import type { EventTemplate, RelativeConstraint } from '../../domain/types'
import { localTimeToInstant } from '../time'

const TZ = 'UTC'
const DATE = '2026-09-05'

function point(time: string) {
  const instant = localTimeToInstant(DATE, time, TZ)
  return { earliest: instant, latest: instant }
}

describe('calculateSchedule', () => {
  it('T1: exact offset before a fixed-preference meal anchor', () => {
    const templates: EventTemplate[] = [
      { id: 'breakfast', kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' }, preferredWindow: point('09:00') },
      { id: 'a', kind: 'medication', label: 'Drug A', recurrence: { type: 'daily' } },
    ]
    const constraints: RelativeConstraint[] = [
      {
        id: 'c1',
        sourceTemplateId: 'a',
        targetTemplateId: 'breakfast',
        relation: 'before',
        minOffsetMinutes: 60,
        maxOffsetMinutes: 60,
        hardness: 'hard',
        source: 'clinician',
      },
    ]

    const result = calculateSchedule({
      templates,
      constraints,
      date: DATE,
      timezone: TZ,
      actualEvents: [],
      engineVersion: 'v0',
      revisionId: 'rev-1',
    })

    const a = result.events.find((e) => e.templateId === 'a')!
    const breakfast = result.events.find((e) => e.templateId === 'breakfast')!

    expect(breakfast.currentWindow).toEqual(point('09:00'))
    expect(a.currentWindow).toEqual(point('08:00'))
    expect(result.conflicts).toEqual([])
  })

  it('T2: range offset before a fixed-preference meal anchor', () => {
    const templates: EventTemplate[] = [
      { id: 'breakfast', kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' }, preferredWindow: point('09:00') },
      { id: 'b', kind: 'medication', label: 'Drug B', recurrence: { type: 'daily' } },
    ]
    const constraints: RelativeConstraint[] = [
      { id: 'c1', sourceTemplateId: 'b', targetTemplateId: 'breakfast', relation: 'before', minOffsetMinutes: 20, maxOffsetMinutes: 30, hardness: 'hard', source: 'clinician' },
    ]

    const result = calculateSchedule({ templates, constraints, date: DATE, timezone: TZ, actualEvents: [], engineVersion: 'v0', revisionId: 'rev-1' })

    const b = result.events.find((e) => e.templateId === 'b')!
    expect(b.currentWindow).toEqual({ earliest: localTimeToInstant(DATE, '08:30', TZ), latest: localTimeToInstant(DATE, '08:40', TZ) })
    expect(result.conflicts).toEqual([])
  })

  it('T3: an actual event on the earlier side pushes the later anchor forward (minimum-only)', () => {
    const templates: EventTemplate[] = [
      // Wide flexible window so the propagated tightening has room to land in it.
      { id: 'breakfast', kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' }, preferredWindow: { earliest: localTimeToInstant(DATE, '08:00', TZ), latest: localTimeToInstant(DATE, '10:00', TZ) } },
      { id: 'a', kind: 'medication', label: 'Drug A', recurrence: { type: 'daily' } },
    ]
    const constraints: RelativeConstraint[] = [
      { id: 'c1', sourceTemplateId: 'a', targetTemplateId: 'breakfast', relation: 'before', minOffsetMinutes: 60, hardness: 'hard', source: 'clinician' },
    ]
    const actualEvents = [{ templateId: 'a', actualAt: localTimeToInstant(DATE, '08:17', TZ) }]

    const result = calculateSchedule({ templates, constraints, date: DATE, timezone: TZ, actualEvents, engineVersion: 'v0', revisionId: 'rev-1' })

    const breakfast = result.events.find((e) => e.templateId === 'breakfast')!
    expect(breakfast.currentWindow.earliest).toBe(localTimeToInstant(DATE, '09:17', TZ))
    expect(result.conflicts).toEqual([])
  })

  it('T4: an unrelated event does not move when a connected anchor changes', () => {
    const templates: EventTemplate[] = [
      { id: 'dinner', kind: 'meal', label: 'Dinner', recurrence: { type: 'daily' }, preferredWindow: point('19:00') },
      { id: 'c', kind: 'medication', label: 'Drug C', recurrence: { type: 'daily' }, fixedLocalTime: '12:30' },
    ]
    // No constraint links dinner and C.
    const result = calculateSchedule({ templates, constraints: [], date: DATE, timezone: TZ, actualEvents: [], engineVersion: 'v0', revisionId: 'rev-1' })

    const c = result.events.find((e) => e.templateId === 'c')!
    expect(c.currentWindow).toEqual(point('12:30'))

    const resultAfterDinnerMoves = calculateSchedule({
      templates: [{ ...templates[0], preferredWindow: point('21:00') }, templates[1]],
      constraints: [],
      date: DATE,
      timezone: TZ,
      actualEvents: [],
      engineVersion: 'v0',
      revisionId: 'rev-2',
    })
    const cAfter = resultAfterDinnerMoves.events.find((e) => e.templateId === 'c')!
    expect(cAfter.currentWindow).toEqual(point('12:30'))
  })

  it('T5: actual-relative minimum spacing produces a "next due" node from the previous actual', () => {
    const templates: EventTemplate[] = [
      { id: 'c', kind: 'medication', label: 'Drug C', recurrence: { type: 'interval_actual_relative', minGapMinutes: 360 } },
    ]
    const constraints: RelativeConstraint[] = [
      { id: 'c1', sourceTemplateId: 'c', targetTemplateId: 'c', relation: 'after', minOffsetMinutes: 360, hardness: 'hard', source: 'clinician' },
    ]
    const actualEvents = [{ templateId: 'c', actualAt: localTimeToInstant(DATE, '10:13', TZ) }]

    const result = calculateSchedule({ templates, constraints, date: DATE, timezone: TZ, actualEvents, engineVersion: 'v0', revisionId: 'rev-1' })

    const next = result.events.find((e) => e.id === 'c::next')!
    expect(next.currentWindow.earliest).toBe(localTimeToInstant(DATE, '16:13', TZ))
  })

  it('T6: incompatible hard constraints produce a conflict, not a silent violation', () => {
    const templates: EventTemplate[] = [
      { id: 'dinner', kind: 'meal', label: 'Dinner', recurrence: { type: 'daily' }, preferredWindow: point('21:00') },
      { id: 'sleep', kind: 'sleep', label: 'Bedtime', recurrence: { type: 'daily' }, preferredWindow: point('23:00') },
      { id: 'b', kind: 'medication', label: 'Drug B', recurrence: { type: 'daily' } },
    ]
    const constraints: RelativeConstraint[] = [
      // B must be exactly 30 min after dinner (21:30)...
      { id: 'c1', sourceTemplateId: 'b', targetTemplateId: 'dinner', relation: 'after', minOffsetMinutes: 30, maxOffsetMinutes: 30, hardness: 'hard', source: 'clinician' },
      // ...but also at least 3h before bedtime (<=20:00) — impossible together.
      { id: 'c2', sourceTemplateId: 'b', targetTemplateId: 'sleep', relation: 'before', minOffsetMinutes: 180, hardness: 'hard', source: 'clinician' },
    ]

    const result = calculateSchedule({ templates, constraints, date: DATE, timezone: TZ, actualEvents: [], engineVersion: 'v0', revisionId: 'rev-1' })

    expect(result.conflicts.length).toBeGreaterThan(0)
    expect(result.conflicts.some((c) => c.reason === 'empty_window')).toBe(true)
  })

  it('T7: correcting an actual time deterministically recalculates downstream events', () => {
    const templates: EventTemplate[] = [
      { id: 'breakfast', kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' }, preferredWindow: { earliest: localTimeToInstant(DATE, '08:00', TZ), latest: localTimeToInstant(DATE, '10:00', TZ) } },
      { id: 'a', kind: 'medication', label: 'Drug A', recurrence: { type: 'daily' } },
    ]
    const constraints: RelativeConstraint[] = [
      { id: 'c1', sourceTemplateId: 'a', targetTemplateId: 'breakfast', relation: 'before', minOffsetMinutes: 60, hardness: 'hard', source: 'clinician' },
    ]

    const first = calculateSchedule({
      templates, constraints, date: DATE, timezone: TZ,
      actualEvents: [{ templateId: 'a', actualAt: localTimeToInstant(DATE, '08:17', TZ) }],
      engineVersion: 'v0', revisionId: 'rev-1',
    })
    const corrected = calculateSchedule({
      templates, constraints, date: DATE, timezone: TZ,
      actualEvents: [{ templateId: 'a', actualAt: localTimeToInstant(DATE, '08:12', TZ) }],
      previousSchedule: first.events,
      engineVersion: 'v0', revisionId: 'rev-2',
    })

    const breakfastCorrected = corrected.events.find((e) => e.templateId === 'breakfast')!
    expect(breakfastCorrected.currentWindow.earliest).toBe(localTimeToInstant(DATE, '09:12', TZ))
    expect(corrected.diff.some((d) => d.eventId === 'breakfast' && d.changeKind === 'window_changed')).toBe(true)
  })

  it('is idempotent: identical input produces identical output', () => {
    const templates: EventTemplate[] = [
      { id: 'breakfast', kind: 'meal', label: 'Breakfast', recurrence: { type: 'daily' }, preferredWindow: point('09:00') },
      { id: 'a', kind: 'medication', label: 'Drug A', recurrence: { type: 'daily' } },
    ]
    const constraints: RelativeConstraint[] = [
      { id: 'c1', sourceTemplateId: 'a', targetTemplateId: 'breakfast', relation: 'before', minOffsetMinutes: 60, maxOffsetMinutes: 60, hardness: 'hard', source: 'clinician' },
    ]
    const input = { templates, constraints, date: DATE, timezone: TZ, actualEvents: [], engineVersion: 'v0', revisionId: 'rev-1' }

    const r1 = calculateSchedule(input)
    const r2 = calculateSchedule(input)
    expect(r1.events).toEqual(r2.events)
  })
})
