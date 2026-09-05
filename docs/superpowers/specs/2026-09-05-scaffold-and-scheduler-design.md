# Scaffold and scheduler engine — design

Date: 2026-09-05

## Context

First buildable sub-project of DoseFlow's Phase A (see `docs/blueprint/`,
`docs/superpowers/specs/2026-09-05-doseflow-blueprint-upgrade-design.md`).
Scope, per the decomposition agreed in conversation: project scaffold
(Capacitor + Svelte + Vite + TypeScript) and the pure-TypeScript scheduler
engine, fully unit-tested, with no UI/database/Capacitor plugin code yet.
Old vanilla-JS app (`index.html`, `style.css`, `script.js`, `manifest.json`,
`icon.svg`, `tests/`) is removed as part of this work — superseded per
`DECISIONS.md`.

The user has granted full autonomy for the implementation phase: no
per-decision approval gates. This doc records the decisions so later
sub-projects (database, UI, notifications) build on a consistent
foundation, and so a mid-build context reset doesn't lose the design.

## Scaffold

- `npm create vite@latest . -- --template svelte-ts` (into the existing
  repo root, after removing old app files).
- `@capacitor/core` + `@capacitor/cli` as dependencies; `npx cap init`
  (app id `com.doseflow.app`, app name `DoseFlow`) for `capacitor.config.ts`
  only — no `npx cap add ios/android` yet (deferred until there's a real
  screen worth running on a device).
- `vitest` + `fast-check` as dev dependencies.
- Folder layout per `docs/blueprint/08_ENGINEERING_ARCHITECTURE.md` §3:
  `/src/domain`, `/src/scheduler` get real content this sub-project;
  `/src/notifications`, `/src/database`, `/src/analytics`, `/src/screens`,
  `/src/components` are created with a placeholder `.gitkeep` only.
- Default `App.svelte` replaced with a minimal placeholder so `npm run
  dev` proves the scaffold runs; real screens come in a later sub-project.

## Domain types (`/src/domain`)

Primitives (`docs/blueprint/06_SCHEDULING_ENGINE_SPEC.md` §3):
```ts
type Instant = string          // ISO 8601 instant, e.g. "2026-09-05T08:17:00.000Z"
type LocalDate = string        // "YYYY-MM-DD"
type LocalTime = string        // "HH:mm"
type DurationMinutes = number
```

Core entities, as in-memory TypeScript objects (never SQL rows — the
database layer, a later sub-project, maps these to/from `07_DATA_MODEL.md`'s
schema; the scheduler package never imports anything database- or
Capacitor-related):

```ts
type TimeWindow = { earliest: Instant; latest: Instant }

type EventTemplateKind = 'medication' | 'meal' | 'wake' | 'sleep' | 'custom'

type Recurrence =
  | { type: 'daily' }
  | { type: 'weekdays'; days: Array<0|1|2|3|4|5|6> }   // 0 = Sunday
  | { type: 'interval_fixed'; everyMinutes: number }    // fixed clock schedule, ignores actual times
  // 'interval_actual_relative' is NOT a recurrence — it is expressed as a
  // self-referencing RelativeConstraint (see 07_DATA_MODEL.md §5's note on
  // "minimum X hours between administrations"). A template's recurrence
  // only describes when NEW instances are generated; actual-relative
  // minimum spacing is a constraint applied between generated instances.

type EventTemplate = {
  id: string
  kind: EventTemplateKind
  label: string
  recurrence: Recurrence
  /** Only for kind 'meal' | 'wake' | 'sleep': the user's lifestyle preference. */
  preferredWindow?: TimeWindow
  /** Only for kind 'medication' with no relative constraint: a plain fixed time. */
  fixedLocalTime?: LocalTime
}

type RelativeConstraint = {
  id: string
  sourceTemplateId: string
  targetTemplateId: string
  relation: 'before' | 'after'
  minOffsetMinutes: number
  maxOffsetMinutes?: number
  hardness: 'hard' | 'preference'
  source: 'clinician' | 'pharmacist' | 'package' | 'user_routine' | 'other'
}

type ScheduleEvent = {
  id: string
  templateId: string
  date: LocalDate
  kind: EventTemplateKind
  plannedWindow: TimeWindow
  currentWindow: TimeWindow
  actualAt?: Instant
  status: 'upcoming' | 'taken' | 'skipped' | 'cancelled'
  revisionId: string
}

type ConflictReason =
  | 'empty_window'        // constraints intersect to nothing
  | 'impossible_ordering' // a fixed/actual time makes required ordering impossible
  | 'cycle'               // unsupported dependency cycle
  | 'missing_anchor'      // target template not active/instantiated for this date

type Conflict = {
  id: string
  involvedEventIds: string[]
  reason: ConflictReason
  message: string
}

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

type ScheduleRevision = {
  id: string
  planId: string
  localDate: LocalDate
  createdAt: Instant
  reason: 'plan_activated' | 'event_logged' | 'actual_time_edited' | 'meal_moved' | 'plan_changed' | 'timezone_changed'
  triggerEventId?: string
  engineVersion: string
}
```

