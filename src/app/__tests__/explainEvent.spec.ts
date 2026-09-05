import { describe, expect, it } from 'vitest'
import { renderExplanationFact } from '../explainEvent'
import type { ExplanationFact } from '../../domain/types'

const TZ = 'Europe/Bucharest'

describe('renderExplanationFact', () => {
  it('renders a minimum-offset anchor fact', () => {
    const fact: ExplanationFact = { textKey: 'derived_from_anchor', params: { anchorLabel: 'Breakfast', min: 60 } }
    expect(renderExplanationFact(fact, TZ)).toBe('Scheduled at least 60 minutes before Breakfast.')
  })

  it('renders an exact-offset anchor fact', () => {
    const fact: ExplanationFact = { textKey: 'derived_from_anchor', params: { anchorLabel: 'Breakfast', min: 30, max: 30 } }
    expect(renderExplanationFact(fact, TZ)).toBe('Scheduled exactly 30 minutes before Breakfast.')
  })

  it('renders a range-offset anchor fact', () => {
    const fact: ExplanationFact = { textKey: 'derived_from_anchor', params: { anchorLabel: 'Breakfast', min: 10, max: 20 } }
    expect(renderExplanationFact(fact, TZ)).toBe('Scheduled 10–20 minutes before Breakfast.')
  })

  it('renders a zero-offset anchor fact as "at the same time as"', () => {
    const fact: ExplanationFact = { textKey: 'derived_from_anchor', params: { anchorLabel: 'Breakfast', min: 0, max: 0 } }
    expect(renderExplanationFact(fact, TZ)).toBe('Scheduled at the same time as Breakfast.')
  })

  it('renders a fact derived from a logged actual event', () => {
    const fact: ExplanationFact = {
      textKey: 'derived_from_actual',
      params: { sourceLabel: 'Gastrofait', sourceActualAt: '2026-09-05T06:00:00.000Z', min: 30 },
    }
    const text = renderExplanationFact(fact, 'UTC')
    expect(text).toBe('Because you took Gastrofait at 06:00, this is scheduled at least 30 minutes after that.')
  })

  it('renders a zero-offset actual fact as "at the same time you took"', () => {
    const fact: ExplanationFact = {
      textKey: 'derived_from_actual',
      params: { sourceLabel: 'Breakfast', sourceActualAt: '2026-09-05T06:00:00.000Z', min: 0, max: 0 },
    }
    expect(renderExplanationFact(fact, 'UTC')).toBe('Scheduled at the same time you took Breakfast (06:00).')
  })

  it('renders a minimum-spacing-from-previous fact', () => {
    const fact: ExplanationFact = {
      textKey: 'min_spacing_from_previous',
      params: { previousActualAt: '2026-09-05T06:00:00.000Z', minOffsetMinutes: 240 },
    }
    expect(renderExplanationFact(fact, 'UTC')).toBe("Because you took this at 06:00, the next dose isn't due for at least 240 minutes.")
  })

  it('singularizes "1 minute"', () => {
    const fact: ExplanationFact = { textKey: 'derived_from_anchor', params: { anchorLabel: 'Lunch', min: 1, max: 1 } }
    expect(renderExplanationFact(fact, TZ)).toBe('Scheduled exactly 1 minute before Lunch.')
  })

  it('falls back to the raw textKey for an unrecognized fact', () => {
    const fact: ExplanationFact = { textKey: 'something_new', params: {} }
    expect(renderExplanationFact(fact, TZ)).toBe('something_new')
  })
})
