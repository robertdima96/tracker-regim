# Personas, Jobs-to-be-Done & Use Cases

## 1. Persona philosophy

Personas should represent **behavior and treatment complexity**, not cosmetic demographics.

Poor persona:

> “Alex, 34, likes Netflix and coffee.”

Useful persona:

> “A user with a 12-week treatment, nine administrations per day, two meal-dependent rules, and variable breakfast time.”

## 2. Primary Persona — Complex Temporary Treatment

### Profile

- treatment duration: 1 week–6 months;
- 2–6 medications/supplements;
- multiple daily doses;
- at least one medication tied to food;
- schedule is unfamiliar and cognitively expensive.

### Current behavior

May use:

- phone alarms;
- Notes;
- calculator;
- medication packaging;
- paper;
- spouse/family reminders.

### Pain points

- forgets which event should happen first;
- must repeatedly calculate offsets;
- delaying one medication makes future times unclear;
- does not know whether meal must move;
- alarms continue to fire at stale times;
- unclear history of what was actually taken.

### Primary JTBD

> When I have several treatment instructions that depend on each other, help me translate them into today’s sequence so I can follow my treatment without doing timing calculations all day.

### Success

The user checks the app and acts without doing parallel math.

## 3. Persona — Chronic Complex Treatment

### Profile

- treatment duration: months/years;
- multiple recurring medications;
- may already have strong routines;
- mistakes compound over time.

### Needs

- long-term reliability;
- refill tracking;
- stable history;
- recurring/cyclic schedules;
- travel mode;
- exports;
- device migration;
- accessibility.

### Risk

This user may have clinically sensitive medication where app behavior has higher consequence. Safety and scope control become critical.

## 4. Persona — Irregular Routine User

### Profile

- shift work, variable wake time, or frequent travel;
- meal times change;
- “08:00 every day” is not a meaningful routine.

### Key requirement

Anchor events to:

- wake;
- meal;
- bedtime;
- last actual dose;

rather than only a wall-clock time.

### Primary JTBD

> When my day starts at a different time, rebuild the treatment schedule around my real day without making me edit every alarm.

## 5. Persona — Caregiver

### Profile

- manages another person’s medication;
- may not be physically present;
- needs enough information to help, but not necessarily full medical access.

### Jobs

- see if important dose was logged;
- receive escalation if configured;
- help update schedule;
- distinguish “not logged” from “missed”;
- avoid duplicate administration.

### Future permission model

Potential scopes:

- read schedule;
- receive missed event alerts;
- mark event as administered;
- edit plan;
- view history;
- view medication details.

Do not implement all scopes in MVP.

## 6. Persona — Protocol/Cycle User

Examples:

- changing frequency each week;
- 21 days on / 7 days off;
- staged treatment;
- tapering.

### Need

A schedule is not a repeated static day. It is a **program over time**.

This persona is important for architecture even if not supported at launch.

## 7. Anti-personas

### Anti-persona A — “I just need one alarm”

Single medication, same fixed time every day.

Existing reminders are probably sufficient.

DoseFlow can serve this user eventually but should not be designed around them.

### Anti-persona B — user seeking medical advice

> “Tell me how many pills I should take.”

Not the product.

### Anti-persona C — emergency medication management

If an administration requires guaranteed emergency-grade alerting or monitoring, a consumer reminder app may not be appropriate.

## 8. Jobs-to-be-Done inventory

### Functional jobs

1. Tell me what to do next.
2. Tell me the valid time window.
3. Tell me when I can eat.
4. Tell me what I must do before a desired meal.
5. Recalculate after a late event.
6. Keep the original and revised schedule understandable.
7. Record actual administration.
8. Show what was skipped.
9. Surface schedule conflicts.
10. Explain why a time exists.
11. Preserve doctor-specific instructions.
12. Handle temporary treatment start/end.
13. Handle changing wake/meal/sleep times.
14. Export what happened.
15. Later: let a caregiver see relevant status.

### Emotional jobs

1. Reduce cognitive load.
2. Reduce fear of “messing up the timetable”.
3. Reduce dependence on memory.
4. Provide confidence that the app is following the configured instruction.
5. Avoid judgmental adherence messaging.

### Social jobs

1. Show a clinician a clear history.
2. Coordinate with a caregiver.
3. Avoid repeated “Did you take it?” conversations.

## 9. Core use cases

### UC-01 — plan around a meal

Given:

- A = 60 min before breakfast;
- B = 20–30 min before breakfast;
- breakfast preferred 09:00.

Output:

- A = 08:00;
- B = 08:30–08:40;
- breakfast = 09:00.

### UC-02 — actual dose is late

A planned at 08:00 is actually taken at 08:17.

Expected:

- actual history logs 08:17;
- breakfast earliest becomes 09:17;
- B’s derived window moves;
- stale notifications are replaced;
- UI explains the change.

### UC-03 — user wants to eat later

User sets dinner from 19:00 to 20:30.

Expected:

- dinner-linked medication moves;
- unrelated medication does not move;
- changed events are visually marked.

### UC-04 — user asks “When can I eat?”

System evaluates all active constraints that block meal start.

Expected answer:

- earliest valid meal time;
- pending required events;
- explanation.

### UC-05 — user asks “I want to eat at 14:00”

System reverse-schedules necessary pre-meal events.

If impossible, show conflict.

### UC-06 — every-X-hours from actual dose

Configured:

- next dose minimum 6h after prior dose.

Actual:

- prior dose at 10:13.

Derived:

- earliest next dose = 16:13.

### UC-07 — missed dose

User marks a dose skipped.

Expected:

- record skip;
- do not invent a recovery schedule unless explicit user-entered instructions define one;
- identify downstream constraints that can no longer be resolved;
- show appropriate non-clinical guidance.

### UC-08 — treatment starts mid-day

Plan starts at 17:00.

The system must not assume morning doses were missed if they did not exist before activation.

### UC-09 — user edits actual time

User initially logs dose at 13:00, then corrects it to 12:52.

Expected:

- audit history;
- deterministic recalculation;
- notifications updated;
- no duplicated dose.

## 10. Journey — first day

1. Install.
2. Understand value in <30 seconds.
3. Create treatment.
4. Add first medication.
5. Choose instruction source.
6. Define timing rule.
7. Add remaining medications.
8. Define meal windows.
9. Review generated schedule.
10. Confirm.
11. Receive first reminder.
12. Log dose.
13. Observe schedule adaptation.
14. End day with clear history.

Key activation moment:

> The user experiences the first useful recalculation.

## 11. Research segmentation

For beta recruitment, intentionally include:

- fixed-time users;
- meal-relative users;
- every-X-hour users;
- shift workers;
- temporary treatment;
- chronic treatment;
- caregivers;
- users with 6+ daily administrations.

The objective is to learn which segment gets disproportionate value from dynamic scheduling.
