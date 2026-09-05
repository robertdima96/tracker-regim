export type Instant = string // ISO 8601 instant, e.g. "2026-09-05T08:17:00.000Z"
export type LocalDate = string // "YYYY-MM-DD"
export type LocalTime = string // "HH:mm"
export type DurationMinutes = number

export type TimeWindow = {
  earliest: Instant
  latest: Instant
}

export type EventTemplateKind = 'medication' | 'meal' | 'wake' | 'sleep' | 'custom'

export type Recurrence =
  | { type: 'daily' }
  | { type: 'weekdays'; days: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> } // 0 = Sunday
  | { type: 'interval_fixed'; everyMinutes: number } // fixed clock schedule, ignores actual times
  /**
   * "As needed" actual-relative dosing (e.g. "every 6-8h, min 6h apart").
   * Only one "next due" node is generated per calculateSchedule call, from
   * the minimum-spacing self-referencing RelativeConstraint on this
   * template — see scheduler/schedule.ts's same-template pass. Full
   * multi-instance-per-day generation is out of scope for this
   * sub-project.
   */
  | { type: 'interval_actual_relative'; minGapMinutes: number }

export type EventTemplate = {
  id: string
  kind: EventTemplateKind
  label: string
  recurrence: Recurrence
  /** Only for kind 'meal' | 'wake' | 'sleep': the user's lifestyle preference. */
  preferredWindow?: TimeWindow
  /** Only for kind 'medication' with no relative constraint: a plain fixed time. */
  fixedLocalTime?: LocalTime
}

export type RelativeConstraint = {
  id: string
  sourceTemplateId: string
  targetTemplateId: string
  relation: 'before' | 'after'
  minOffsetMinutes: number
  maxOffsetMinutes?: number
  hardness: 'hard' | 'preference'
  source: 'clinician' | 'pharmacist' | 'package' | 'user_routine' | 'other'
}

export type ScheduleEventStatus = 'upcoming' | 'taken' | 'skipped' | 'cancelled'

export type ScheduleEvent = {
  id: string
  templateId: string
  date: LocalDate
  kind: EventTemplateKind
  plannedWindow: TimeWindow
  currentWindow: TimeWindow
  actualAt?: Instant
  status: ScheduleEventStatus
  revisionId: string
}

export type ConflictReason =
  | 'empty_window' // constraints intersect to nothing
  | 'impossible_ordering' // a fixed/actual time makes required ordering impossible
  | 'cycle' // unsupported dependency cycle
  | 'missing_anchor' // template not resolvable for this date

export type Conflict = {
  id: string
  involvedEventIds: string[]
  reason: ConflictReason
  message: string
}

export type ExplanationFact = {
  sourceEventId?: string
  constraintId?: string
  textKey: string
  params: Record<string, unknown>
}

export type Explanation = {
  eventId: string
  headline: string
  facts: ExplanationFact[]
}

export type ScheduleRevisionReason =
  | 'plan_activated'
  | 'event_logged'
  | 'actual_time_edited'
  | 'meal_moved'
  | 'plan_changed'
  | 'timezone_changed'

export type ScheduleRevision = {
  id: string
  planId: string
  localDate: LocalDate
  createdAt: Instant
  reason: ScheduleRevisionReason
  triggerEventId?: string
  engineVersion: string
}