## Scheduler algorithm (`/src/scheduler`)

Public entry point, matching `06_SCHEDULING_ENGINE_SPEC.md` §5's signature:

```ts
type CalculateScheduleInput = {
  templates: EventTemplate[]
  constraints: RelativeConstraint[]
  date: LocalDate
  timezone: string                 // IANA name
  actualEvents: Array<{ templateId: string; actualAt: Instant }>
  previousSchedule?: ScheduleEvent[]
  engineVersion: string
}

type CalculateScheduleResult = {
  events: ScheduleEvent[]
  conflicts: Conflict[]
  explanations: Explanation[]
  diff: Array<{ eventId: string; changeKind: 'added' | 'window_changed' | 'status_changed' | 'removed' }>
}

function calculateSchedule(input: CalculateScheduleInput): CalculateScheduleResult
```

Steps (implements `06_SCHEDULING_ENGINE_SPEC.md` §16):

1. **Instantiate today's nodes.** For each active `EventTemplate` whose
   recurrence produces an instance on `date`, create one `ScheduleEvent`
   node (status `upcoming`, empty window pending resolution). A template
   with `recurrence.type === 'daily'` and no per-dose split produces one
   node per call site (multiple doses of the same medication are modeled
   as multiple `EventTemplate`s, per `07_DATA_MODEL.md` §3 — never as one
   template producing N nodes).

