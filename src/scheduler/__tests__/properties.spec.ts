import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { calculateSchedule } from '../schedule'
import type { EventTemplate, RelativeConstraint } from '../../domain/types'
import { localTimeToInstant } from '../time'

const TZ = 'UTC'
const DATE = '2026-09-05'

// Bounded to mid-day so offset arithmetic never clamps against the day
// boundary — boundary/midnight-crossing behavior is covered by targeted
// example-based tests (11_QA_TEST_STRATEGY.md §11), not these properties.
const anchorHour = fc.integer({ min: 8, max: 18 })
const minOffset = fc.integer({ min: 0, max: 120 })
const relation = fc.constantFrom<'before' | 'after'>('before', 'after')

function anchorPoint(hour: number) {
  const time = `${String(hour).padStart(2, '0')}:00`
  const instant = localTimeToInstant(DATE, time, TZ)
  return { earliest: instant, latest: instant }
}

function buildTwoNodeInput(anchorHour_: number, min: number, rel: 'before' | 'after') {
  const templates: EventTemplate[] = [
    { id: 'anchor', kind: 'meal', label: 'Anchor', recurrence: { type: 'daily' }, preferredWindow: anchorPoint(anchorHour_) },
    { id: 'derived', kind: 'medication', label: 'Derived', recurrence: { type: 'daily' } },
  ]
  const constraints: RelativeConstraint[] = [
    { id: 'c1', sourceTemplateId: 'derived', targetTemplateId: 'anchor', relation: rel, minOffsetMinutes: min, hardness: 'hard', source: 'clinician' },
  ]
  return { templates, constraints }
}

