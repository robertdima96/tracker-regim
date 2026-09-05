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

`sourceType`:
- clinician;
- pharmacist;
- package;
- reference;
- user;
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

Kinds:
- medication_dose;
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
  source_template_id TEXT,
  target_template_id TEXT,
  type TEXT NOT NULL,
  min_offset_minutes INTEGER,
  max_offset_minutes INTEGER,
  fixed_local_time TEXT,
  hardness TEXT NOT NULL,
  source_type TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY(plan_id) REFERENCES treatment_plans(id)
);
```

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

Recommended:
- scheduled;
- available;
- late;
- taken;
- skipped;
- cancelled.

“Late” may be derived rather than persisted.

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
