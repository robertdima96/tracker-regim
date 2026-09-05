# Data Model

## 1. Goals

The model must support:

- treatment plans;
- medication definitions;
- schedule rules;
- meals/routines;
- daily instantiated events;
- actual administration;
- schedule revisions;
- explanations;
- future cloud sync;
- auditability.

## 2. Core entities

### UserProfile

```text
id
locale
timezone
weekStart
createdAt
```

For accountless MVP, local profile still exists.

### TreatmentPlan

```text
id
name
startDate
endDate?
status
timezonePolicy
notes?
createdAt
updatedAt
```

### Medication

```text
id
planId
displayName
strengthValue?
strengthUnit?
form?
notes?
activeFrom
activeUntil?
createdAt
updatedAt
```

Do not require normalized drug database IDs.

### InstructionSet

Represents the source/context of the schedule.

```text
id
medicationId
sourceType
sourceLabel?
notes?
confirmedAt
```

`sourceType` (must match `RelativeConstraint.source` in
`06_SCHEDULING_ENGINE_SPEC.md`, and the instruction-source picker in
`04_PRD_MVP.md` §5.2 / `05_UX_INFORMATION_ARCHITECTURE.md` §7):
- clinician;
- pharmacist;
- package;
- user_routine;
- other.

### EventTemplate

Represents a recurring logical event.

```text
id
planId
kind
label
recurrence
activeFrom
activeUntil?
```

Kinds (must match `ScheduleEvent.kind` in `06_SCHEDULING_ENGINE_SPEC.md`):
- medication;
- meal;
- wake;
- sleep;
- custom.

### Constraint

```text
id
planId
sourceTemplateId
targetTemplateId
constraintType
minOffsetMinutes?
maxOffsetMinutes?
fixedLocalTime?
hardness
instructionSetId?
createdAt
```

### DailyEvent

Concrete event for a date.

```text
id
templateId
localDate
plannedEarliest
plannedLatest
currentEarliest
currentLatest
status
revisionId
```

### AdministrationRecord

Separate from DailyEvent state for auditability.

```text
id
dailyEventId
action
actualAt?
recordedAt
source
note?
```

Actions:
- taken;
- skipped;
- corrected;
- undone.

### ScheduleRevision

```text
id
planId
localDate
createdAt
reason
triggerEventId?
engineVersion
```

### NotificationRecord

```text
id
dailyEventId
platformNotificationId
scheduledAt
fireAt
state
scheduleRevisionId
```

## 3. Why separate Medication from EventTemplate

A medication is the thing.

A dose event is an occurrence pattern.

One medication can have:
- morning dose;
- evening dose;
- different rules per dose.

Do not force all administrations of a medication to share identical timing.

## 4. Why separate plan rules from actual history

Plan may change on day 20.

History for days 1–19 must still represent what was intended then.

Use:
- versioning;
- snapshots;
- effective dates;
- immutable event history.

## 5. Suggested SQL-ish schema

```sql
CREATE TABLE treatment_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL,
  timezone_policy TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE medications (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  strength_value REAL,
  strength_unit TEXT,
  form TEXT,
  notes TEXT,
  active_from TEXT NOT NULL,
  active_until TEXT,
  FOREIGN KEY(plan_id) REFERENCES treatment_plans(id)
);

CREATE TABLE event_templates (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  medication_id TEXT,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  recurrence_json TEXT NOT NULL,
  active_from TEXT NOT NULL,
  active_until TEXT,
  FOREIGN KEY(plan_id) REFERENCES treatment_plans(id),
  FOREIGN KEY(medication_id) REFERENCES medications(id)
);

CREATE TABLE constraints (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  source_template_id TEXT NOT NULL,
  target_template_id TEXT NOT NULL,
  relation TEXT NOT NULL,              -- 'before' | 'after'
  min_offset_minutes INTEGER,
  max_offset_minutes INTEGER,
  fixed_local_time TEXT,
  hardness TEXT NOT NULL,              -- 'hard' | 'preference'
  source_type TEXT NOT NULL,           -- 'clinician' | 'pharmacist' | 'package' | 'user_routine' | 'other'
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(plan_id) REFERENCES treatment_plans(id),
  FOREIGN KEY(source_template_id) REFERENCES event_templates(id),
  FOREIGN KEY(target_template_id) REFERENCES event_templates(id)
);
```