describe('scheduler properties', () => {
  it('idempotency: identical input always produces identical output', () => {
    fc.assert(
      fc.property(anchorHour, minOffset, relation, (hour, min, rel) => {
        const { templates, constraints } = buildTwoNodeInput(hour, min, rel)
        const input = { templates, constraints, date: DATE, timezone: TZ, actualEvents: [], engineVersion: 'v0', revisionId: 'rev-1' }
        const r1 = calculateSchedule(input)
        const r2 = calculateSchedule(input)
        expect(r2.events).toEqual(r1.events)
      }),
    )
  })

  it('actual immutability: a logged actual event is never altered by recalculation', () => {
    fc.assert(
      fc.property(anchorHour, minOffset, relation, fc.integer({ min: 8, max: 18 }), (hour, min, rel, actualHour) => {
        const { templates, constraints } = buildTwoNodeInput(hour, min, rel)
        const actualAt = localTimeToInstant(DATE, `${String(actualHour).padStart(2, '0')}:00`, TZ)
        const result = calculateSchedule({
          templates, constraints, date: DATE, timezone: TZ,
          actualEvents: [{ templateId: 'derived', actualAt }],
          engineVersion: 'v0', revisionId: 'rev-1',
        })
        const derived = result.events.find((e) => e.templateId === 'derived')!
        expect(derived.currentWindow.earliest).toBe(actualAt)
        expect(derived.currentWindow.latest).toBe(actualAt)
        expect(derived.actualAt).toBe(actualAt)
      }),
    )
  })

  it('isolation: an unconnected node never moves when a connected anchor changes', () => {
    fc.assert(
      fc.property(anchorHour, anchorHour, minOffset, relation, fc.integer({ min: 8, max: 18 }), (hourA, hourB, min, rel, isolatedHour) => {
        const { templates, constraints } = buildTwoNodeInput(hourA, min, rel)
        const isolated: EventTemplate = { id: 'isolated', kind: 'medication', label: 'Isolated', recurrence: { type: 'daily' }, fixedLocalTime: `${String(isolatedHour).padStart(2, '0')}:00` }

        const base = { constraints, date: DATE, timezone: TZ, actualEvents: [], engineVersion: 'v0', revisionId: 'rev-1' }
        const resultA = calculateSchedule({ ...base, templates: [...templates, isolated] })
        const resultB = calculateSchedule({
          ...base,
          templates: [{ ...templates[0], preferredWindow: anchorPoint(hourB) }, templates[1], isolated],
        })

        const isolatedA = resultA.events.find((e) => e.templateId === 'isolated')!
        const isolatedB = resultB.events.find((e) => e.templateId === 'isolated')!
        expect(isolatedB.currentWindow).toEqual(isolatedA.currentWindow)
      }),
    )
  })

  it('monotonic minimum: increasing the minimum gap never moves the derived earliest bound earlier', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 16 }), fc.integer({ min: 0, max: 100 }), fc.integer({ min: 1, max: 60 }), (hour, minA, delta) => {
        const minB = minA + delta
        const actualAt = localTimeToInstant(DATE, `${String(hour).padStart(2, '0')}:00`, TZ)
        // Actual event on the source ("derived"), so the anchor's earliest
        // bound is derived forward from it — the backward-propagation case.
        const templates: EventTemplate[] = [
          { id: 'anchor', kind: 'meal', label: 'Anchor', recurrence: { type: 'daily' }, preferredWindow: { earliest: localTimeToInstant(DATE, '06:00', TZ), latest: localTimeToInstant(DATE, '23:00', TZ) } },
          { id: 'derived', kind: 'medication', label: 'Derived', recurrence: { type: 'daily' } },
        ]
        const base = { templates, date: DATE, timezone: TZ, actualEvents: [{ templateId: 'derived', actualAt }], engineVersion: 'v0', revisionId: 'rev-1' }

        const resultA = calculateSchedule({ ...base, constraints: [{ id: 'c1', sourceTemplateId: 'derived', targetTemplateId: 'anchor', relation: 'before', minOffsetMinutes: minA, hardness: 'hard', source: 'clinician' }] })
        const resultB = calculateSchedule({ ...base, constraints: [{ id: 'c1', sourceTemplateId: 'derived', targetTemplateId: 'anchor', relation: 'before', minOffsetMinutes: minB, hardness: 'hard', source: 'clinician' }] })

        const anchorA = resultA.events.find((e) => e.templateId === 'anchor')!
        const anchorB = resultB.events.find((e) => e.templateId === 'anchor')!
        expect(anchorB.currentWindow.earliest >= anchorA.currentWindow.earliest).toBe(true)
      }),
    )
  })

  it('empty-window conflict: two hard constraints pinning a node into disjoint windows always conflict', () => {
    fc.assert(
      fc.property(fc.integer({ min: 8, max: 12 }), fc.integer({ min: 1, max: 4 }), (hour, gapHours) => {
        const early = anchorPoint(hour)
        const lateHour = hour + gapHours + 4 // guarantee a real gap after both offsets are applied
        const late = anchorPoint(lateHour)
        const templates: EventTemplate[] = [
          { id: 'early_anchor', kind: 'meal', label: 'Early anchor', recurrence: { type: 'daily' }, preferredWindow: early },
          { id: 'late_anchor', kind: 'meal', label: 'Late anchor', recurrence: { type: 'daily' }, preferredWindow: late },
          { id: 'pinned', kind: 'medication', label: 'Pinned', recurrence: { type: 'daily' } },
        ]
        // Force "pinned" to be exactly at early_anchor, and also exactly
        // at early_anchor + gap hours "after" late_anchor — impossible
        // unless gap collapses to zero, which it never does here.
        const constraints: RelativeConstraint[] = [
          { id: 'c1', sourceTemplateId: 'pinned', targetTemplateId: 'early_anchor', relation: 'after', minOffsetMinutes: 0, maxOffsetMinutes: 0, hardness: 'hard', source: 'clinician' },
          { id: 'c2', sourceTemplateId: 'pinned', targetTemplateId: 'late_anchor', relation: 'after', minOffsetMinutes: 0, maxOffsetMinutes: 0, hardness: 'hard', source: 'clinician' },
        ]
        const result = calculateSchedule({ templates, constraints, date: DATE, timezone: TZ, actualEvents: [], engineVersion: 'v0', revisionId: 'rev-1' })
        expect(result.conflicts.some((c) => c.reason === 'empty_window')).toBe(true)
      }),
    )
  })
})
