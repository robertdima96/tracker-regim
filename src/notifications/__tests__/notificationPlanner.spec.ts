import { describe, expect, it } from 'vitest'
import { hashEventIdToNotificationId, planNotifications } from '../notificationPlanner'
import type { DisplayableEvent } from '../../database/repositories/scheduleRepository'

const TZ = 'UTC'
const NOW = '2026-09-05T06:00:00.000Z'

function event(overrides: Partial<DisplayableEvent>): DisplayableEvent {
  return {
    id: 'evt-1',
    templateId: 'tpl-1',
    date: '2026-09-05',
    kind: 'medication',
    plannedWindow: { earliest: '2026-09-05T08:00:00.000Z', latest: '2026-09-05T08:00:00.000Z' },
    currentWindow: { earliest: '2026-09-05T08:00:00.000Z', latest: '2026-09-05T08:00:00.000Z' },
    status: 'upcoming',
    revisionId: 'rev-1',
    label: 'Gastrofait',
    ...overrides,
  }
}

describe('planNotifications', () => {
  it('plans a reminder for an upcoming medication with a fixed (point) window', () => {
    const [d] = planNotifications([event({})], NOW, TZ)
    expect(d).toEqual({
      eventId: 'evt-1',
      templateId: 'tpl-1',
      fireAt: '2026-09-05T08:00:00.000Z',
      title: 'Gastrofait',
      body: 'Scheduled for 08:00',
      urgency: 'important',
    })
  })

  it('marks a wide window as normal urgency and a narrow one as important', () => {
    const wide = event({ currentWindow: { earliest: '2026-09-05T08:00:00.000Z', latest: '2026-09-05T09:00:00.000Z' } })
    const narrow = event({ id: 'evt-2', currentWindow: { earliest: '2026-09-05T08:00:00.000Z', latest: '2026-09-05T08:10:00.000Z' } })
    const [a, b] = planNotifications([wide, narrow], NOW, TZ)
    expect(a.urgency).toBe('normal')
    expect(b.urgency).toBe('important')
  })

  it('ignores non-medication events', () => {
    const meal = event({ kind: 'meal' })
    expect(planNotifications([meal], NOW, TZ)).toEqual([])
  })

  it('ignores events that are not upcoming', () => {
    const taken = event({ status: 'taken' })
    expect(planNotifications([taken], NOW, TZ)).toEqual([])
  })

  it('ignores a window that has already passed', () => {
    const past = event({ currentWindow: { earliest: '2026-09-05T05:00:00.000Z', latest: '2026-09-05T05:00:00.000Z' } })
    expect(planNotifications([past], NOW, TZ)).toEqual([])
  })
})

describe('hashEventIdToNotificationId', () => {
  it('is deterministic for the same id', () => {
    expect(hashEventIdToNotificationId('tpl-1::2026-09-05')).toBe(hashEventIdToNotificationId('tpl-1::2026-09-05'))
  })

  it('differs across different ids (no trivial collisions for these cases)', () => {
    expect(hashEventIdToNotificationId('tpl-1::2026-09-05')).not.toBe(hashEventIdToNotificationId('tpl-2::2026-09-05'))
  })

  it('always produces a valid non-negative 32-bit int', () => {
    const ids = ['a', 'gastrofait-dose::2026-09-05', 'x'.repeat(200), '']
    for (const id of ids) {
      const h = hashEventIdToNotificationId(id)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0x7fffffff)
    }
  })
})
