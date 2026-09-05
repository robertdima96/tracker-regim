import type { ExplanationFact } from '../domain/types'
import { minutesToLocalTime } from '../scheduler/time'

function pluralMinutes(n: number): string {
  return `${n} minute${n === 1 ? '' : 's'}`
}

function offsetAmount(min: number, max?: number): string {
  if (max === undefined) return `at least ${pluralMinutes(min)}`
  if (max === min) return `exactly ${pluralMinutes(min)}`
  return `${min}–${max} minutes`
}

function isZeroOffset(min: number, max: number | undefined): boolean {
  return min === 0 && (max === undefined || max === 0)
}

/** Turns one scheduler-produced ExplanationFact into a plain-English sentence for the Event Detail "why" list. */
export function renderExplanationFact(fact: ExplanationFact, timezone: string): string {
  switch (fact.textKey) {
    case 'derived_from_anchor': {
      const { anchorLabel, min, max } = fact.params as { anchorLabel: string; min: number; max?: number }
      if (isZeroOffset(min, max)) return `Scheduled at the same time as ${anchorLabel}.`
      return `Scheduled ${offsetAmount(min, max)} before ${anchorLabel}.`
    }
    case 'derived_from_actual': {
      const { sourceLabel, sourceActualAt, min, max } = fact.params as {
        sourceLabel: string
        sourceActualAt: string
        min: number
        max?: number
      }
      const time = minutesToLocalTime(sourceActualAt, timezone)
      if (isZeroOffset(min, max)) return `Scheduled at the same time you took ${sourceLabel} (${time}).`
      return `Because you took ${sourceLabel} at ${time}, this is scheduled ${offsetAmount(min, max)} after that.`
    }
    case 'min_spacing_from_previous': {
      const { previousActualAt, minOffsetMinutes } = fact.params as { previousActualAt: string; minOffsetMinutes: number }
      const time = minutesToLocalTime(previousActualAt, timezone)
      return `Because you took this at ${time}, the next dose isn't due for at least ${pluralMinutes(minOffsetMinutes)}.`
    }
    default:
      return fact.textKey
  }
}
