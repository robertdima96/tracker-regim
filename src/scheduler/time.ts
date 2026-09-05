import { DateTime } from 'luxon'
import type { Instant, LocalDate, LocalTime } from '../domain/types'

export function localTimeToInstant(date: LocalDate, time: LocalTime, timezone: string): Instant {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const dt = DateTime.fromObject({ year, month, day, hour, minute }, { zone: timezone })
  return dt.toUTC().toISO({ suppressMilliseconds: false })!.replace('+00:00', 'Z')
}

export function minutesToLocalTime(instant: Instant, timezone: string): LocalTime {
  const dt = DateTime.fromISO(instant, { zone: 'utc' }).setZone(timezone)
  return dt.toFormat('HH:mm')
}

export function addMinutes(instant: Instant, minutes: number): Instant {
  const dt = DateTime.fromISO(instant, { zone: 'utc' }).plus({ minutes })
  return dt.toISO({ suppressMilliseconds: false })!.replace('+00:00', 'Z')
}

export function diffMinutes(a: Instant, b: Instant): number {
  const dtA = DateTime.fromISO(a, { zone: 'utc' })
  const dtB = DateTime.fromISO(b, { zone: 'utc' })
  return dtA.diff(dtB, 'minutes').minutes
}

export function compareInstants(a: Instant, b: Instant): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function todayLocalDate(timezone: string): LocalDate {
  return DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd')
}

export function previousLocalDate(date: LocalDate): LocalDate {
  const [year, month, day] = date.split('-').map(Number)
  return DateTime.fromObject({ year, month, day }, { zone: 'utc' }).minus({ days: 1 }).toFormat('yyyy-MM-dd')
}
