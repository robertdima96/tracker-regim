# Engineering Architecture

## 1. Architecture goals

- reliable local execution;
- deterministic scheduling;
- testable domain logic;
- cross-platform UI;
- native-quality notifications;
- privacy-first;
- optional cloud later;
- maintainable by a small team / solo developer.

## 2. Recommended MVP stack

### App
**React Native + TypeScript**

Why:
- shared iOS/Android product code;
- TypeScript scheduling package can be reused;
- large ecosystem;
- native modules available when required.

Expo can be used with prebuild/custom native modules rather than assuming a fully managed environment.

### Local database
**SQLite**

Candidate access layer:
- Drizzle;
- Expo SQLite;
- another typed SQLite layer.

### State
Separate:
- persisted domain state;
- UI state;
- derived schedule state.

Avoid putting the scheduling domain into global UI stores.

## 3. Monorepo structure

```text
/apps
  /mobile

/packages
  /domain
  /scheduler
  /notifications
  /database
  /analytics
  /ui
  /test-fixtures
```

## 4. Layering

```text
UI
 ↓
Application services
 ↓
Domain model
 ↓
Scheduler
 ↓
Repositories
 ↓
SQLite
```

Notifications consume schedule outputs but should not contain scheduling logic.

## 5. Scheduler package

Requirements:
- pure TypeScript;
- no React;
- no SQLite;
- no OS APIs;
- deterministic;
- exhaustive tests.

Signature concept:

```ts
calculateSchedule({
  plan,
  date,
  timezone,
  actualEvents,
  preferences,
  previousSchedule
}) => {
  events,
  conflicts,
  explanations,
  diff
}
```

## 6. Application services

Examples:
- `CreateTreatmentPlan`
- `ActivatePlan`
- `LogAdministration`
- `EditActualTime`
- `MoveMeal`
- `RecalculateDay`
- `RescheduleNotifications`

These orchestrate domain + persistence + OS integration.

## 7. Event flow

### Taken now

```text
UI
 ↓
LogAdministration
 ↓
Persist administration event
 ↓
Scheduler recalculation
 ↓
Persist schedule revision
 ↓
Diff old/new schedule
 ↓
Notification planner
 ↓
Cancel stale notifications
 ↓
Schedule new notifications
 ↓
Render Today
```

The DB write should happen before relying on OS notification changes.

## 8. Offline-first rule

The app should work for core treatment execution with:
- no login;
- airplane mode;
- backend outage.

Core local features:
- plan setup;
- schedule generation;
- notifications;
- logging;
- history;
- explanations.

## 9. Backend — later

Possible choice:
**Supabase / Postgres**

Use only when required for:
- optional account;
- cloud backup;
- multi-device;
- caregiver;
- subscription metadata;
- remote configuration.

Avoid making backend the scheduler authority in consumer MVP; reminders must not depend on round trips.

## 10. Sync architecture — future

Potential model:

- local DB authoritative for immediate interaction;
- encrypted sync log;
- server stores encrypted records where feasible;
- merge based on version/event log.

Hard case:
Two devices log the same dose differently.

Need:
- conflict state;
- audit;
- user resolution.

## 11. Security

### At rest
Investigate:
- OS file protection;
- encrypted SQLite / field encryption where justified;
- secure keystore/keychain for keys.

### In transit
TLS.

### Secrets
No API secret embedded in client if it grants privileged access.

### Logs
Never log raw medication names or free-text health notes in production diagnostic logs by default.

## 12. Authentication

MVP:
No account.

Later:
- Sign in with Apple;
- Google;
- passkey/email;
- account recovery.

Accountless mode should remain viable if business model allows.

## 13. Analytics abstraction

Create interface:

```ts
interface Analytics {
  track(name: ProductEvent, props: SafeProperties): void
}
```

Define an allowlist of properties.

Do not allow arbitrary object dumping.

## 14. Feature flags

Useful later for:
- new rule types;
- beta solver;
- new notification strategy;
- caregiver.

Flags must not result in two incompatible schedule interpretations without engine-version tracking.

## 15. Engine versioning

Every schedule revision stores:
- engine version.

If a future algorithm changes:
- old history remains interpretable;
- debugging can reproduce behavior.

## 16. Observability

MVP:
- crash reporting;
- local debug export;
- schedule issue report;
- notification diagnostic screen.

Schedule report package can contain:
- app version;
- OS;
- timezone;
- sanitized rule graph;
- event IDs;
- revision history;
- notification state.

User must consent before sending sensitive content.

## 17. Notification health module

Expose:
- permission status;
- exact-alarm capability on Android where relevant;
- scheduled notification count;
- next expected reminder;
- last scheduling error.

User-facing:

> Reminders are ready.

or:

> Precise reminders are not currently permitted on this device.

## 18. Background behavior

Do not assume background JS is continuously running.

Instead:
- calculate ahead;
- schedule native local notifications;
- recover/reschedule when app launches;
- handle platform reboot/time-change hooks as needed.

## 19. Dependency policy

For a safety-adjacent app:
- pin major versions;
- review notification libraries;
- minimize abandoned native packages;
- maintain integration tests after OS upgrades.

## 20. CI/CD

### On pull request
- lint;
- typecheck;
- scheduler unit tests;
- DB migration tests;
- app unit tests.

### Main
- build development artifacts;
- integration smoke tests.

### Release candidate
- physical device matrix;
- notification tests;
- timezone tests;
- upgrade/migration tests.

## 21. Environments

- development;
- internal alpha;
- beta;
- production.

If backend exists:
- separate projects/keys/db.

## 22. Architecture decision records

Maintain `/docs/adr`.

Examples:
- ADR-001 React Native
- ADR-002 SQLite local source of truth
- ADR-003 No account in MVP
- ADR-004 Hard constraints never auto-violated
- ADR-005 Scheduler as pure package

## 23. Engineering principles

1. Correctness before cleverness.
2. Scheduler code is pure whenever possible.
3. OS notification behavior is integration-tested.
4. History is auditable.
5. Data migrations are treated as high risk.
6. Never put clinical logic in UI copy.
