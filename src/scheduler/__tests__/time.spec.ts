import { describe, expect, it } from 'vitest'
import { addMinutes, diffMinutes, localTimeToInstant, minutesToLocalTime } from '../time'

describe('localTimeToInstant', () => {
  it('combines a local date, local time, and IANA timezone into a UTC instant', () => {
    const instant = localTimeToInstant('2026-09-05', '09:00', 'Europe/Bucharest')
    // Europe/Bucharest is UTC+3 in September (DST/EEST)
    expect(instant).toBe('2026-09-05T06:00:00.000Z')
  })

  it('is DST-safe across a spring-forward transition', () => {
    // Europe/Bucharest switches EET(+2)->EEST(+3) at 2026-03-29 03:00 local
    const before = localTimeToInstant('2026-03-29', '02:30', 'Europe/Bucharest')
    const after = localTimeToInstant('2026-03-29', '04:00', 'Europe/Bucharest')
    expect(before).toBe('2026-03-29T00:30:00.000Z')
    expect(after).toBe('2026-03-29T01:00:00.000Z')
  })
})

describe('addMinutes / diffMinutes', () => {
  it('adds minutes to an instant', () => {
    expect(addMinutes('2026-09-05T06:00:00.000Z', 60)).toBe('2026-09-05T07:00:00.000Z')
  })

  it('subtracts minutes via a negative offset', () => {
    expect(addMinutes('2026-09-05T06:00:00.000Z', -60)).toBe('2026-09-05T05:00:00.000Z')
  })

  it('computes the difference in minutes between two instants', () => {
    expect(diffMinutes('2026-09-05T07:00:00.000Z', '2026-09-05T06:00:00.000Z')).toBe(60)
    expect(diffMinutes('2026-09-05T06:00:00.000Z', '2026-09-05T07:00:00.000Z')).toBe(-60)
  })
})

describe('minutesToLocalTime', () => {
  it('renders an instant back to HH:mm in a given timezone', () => {
    expect(minutesToLocalTime('2026-09-05T06:00:00.000Z', 'Europe/Bucharest')).toBe('09:00')
  })
})
