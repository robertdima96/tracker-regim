# Scheduling Engine Specification

## 1. Purpose

The scheduling engine is the core differentiator.

Its job is to:

1. convert plan rules into concrete daily events;
2. calculate valid time points/windows;
3. respond to actual user events;
4. propagate changes only where dependencies exist;
5. detect conflicts;
6. explain every derived result.

It is **not** a clinical decision engine.

## 2. Core model

Represent the treatment as a graph.

### Nodes

Examples:
- medication administration;
- breakfast;
- lunch;
- dinner;
- wake;
- bedtime;
- custom event.

### Edges / constraints

Examples:
- A occurs 60m before Breakfast;
- B occurs 20–30m before Breakfast;
- C occurs at least 6h after prior C;
- D occurs no earlier than 2h after Lunch.

## 3. Time representation

Use absolute instants internally for concrete events.

For user-facing local schedule:
- IANA timezone;
- local date;
- local time;
- DST-safe conversion.

Avoid storing only “milliseconds since midnight”.

### Suggested primitives

```ts
type Instant = string // ISO instant
type LocalDate = string // YYYY-MM-DD
type LocalTime = string // HH:mm
type DurationMinutes = number
```

## 4. Event model

```ts
type ScheduleEvent = {
  id: string
  templateId: string
  date: LocalDate
  kind: 'medication' | 'meal' | 'wake' | 'sleep' | 'custom'
  plannedWindow: TimeWindow
  currentWindow: TimeWindow
  actualAt?: Instant
  status: 'upcoming' | 'taken' | 'skipped' | 'cancelled'
  revisionId: string
}
```

## 5. Time window

```ts
type TimeWindow = {
  earliest: Instant
  latest: Instant
}
```

Exact time:

`earliest === latest`

Open-ended constraints should be normalized against a day/plan horizon.

## 6. Constraint model

```ts
type RelativeConstraint = {
  id: string
  sourceTemplateId: string
  targetTemplateId: string
  relation: 'before' | 'after'
  minOffsetMinutes: number
  maxOffsetMinutes?: number
  hardness: 'hard' | 'preference'
  source: 'doctor' | 'pharmacist' | 'reference' | 'user'
}
```

Example:

B 20–30 minutes before breakfast:

```text
breakfast - 30m <= B <= breakfast - 20m
```

## 7. Hard constraints vs preferences

### Hard constraint
Derived from treatment instruction.

Should never be silently violated.

### Preference
User lifestyle target.

Examples:
- breakfast preferred 09:00;
- sleep preferred 23:30.

When a treatment rule conflicts with a preference:
- move the preference;
- explain.

When hard constraints conflict:
- surface conflict.

## 8. Anchoring rules

Supported MVP anchors:

- exact wall-clock;
- meal;
- wake;
- sleep;
- previous same-medication administration.

Later:
- another medication;
- arbitrary custom event.

## 9. Forward scheduling

Example:

Breakfast preferred at 09:00.

A must be >=60m before breakfast.

B must be 20–30m before breakfast.

Pick solution nearest preferences:

- Breakfast 09:00
- A 08:00 or earlier according to exact rule semantics
- B window 08:30–08:40

The engine should distinguish:
- exact offset;
- minimum offset;
- allowed range.

## 10. Actual-event propagation

User logs A at 08:17.

If rule is exact “60 minutes before breakfast”:
- breakfast = 09:17.

If rule is minimum “at least 60 minutes before breakfast”:
- breakfast earliest = 09:17, but later remains valid.

B window becomes relative to selected/earliest meal representation.

The product must define this carefully because “exactly 60m” and “at least 60m” are clinically and mathematically different instructions.

## 11. Reverse scheduling

Input:
- desired dinner = 20:30.

Constraints:
- A 60m before dinner;
- B 20–30m before dinner.

Output:
- A = 19:30;
- B = 20:00–20:10;
- dinner = 20:30.

If A also must be 6h after prior A at 14:00:
- earliest A = 20:00;
- desired dinner becomes impossible under exact 60m-before rule;
- conflict.

## 12. Every-X-hours semantics

Must distinguish:

### Fixed schedule
08:00 / 14:00 / 20:00 regardless of actual administration.

### Actual-relative
Next administration >= X hours after actual previous administration.

