# QA & Test Strategy

## 1. Quality priority

The core quality requirement is not visual polish. It is:

> The schedule shown, stored, and notified must correspond deterministically to the configured rules and actual events.

## 2. Test pyramid

### Level 1 — Scheduler unit tests
Largest suite.

### Level 2 — Domain/application integration tests
Persistence + schedule + revision.

### Level 3 — Notification integration tests
OS-specific.

### Level 4 — UI tests
Critical flows.

### Level 5 — Manual device matrix
Real notification/background behavior.

## 3. Scheduler test taxonomy

### Fixed time
- one daily;
- multiple daily;
- time window.

### Before meal
- exact 60m;
- minimum 60m;
- range 20–30m;
- multiple medications same meal.

### After meal
- exact;
- minimum;
- range.

### Interval
- every 6h fixed-plan;
- >=6h actual-relative;
- crosses midnight.

### Actual changes
- early;
- late;
- correction;
- undo.

### Skip
- no dependent rule;
- dependent rule;
- skip creates unresolved future anchor.

### Preferences
- meal preference moves;
- hard rule wins over preference.

### Conflicts
- empty interval;
- fixed-time conflict;
- cycle;
- missing anchor.

## 4. Example table

| ID | Given | When | Expected |
|---|---|---|---|
| SCH-001 | A 60m before breakfast 09:00 | calculate | A 08:00 |
| SCH-002 | B 20–30m before breakfast 09:00 | calculate | B 08:30–08:40 |
| SCH-003 | A actual 08:17, min 60m pre-meal | recalc | breakfast earliest 09:17 |
| SCH-004 | dinner-only C | breakfast moves | C unchanged |
| SCH-005 | C min 6h after actual | actual 10:13 | next >=16:13 |
| SCH-006 | incompatible hard rules | calculate | conflict, no silent violation |

## 5. Property-based testing

This engine is a good candidate for property-based tests.

Properties:

1. Hard constraint satisfaction:
   Every valid generated schedule satisfies every active hard constraint.

2. Idempotency:
   Recalculating identical input returns identical output.

3. Actual immutability:
   Recalculation never changes an actual timestamp.

4. Isolation:
   Unconnected graph components do not move.

5. Monotonic minimum:
   If a minimum gap is increased, resulting earliest valid target cannot move earlier.

6. Empty-window conflict:
   Any node whose constraints intersect to an empty interval produces conflict.

Libraries:
- fast-check for TypeScript.

## 6. Golden fixtures

Maintain real-like anonymized plan fixtures.

Examples:
- `gastric_complex_9_events.json`
- `two_meal_dependencies.json`
- `shift_worker.json`
- `every_6_hours.json`
- `conflict_bedtime.json`
- `timezone_travel.json`

Each fixture stores expected schedule.

## 7. Regression corpus

Every production scheduling defect becomes:
1. minimized reproduction fixture;
2. failing test;
3. fix;
4. permanent regression test.

This becomes a key product asset.

## 8. Database tests

- migrations from every supported prior schema;
- no orphan constraints;
- deletion cascade rules;
- plan duplication;
- actual history immutable after plan edit;
- crash mid-write recovery.

## 9. Notification tests

### Functional
- schedule;
- cancel;
- replace;
- action callback;
- deep link;
- duplicate prevention.

### Environment
- app foreground;
- background;
- terminated;
- reboot;
- DND/Focus;
- battery saver;
- permission denied;
- permission revoked;
- timezone change.

## 10. Timezone tests

At least:
- Europe/Bucharest DST;
- UTC;
- Asia/Tokyo no DST;
- America/New_York DST;
- crossing date line;
- spring forward missing local time;
- fall back duplicate local time.

## 11. Boundary cases

- 00:00;
- 23:59;
- event crosses midnight;
- plan starts today;
- plan ends today;
- leap day;
- daylight saving;
- monthly boundary;
- year boundary.

## 12. UI tests

Critical automated flows:

1. create plan;
2. add medication;
3. define meal-relative rule;
4. activate;
5. log Taken;
6. see recalculation;
7. open explanation;
8. edit actual time;
9. skip;
10. view conflict.

## 13. Accessibility QA

- large font sizes;
- screen readers;
- reduced motion;
- contrast;
- switch control;
- keyboard where applicable;
- RTL future readiness.

## 14. Localization QA

Time formats:
- 24h;
- 12h.

Pluralization:
- 1 minute / 2 minutes.

Medication names should not be transformed by localization.

## 15. Performance

Benchmark scheduler with:
- 10 events;
- 50 events;
- 200 events;
- pathological constraint graph.

Target typical calculation <100ms.

## 16. Fuzzing

Generate random valid graphs and check:
- no crash;
- deterministic;
- hard-constraint invariant;
- conflict returned instead of invalid output.

## 17. Release test gate

Release candidate cannot ship if:
- any Sev-1 scheduling defect open;
- notification duplicate bug open;
- data migration loses history;
- schedule conflict can be silently ignored;
- permission state misrepresented.

## 18. Bug severity

### Sev 0
Cosmetic.

### Sev 1
Functional non-schedule issue.

### Sev 2
Incorrect schedule display or history.

### Sev 3
Incorrect/missing/duplicate reminder.

### Sev 4
Potential harmful behavior violating configured treatment instruction.

Severity naming can be adjusted; separation is what matters.

## 19. Dogfood protocol

For initial real treatment:
- compare first 7 days with manual calculation;
- log every discrepancy;
- save schedule revision;
- classify issue;
- no “I know what the app meant” exceptions.

Trust must be earned through boring correctness.

## 20. Toolchain and file mapping

Concrete tooling for the tests described in §2–§16, given the Capacitor +
Svelte + TypeScript stack (`DECISIONS.md`, `08_ENGINEERING_ARCHITECTURE.md`):

- **Level 1 (scheduler unit tests):** Vitest. File:
  `src/scheduler/__tests__/schedule.spec.ts`. This is where the T1–T7
  cases from `06_SCHEDULING_ENGINE_SPEC.md` §23 and the SCH-001..006 cases
  from §4 of this document live — they are the same test set described
  twice at different levels of the doc set, not two separate suites.
- **Level 1 (property-based tests, §5):** Vitest + `fast-check`. File:
  `src/scheduler/__tests__/properties.spec.ts`.
- **Level 2 (domain/application integration):** Vitest, running against a
  real in-memory/temp-file SQLite instance via
  `@capacitor-community/sqlite`'s Node/Electron test mode (not a mock) —
  per this project's existing preference for integration tests to hit a
  real database. File: `src/database/__tests__/*.spec.ts`.
- **Level 3 (notification integration):** cannot be fully automated —
  `@capacitor/local-notifications` requires a real device/OS. Cover what's
  automatable (the diff algorithm in `09_NOTIFICATIONS_AND_BACKGROUND.md`
  §4, in isolation from the OS calls) with Vitest at
  `src/notifications/__tests__/planner.spec.ts`; the rest is the manual
  device matrix in §9/§17 of this document and §17 of
  `09_NOTIFICATIONS_AND_BACKGROUND.md`.
- **Level 4 (UI tests):** Vitest + `@testing-library/svelte`, one test
  file per screen component under `src/screens/__tests__/`.
- **Level 5 (manual device matrix):** unchanged — see §17.

Automated end-to-end testing (driving the real Capacitor app on a device
or emulator) is deferred past Phase A; the manual device matrix covers
this gap until it's worth the setup cost.
