# PRD — MVP

## 1. Product

**Working name:** DoseFlow  
**Release:** MVP / Personal Alpha → Closed Beta  
**Primary platform goal:** iOS + Android mobile application  
**Core mode:** offline-first, account optional/not required

## 2. Problem statement

Users with multiple treatment timing rules often must manually coordinate medication, meals, and actual administration times. Conventional fixed alarms become stale when the day changes.

The MVP must prove that a dynamic schedule is more useful than a set of alarms.

## 3. MVP objective

After setup, a user should be able to open Today and answer:

- What do I do next?
- What is the valid time/window?
- When can I eat?
- What changed after a delay?
- Why is the app showing this time?

## 4. Success criteria

### Product
- treatment plan can be configured without developer intervention;
- common meal-relative rules work;
- schedule recalculates deterministically;
- no silent constraint violations;
- history preserves planned and actual events.

### Dogfooding
- real user uses it for at least 14 consecutive treatment days;
- parallel manual calculation is materially reduced.

### Closed beta
Candidate thresholds, not promises:
- >60% onboarding completion among invited relevant users;
- >50% create at least one dependency rule;
- >30% use a dynamic recalculation in first week;
- no unresolved severity-1 schedule defects.

## 5. In scope

### 5.1 Treatment Plan

Fields:
- name;
- start date;
- optional end date;
- status: draft / active / paused / completed;
- timezone mode;
- notes.

Actions:
- create;
- edit;
- activate;
- pause;
- complete;
- duplicate.

### 5.2 Medication

Fields:
- display name;
- optional strength;
- dose amount + unit;
- form;
- optional notes;
- plan membership;
- start/end;
- frequency/rule set;
- instruction source.

Instruction source:
- Doctor / clinician;
- Pharmacist;
- Package / reference;
- My own routine;
- Other.

This source is informational and must not imply verification.

### 5.3 Rule primitives

MVP must support:

1. exact wall-clock time;
2. time window;
3. X minutes/hours before a meal;
4. X minutes/hours after a meal;
5. during/with meal;
6. X minutes/hours after wake-up;
7. X minutes/hours before bedtime;
8. every X hours;
9. minimum X hours between administrations;
10. custom note.

Optional MVP if complexity permits:
- range offset: e.g. 20–30 minutes before meal;
- preferred vs hard constraint distinction.

### 5.4 Meal events

Built-in:
- breakfast;
- lunch;
- dinner.

Custom:
- snack;
- custom named meal/event.

Properties:
- preferred time/window;
- fixed vs flexible;
- optional actual time.

### 5.5 Today timeline

Required:
- current time marker;
- next action card;
- upcoming events;
- completed events;
- late state;
- skipped state;
- changed/recalculated indicator;
- earliest meal answer where relevant.

### 5.6 Administration actions

Actions:
- Taken now;
- Taken at…;
- Snooze;
- Skip;
- Undo / correct.

`Taken now`:
- logs actual time;
- triggers recomputation;
- reschedules affected notifications.

### 5.7 Schedule explanation

Every derived event needs:
- direct source rule;
- anchor event;
- relevant actual/planned time;
- calculation summary.

Example:

> 09:17 breakfast  
> Drug A was taken at 08:17. Your configured rule requires 60 minutes before breakfast.

### 5.8 Conflict detection

Must detect at least:
- impossible ordering;
- empty time window;
- incompatible hard constraints;
- dependency cycle if unsupported.

Must not auto-resolve by violating a hard treatment rule.

### 5.9 Notifications

Required:
- local scheduled reminders;
- action deep link;
- permission health state;
- reschedule after plan changes;
- reboot/relaunch recovery strategy on Android;
- no backend required for basic reminders.

### 5.10 History

Per event:
- planned time/window;
- actual time;
- status;
- revision that generated it;
- optional change reason.

Daily history:
- completed;
- skipped;
- late;
- schedule revisions.

## 6. Out of scope

- interaction checker;
- contraindication engine;
- AI treatment advice;
- prescription OCR;
- medication barcode scan;
- smartwatch;
- clinician portal;
- caregiver sync;
- insurance;
- pharmacy integration;
- symptom tracking;
- vitals;
- gamification;
- complex refill;
- advanced tapering/cycles;
- web dashboard.

## 7. Functional requirements

### FR-001 Create plan
User can create a treatment plan and save as draft.

### FR-002 Add medication
User can add medication without requiring a medication database match.

### FR-003 Configure rule
User can create at least one schedule rule per administration pattern.

### FR-004 Generate schedule
App generates current-day events deterministically.

### FR-005 Log actual time
User can mark a dose taken now or edit actual time.

### FR-006 Propagate
Affected dependent events update.

### FR-007 Isolate
Unrelated events do not move.

### FR-008 Explain
Every derived change can be explained.

### FR-009 Conflict
If constraints cannot be satisfied, user sees conflict before activation or as soon as it occurs.

### FR-010 Persist locally
Core plan, schedule, and history survive app restart.

### FR-011 Notify
App schedules valid local reminders.

### FR-012 Replace stale reminders
Affected reminders are cancelled and recreated after recalculation.

### FR-013 Skip safely
Skip records the event; app does not invent missed-dose medical instructions.

### FR-014 Timezone
Current local timezone change is detected and user is informed if the plan meaning may change.

## 8. Non-functional requirements

### Reliability
- deterministic rule evaluation;
- idempotent schedule generation;
- no duplicate notification for same schedule event;
- restart-safe local persistence.

### Performance
- Today screen cold load target <2s on mid-range device;
- schedule recalculation target <100ms for typical plan;
- conflict explanation target <500ms.

### Privacy
- local-first;
- no account required for initial release;
- analytics avoid medication names by default.

### Accessibility
- dynamic text;
- screen-reader labels;
- high contrast;
- tap targets >= recommended platform sizes;
- no critical meaning encoded only by color.

## 9. User stories

### US-01
As a user, I want to define “60 min before breakfast” so I do not need to choose a fake fixed time.

**Acceptance:**
- can select breakfast;
- can enter 60 minutes;
- generated event changes if breakfast changes.

### US-02
As a user, I want to log the real administration time so later times are accurate.

**Acceptance:**
- “Taken now” stores device time;
- history retains original plan;
- dependent events recalculate.

### US-03
As a user, I want to know when I can eat.

**Acceptance:**
- system evaluates active meal-blocking rules;
- answer shows earliest time;
- explanation identifies constraints.

### US-04
As a user, I want to choose a desired meal time and see what I need to do beforehand.

**Acceptance:**
- reverse schedule generates pre-meal events;
- conflict shown if impossible.

### US-05
As a user, I want to see when the schedule changed.

**Acceptance:**
- changed events have a visible marker;
- old value accessible in details/history.

## 10. MVP screen list

1. Welcome / value proposition
2. Create Treatment Plan
3. Medication list
4. Add/Edit Medication
5. Rule Builder
6. Meal & Routine Setup
7. Plan Review
8. Today
9. Event Detail
10. Log Administration
11. Conflict Detail
12. History
13. Settings / Notification Health

## 11. Release blockers

Do not release public beta if:

- schedule engine can silently violate hard constraints;
- reminders duplicate after reboot;
- changing actual time produces inconsistent history;
- timezone logic is undefined;
- Skip causes unvalidated clinical recovery behavior;
- analytics captures raw medication names without explicit design review;
- permission-denied state causes user to believe reminders are active.

## 12. MVP “done” definition

The MVP is done when a new user can configure a real multi-medication, meal-dependent plan and use the generated Today schedule for at least two weeks without manual developer fixes.