`source_template_id` and `target_template_id` may be equal. This is how
"minimum X hours between administrations" (rule primitive #9 in
`04_PRD_MVP.md` §5.3) is modeled: a self-referencing constraint where both
sides point at the same medication-dose template, `relation = 'after'`, and
`min_offset_minutes` is the required spacing. This is also the SQL form of
the "previous same-medication administration" anchor described in
`06_SCHEDULING_ENGINE_SPEC.md` §8. Fixed-schedule recurrence ("every X
hours" regardless of actual dose time, rule primitive #8) is instead
encoded in `event_templates.recurrence_json` — the two rule primitives are
deliberately different mechanisms; see §12 of `06_SCHEDULING_ENGINE_SPEC.md`.

```sql
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL,
  timezone TEXT NOT NULL,
  week_start TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE instruction_sets (
  id TEXT PRIMARY KEY,
  medication_id TEXT NOT NULL,
  source_type TEXT NOT NULL,           -- 'clinician' | 'pharmacist' | 'package' | 'user_routine' | 'other'
  source_label TEXT,
  notes TEXT,
  confirmed_at TEXT NOT NULL,
  FOREIGN KEY(medication_id) REFERENCES medications(id)
);

CREATE TABLE schedule_revisions (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reason TEXT NOT NULL,                -- 'plan_activated' | 'event_logged' | 'actual_time_edited' | 'meal_moved' | 'plan_changed' | 'timezone_changed'
  trigger_event_id TEXT,
  engine_version TEXT NOT NULL,
  FOREIGN KEY(plan_id) REFERENCES treatment_plans(id)
);

CREATE TABLE daily_events (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  planned_earliest TEXT NOT NULL,
  planned_latest TEXT NOT NULL,
  current_earliest TEXT NOT NULL,
  current_latest TEXT NOT NULL,
  status TEXT NOT NULL,                -- 'upcoming' | 'taken' | 'skipped' | 'cancelled'
  revision_id TEXT NOT NULL,
  FOREIGN KEY(template_id) REFERENCES event_templates(id),
  FOREIGN KEY(revision_id) REFERENCES schedule_revisions(id)
);

CREATE TABLE administration_records (
  id TEXT PRIMARY KEY,
  daily_event_id TEXT NOT NULL,
  action TEXT NOT NULL,                -- 'taken' | 'skipped' | 'corrected' | 'undone'
  actual_at TEXT,
  recorded_at TEXT NOT NULL,
  source TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY(daily_event_id) REFERENCES daily_events(id)
);

CREATE TABLE notification_records (
  id TEXT PRIMARY KEY,
  daily_event_id TEXT NOT NULL,
  platform_notification_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  fire_at TEXT NOT NULL,
  state TEXT NOT NULL,                 -- 'pending' | 'delivered' | 'cancelled' | 'failed'
  schedule_revision_id TEXT NOT NULL,
  FOREIGN KEY(daily_event_id) REFERENCES daily_events(id),
  FOREIGN KEY(schedule_revision_id) REFERENCES schedule_revisions(id)
);
```

The `reason`, `action`, and `state` enum values above are copied verbatim
from `ScheduleRevision.reason` (06 §13), `AdministrationRecord.action` (§2
of this file), and `09_NOTIFICATIONS_AND_BACKGROUND.md`'s notification
lifecycle respectively. `daily_events.status` is copied from
`ScheduleEvent.status` in `06_SCHEDULING_ENGINE_SPEC.md` §4 — **not** from
§7 of this file, which currently disagrees (see below).

## 6. Recurrence model

Avoid encoding recurrence only as “times per day”.

Needed forms:

### Daily
Every day.

### Specific weekdays
Mon/Wed/Fri.

### Interval
Every X hours.

### Future
Cycle:
21 days on, 7 off.

For MVP, recurrence can use a compact JSON format while domain objects remain typed.

## 7. Event status

Persisted (`daily_events.status`, matching `ScheduleEvent.status` in
`06_SCHEDULING_ENGINE_SPEC.md` §4):
- upcoming;
- taken;
- skipped;
- cancelled.

UI-derived, never persisted (computed from `upcoming` + the event's current
window + the current time — see `05_UX_INFORMATION_ARCHITECTURE.md` §4 for
the fuller UI state list this feeds into):
- available now;
- due soon;
- due;
- late.

## 8. Planned vs current vs actual

Example:

```text
planned window: 08:30–08:40
current window: 08:47–08:57
actual: 08:53
```

All three can be useful.

Do not overwrite planned with revised.

## 9. Source metadata

Every constraint should know whether it came from:
- doctor instruction;
- pharmacist;
- package/reference;
- user preference.

This enables:
- UX;
- safety;
- audit;
- conflict prioritization.

However: source type must not automatically imply truth or clinical authority.

## 10. Preference model

Lifestyle preferences should not be stored as treatment constraints.

Example:

```text
breakfast preferred: 09:00
```

versus:

```text
medication requires: at least 60m before breakfast
```

Different entity/field or explicit `hardness`.

## 11. Sync readiness

Use globally unique IDs from day one.

Recommended:
- UUIDv7 or equivalent sortable IDs.

Each mutable record:
- updatedAt;
- optional version counter.

For cloud sync later:
- logical tombstones;
- conflict resolution;
- device ID;
- per-record encryption strategy.

## 12. Analytics isolation

Analytics events should use opaque IDs and rule categories.

Avoid sending:
- raw medication name;
- free-text medical notes;
- diagnosis;
- detailed health information;

unless deliberately required, consented, and reviewed.

Example safe-ish product event:

```json
{
  "event": "schedule_recalculated",
  "plan_complexity_bucket": "6_to_10_events",
  "rule_types": ["meal_before", "min_spacing"],
  "affected_event_count": 3
}
```

Not:

```json
{
  "medication": "Specific Drug Name",
  "diagnosis": "..."
}
```

## 13. Deletion

Local MVP:
- delete plan;
- delete history;
- reset application.

Cloud future:
- account deletion;
- data export;
- retention policy;
- deletion propagation to backups according to policy.

## 14. Migration strategy

Schema migrations must be versioned.

Because schedule data is safety-adjacent:
- migration tests;
- backup before destructive migration;
- verify event counts;
- never silently discard rule metadata.

## 15. Example plan model

```text
TreatmentPlan
  ├── Breakfast event
  ├── Lunch event
  ├── Dinner event
  ├── Medication A
  │     ├── Morning dose template
  │     └── Evening dose template
  ├── Medication B
  │     └── Four daily templates
  └── Constraints
        ├── A morning -> breakfast -60m
        ├── B morning -> breakfast -20..30m
        ├── ...
        └── A evening -> dinner -60m
```

The schema should express the plan without knowing specific medication brands.
