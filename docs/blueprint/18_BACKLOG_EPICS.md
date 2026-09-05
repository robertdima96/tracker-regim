# MVP Backlog & Engineering Epics

Priority legend:
- **P0** required for personal alpha;
- **P1** required for closed beta;
- **P2** desirable after core validation.

## EPIC 1 — Domain Foundation [P0]

### DF-001
Define TreatmentPlan entity.

### DF-002
Define Medication entity.

### DF-003
Define EventTemplate.

### DF-004
Define Constraint types.

### DF-005
Define DailyEvent.

### DF-006
Define AdministrationRecord.

### DF-007
Define ScheduleRevision.

### DF-008
Implement ID generation and timestamps.

### Acceptance
Domain package compiles without UI/database imports.

---

## EPIC 2 — Local Persistence [P0]

### DB-001
SQLite initialization.

### DB-002
Schema migration framework.

### DB-003
Plan repository.

### DB-004
Medication repository.

### DB-005
Constraint repository.

### DB-006
History repository.

### DB-007
Transactional administration write.

### DB-008
Migration regression tests.

---

## EPIC 3 — Scheduler V0 [P0]

### SCH-001
Exact-time event.

### SCH-002
Fixed time window.

### SCH-003
Before-meal exact offset.

### SCH-004
Before-meal offset range.

### SCH-005
After-meal.

### SCH-006
Minimum spacing.

### SCH-007
Every-X actual-relative.

### SCH-008
Wake anchor.

### SCH-009
Bedtime anchor.

### SCH-010
Hard/preference separation.

### SCH-011
Conflict: empty window.

### SCH-012
Dependency isolation.

### SCH-013
Schedule diff.

### SCH-014
Explanation output.

### SCH-015
Engine version.

### SCH-016
100+ unit/regression tests before beta.

---

## EPIC 4 — Treatment Setup [P0]

### UX-001
Create plan.

### UX-002
Add medication.

### UX-003
Medication dose/strength optional fields.

### UX-004
Instruction source selector.

### UX-005
Rule Builder basic.

### UX-006
Rule preview.

### UX-007
Meals setup.

### UX-008
Plan review.

### UX-009
Activate.

---

## EPIC 5 — Today Timeline [P0]

### TD-001
Next action card.

### TD-002
Timeline.

### TD-003
Current time marker.

### TD-004
Taken state.

### TD-005
Skipped state.

### TD-006
Late state.

### TD-007
Changed state.

### TD-008
Earliest meal card.

### TD-009
“Why?” explanation.

---

## EPIC 6 — Administration [P0]

### ADM-001
Taken now.

### ADM-002
Taken at custom time.

### ADM-003
Correct actual time.

### ADM-004
Undo.

### ADM-005
Skip.

### ADM-006
Snooze state.

### ADM-007
Trigger scheduler revision.

### ADM-008
Diff display after change.

---

## EPIC 7 — Notifications [P0/P1]

### NTF-001 [P0]
Notification permission.

### NTF-002 [P0]
Schedule local reminder.

### NTF-003 [P0]
Cancel reminder.

### NTF-004 [P0]
Reconcile desired vs scheduled.

### NTF-005 [P0]
Deep link.

### NTF-006 [P1]
Taken action from notification.

### NTF-007 [P1]
Android reboot recovery.

### NTF-008 [P1]
Exact alarm capability.

### NTF-009 [P1]
Notification health screen.

### NTF-010 [P1]
Permission-revoked warning.

---

## EPIC 8 — “When can I eat?” [P0]

### EAT-001
Evaluate blockers for meal.

### EAT-002
Return earliest valid meal.

### EAT-003
List required pre-meal events.

### EAT-004
Explain result.

### EAT-005
No-blocker state.

---

## EPIC 9 — Reverse Scheduling [P1]

### REV-001
Select desired meal.

### REV-002
Set desired time.

### REV-003
Calculate prerequisite events.

### REV-004
Preview.

### REV-005
Apply today only.

### REV-006
Conflict state.

---

## EPIC 10 — Conflicts [P0]

### CON-001
Conflict data type.

### CON-002
Minimal relevant constraints.

### CON-003
Conflict card.

### CON-004
Conflict details.

### CON-005
Block plan activation for fatal conflict.

### CON-006
Runtime conflict handling.

---

## EPIC 11 — History [P0]

### HIS-001
Daily list.

### HIS-002
Planned/current/actual.

### HIS-003
Revision marker.

### HIS-004
Edit historical actual.

### HIS-005
Audit of correction.

---

## EPIC 12 — Time & Timezone [P1]

### TIM-001
IANA timezone storage.

### TIM-002
Local date utility.

### TIM-003
DST tests.

### TIM-004
Timezone-change detection.

### TIM-005
Plan timezone policy.

### TIM-006
User warning.

---

## EPIC 13 — Privacy [P0/P1]

### PRI-001 [P0]
No account core mode.

### PRI-002 [P0]
Analytics allowlist.

### PRI-003 [P0]
No raw medication name analytics.

### PRI-004 [P1]
Privacy notification mode.

### PRI-005 [P1]
Delete all local data.

### PRI-006 [P1]
Local export.

---

## EPIC 14 — Diagnostics & Support [P1]

### SUP-001
Report scheduling issue.

### SUP-002
Sanitized diagnostic bundle.

### SUP-003
App/OS/engine metadata.

### SUP-004
Notification diagnostics.

### SUP-005
Safety flag in ticket.

---

## EPIC 15 — Analytics [P1]

### ANA-001
Safe analytics interface.

### ANA-002
Activation funnel.

### ANA-003
Recalculation event.

### ANA-004
Conflict event.

### ANA-005
Notification failure.

### ANA-006
No session replay on health screens.

---

## EPIC 16 — QA Automation [P0/P1]

### QA-001 [P0]
Scheduler unit suite.

### QA-002 [P0]
Property-based tests.

### QA-003 [P0]
Golden fixture framework.

### QA-004 [P1]
DB migration tests.

### QA-005 [P1]
UI critical flows.

### QA-006 [P1]
Physical notification matrix.

---

## Suggested first 3 implementation sprints

### Sprint 1
- domain;
- DB;
- basic rule model;
- exact + meal rules;
- fixtures.

### Sprint 2
- setup UI;
- plan review;
- Today timeline;
- initial recalculation.

### Sprint 3
- administration actions;
- explanations;
- notifications;
- history.

Then dogfood before expanding feature scope.