These are different user instructions.

Data model must never infer one from the other.

## 13. Schedule revision

Every meaningful recalculation creates a logical revision.

```ts
type ScheduleRevision = {
  id: string
  createdAt: Instant
  reason:
    | 'plan_activated'
    | 'event_logged'
    | 'actual_time_edited'
    | 'meal_moved'
    | 'plan_changed'
    | 'timezone_changed'
  triggerEventId?: string
}
```

Do not duplicate all data if snapshots are expensive; revisions can be reconstructed from events + changes. But retaining enough audit information is valuable.

## 14. Idempotency

Given the same:

- plan version;
- actual event history;
- date;
- timezone;
- preference state;

the engine must return the same schedule.

No random choices.

## 15. Deterministic optimization priority

When multiple valid schedules exist, use explicit priorities.

Candidate order:

1. satisfy hard constraints;
2. preserve completed actual events;
3. avoid moving unaffected events;
4. minimize deviation from user preferences;
5. minimize number of changed future events;
6. choose earliest/later according to deterministic tie-break.

Do not bury priorities in implementation details. Document them.

## 16. Dependency propagation

Initial MVP can use a directed constraint graph.

Algorithm sketch:

1. load active event templates;
2. instantiate today’s nodes;
3. apply immutable actual events;
4. topologically sort dependencies where possible;
5. propagate allowed windows;
6. intersect constraints;
7. detect empty intersections;
8. choose preferred concrete targets for UI/notification;
9. generate explanation graph;
10. diff against previous schedule.

## 17. Cycles

Graph cycle may indicate:

- valid mutual constraint requiring solver;
- configuration error;
- unsupported relation.

MVP recommendation:
Reject unsupported hard dependency cycles and explain them.

Later:
Use proper constraint programming / interval solver if product requirements justify it.

## 18. Conflict definition

A conflict exists when:
- a node’s hard allowed window becomes empty;
- ordering creates an impossible interval;
- two immutable actual events contradict configured hard rules;
- a required anchor is missing;
- a cycle cannot be solved.

## 19. Actual events that violate constraints

Example:
User logs B at a time outside configured pre-meal window.

The app should record reality.

Do not modify actual history to make it valid.

Then:
- flag “outside configured timing”;
- recalculate what can still be calculated;
- avoid clinical advice.

## 20. Explanation model

The engine should return structured reasoning, not a text blob.

```ts
type Explanation = {
  eventId: string
  headline: string
  facts: Array<{
    sourceEventId?: string
    constraintId?: string
    textKey: string
    params: Record<string, unknown>
  }>
}
```

UI localizes the explanation.

Example facts:
- A actual = 08:17
- constraint = minimum 60m before breakfast
- result earliest = 09:17

## 21. Solver evolution

### V0
Hand-coded deterministic propagation.

### V1
Interval constraint propagation.

### V2
General constraint solver if required.

Possible technologies later:
- OR-Tools;
- custom CSP;
- temporal constraint network.

Do not introduce heavy solver complexity until real user plans require it.

## 22. Safety invariants

1. Never alter recorded actual time without user action.
2. Never invent a missed-dose recovery rule.
3. Never silently violate a hard treatment constraint.
4. Never label a derived time “medically safe”.
5. Never treat a lifestyle preference as equivalent to a prescribed constraint.
6. Always preserve source of instruction.
7. Schedule changes must be explainable.

## 23. Core test examples

### T1 Meal dependency
A 60m before breakfast, breakfast 09:00 → A 08:00.

### T2 Range
B 20–30m before breakfast 09:00 → 08:30–08:40.

### T3 Late actual
A actual 08:17, minimum 60m before breakfast → breakfast earliest 09:17.

### T4 Unrelated event
Change breakfast; dinner-only medication remains unchanged.

### T5 Every-X actual-relative
C actual 10:13, min gap 6h → next earliest 16:13.

### T6 Conflict
Dinner 21:00 fixed, B 30m after dinner, B >=3h before 23:00 sleep → impossible.

### T7 Correction
A logged 08:17 then edited 08:12 → downstream schedule deterministically recalculated.

## 24. Engine success criterion

The engine is successful when product managers and users can inspect any output and answer:

> “Which configured instructions produced this time?”