2. **Apply actual events.** Any node whose template has a matching entry
   in `actualEvents` gets `actualAt` set and its window collapsed to that
   single instant (`earliest === latest === actualAt`). This happens
   before graph resolution — actual events are immutable inputs, never
   derived (safety invariant, `06_SCHEDULING_ENGINE_SPEC.md` §22 #1).

3. **Why not a fixed-direction topological sort.** An earlier draft of
   this design sorted strictly `targetTemplateId → sourceTemplateId` (the
   anchor always resolves before what depends on it). That breaks on the
   spec's own T3 example (§10): "A actual 08:17, minimum 60m before
   breakfast → breakfast earliest 09:17." Here A is the *source* of the
   constraint, but because A has a logged actual event, resolution flows
   from A *to* breakfast (the target) — the opposite direction from the
   normal case (§9, §11) where breakfast's preference determines A's
   window. A single fixed direction cannot represent both, so resolution
   must be direction-agnostic per constraint: whichever endpoint becomes
   resolved first (by an actual event, or by having no unresolved inbound
   dependency) propagates through the constraint to bound the other
   endpoint.

4. **Seed resolved nodes.** Two independent, immediate sources of
   resolution, applied before any constraint propagation:
   - Actual event present → resolved to that single instant (already done
     in step 2). This is the highest-priority, immutable source.
   - No actual event, but the template has its own `preferredWindow`
     (meal/wake/sleep) or `fixedLocalTime` (a plain fixed-time
     medication) → provisionally resolved to that default. "Provisional"
     because step 5 may still tighten it if an actual event elsewhere
     propagates a bound onto it (as in T3, where breakfast's provisional
     09:00-ish preference gets tightened to earliest 09:17).
   Nodes with neither (derived-only, e.g. "B is 20–30 min before
   breakfast" with no default of its own) stay unresolved here.

5. **Worklist propagation (bounded fixed-point iteration).** Repeat over
   all `RelativeConstraint`s until a full pass makes no further change:
   - For a constraint whose source side is resolved (actual event, in
     particular) and whose target side is not fixed by its own actual
     event: derive a bound and intersect it into the target's window
     (target may go from provisional-only to also-constrained, or from
     unresolved to resolved if it had no default of its own).
   - For a constraint whose target side is resolved (actual event or
     provisional default) and whose source side is not fixed by its own
     actual event: derive a bound and intersect it into the source's
     window (the normal forward/reverse-scheduling case, §9/§11).
   - Bound derivation for `relation: 'before'`, anchor point (or window)
     `A`: minimum-only (`maxOffsetMinutes` absent) → `[0, A.earliest −
     minOffsetMinutes]` bounded below by the day horizon; range (both
     offsets present) → `[A.earliest − maxOffsetMinutes, A.earliest −
     minOffsetMinutes]`; exact (`minOffsetMinutes === maxOffsetMinutes`)
     → the single collapsed point. `relation: 'after'` mirrors with `+`.
     When propagating backward (source's actual event constrains the
     target, as in T3), the same offset arithmetic applies with source
     and target swapped: an actual source 60 min "before" a target means
     the target's earliest becomes `source.actualAt + 60`.
   - Intersect every newly-derived bound into the node's current window
     (provisional default, if any, counts as the starting window to
     intersect against). Empty intersection → `Conflict` with reason
     `'empty_window'`; stop tightening that node further but keep
     iterating the rest of the worklist.
   - A pass with zero changes ends the loop. Any node still fully
     unresolved (no default, never reached by propagation) → `Conflict`
     with reason `'missing_anchor'`. Any node that was mid-tightening
     across passes with no path to termination beyond a fixed iteration
     cap (generous enough for the MVP's small graphs, e.g. 3× node count)
     indicates an unsupported cycle → `Conflict` with reason `'cycle'`
     (per §17, MVP rejects rather than solves cycles).
   - `hardness: 'preference'` constraints participate in the same
     propagation but never produce a `Conflict` on empty intersection
     against a `hard` constraint — the preference side is dropped instead
     and the hard result stands (§7 of `01_PRODUCT_STRATEGY.md`'s "rules >
     timestamps" combined with `06_SCHEDULING_ENGINE_SPEC.md` §7 "when a
     treatment rule conflicts with a preference: move the preference").

6. **Same-template minimum-spacing pass.** After graph resolution, for
   every self-referencing constraint (`sourceTemplateId ===
   targetTemplateId`), gather that template's generated instances (today's
   node plus, if provided by the caller via `actualEvents`/`previousSchedule`
   context, the most recent prior actual time) in chronological order.
   Each instance's window is intersected with `[previous.actualAt ??
   previous.currentWindow.earliest + minOffsetMinutes, +∞)`. This is the
   SQL-level self-reference documented in `07_DATA_MODEL.md` §5 and the
   engine-level anchor documented in `06_SCHEDULING_ENGINE_SPEC.md` §8.

7. **Pick a concrete point per node** for `currentWindow` reporting:
   anchors (meals/wake/sleep) resolve to the point within their computed
   window closest to `preferredWindow`'s own preferred point (default: the
   window's midpoint if no single preferred instant is given). Non-anchor
   derived nodes keep their full computed window as-is (do not collapse a
   range constraint like "20–30 min before breakfast" to one instant — the
   spec's own worked examples display it as a window; see T2). This
   implements the deterministic priority order from §15: hard constraints
   first (already enforced by construction, step 5), then preference
   proximity for anchors only.

8. **Generate explanations.** For every node whose window differs from
   the plain `preferredWindow`/`fixedLocalTime` default (i.e., every
   derived node, and any anchor whose resolution was influenced by an
   actual event), emit an `Explanation` with one `facts` entry per
   contributing constraint/actual event, in the resolution order used to
   compute it. This directly produces the "why" bullets used throughout
   `05_UX_INFORMATION_ARCHITECTURE.md` (Event Detail, "When can I eat?").

9. **Diff against `previousSchedule`.** For each node, compare by `id`:
   absent in previous → `'added'`; window differs → `'window_changed'`;
   status differs → `'status_changed'`; present in previous but not in
   current instantiation → `'removed'`. Feeds notification rescheduling in
   a later sub-project (`09_NOTIFICATIONS_AND_BACKGROUND.md` §4).

10. **Idempotency.** Given identical `input`, `calculateSchedule` returns
    structurally identical output — no `Date.now()`, no randomness, no
    iteration-order-dependent map/set usage inside the algorithm (arrays
    and explicit sort comparators only).

## Testing strategy

- **T1–T7** (`06_SCHEDULING_ENGINE_SPEC.md` §23) and **SCH-001..006**
  (`11_QA_TEST_STRATEGY.md` §4) as the primary example-based suite —
  `src/scheduler/__tests__/schedule.spec.ts`, Vitest.
- **Property-based tests** (`11_QA_TEST_STRATEGY.md` §5) via `fast-check` —
  `src/scheduler/__tests__/properties.spec.ts`: hard-constraint
  satisfaction, idempotency, actual-immutability, isolation (unconnected
  components don't move), monotonic minimum (increasing a minimum gap
  never moves the resulting earliest target earlier), empty-window →
  conflict.
- TDD throughout: every step above gets its failing test written first.

## Out of scope for this sub-project

Database persistence, Svelte UI, Capacitor plugins (notifications, SQLite),
native iOS/Android projects. These are later sub-projects per the
decomposition agreed in conversation.
