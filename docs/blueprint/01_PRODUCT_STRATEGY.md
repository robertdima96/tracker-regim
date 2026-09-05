# Product Strategy

## 1. Vision

Medication adherence software typically optimizes for remembering a fixed event:

> “Take this pill at 08:00.”

The strategic hypothesis behind DoseFlow is that a meaningful segment of users has a different problem:

> “I know I need to take my medication. I do not know how to correctly fit several timing rules, meals, delays, and daily life together.”

The long-term vision is a **treatment execution layer**: a user provides treatment instructions and daily preferences; the system turns them into an understandable schedule, keeps it current, and records what actually happened.

The product should be especially valuable when treatments contain:

- medication before meals;
- medication after meals;
- minimum or maximum spacing;
- repeated administrations;
- changing wake/sleep times;
- temporary multi-drug treatment plans;
- cyclic plans;
- caregiver coordination;
- real-world delays.

## 2. Product category

Avoid competing as only a “pill reminder”.

Preferred category language:

- dynamic treatment scheduler;
- treatment planner;
- medication schedule assistant;
- adaptive medication and meal planner.

Possible app-store subtitle:

> Medication schedules that adapt to your day.

## 3. Value proposition

### Functional value

- remove manual time calculations;
- show the next action;
- update dependent events after a delay;
- maintain a clear treatment timeline;
- expose conflicts;
- preserve history;
- make medication timing around meals easier to execute.

### Emotional value

The user should feel:

- “I know what happens next.”
- “I do not have to keep the whole plan in my head.”
- “I can see why the app chose this time.”
- “If I am late, I can immediately understand what changed.”

Avoid messaging that implies:

- certainty about clinical safety;
- treatment optimization;
- diagnosis;
- individualized medical decision-making.

## 4. Strategic wedge

Many existing products already support reminders, logs, refill tracking, caregivers, health measurements, and some meal-aware scheduling.

Therefore the wedge cannot merely be:

> “A medication reminder that knows about meals.”

The stronger wedge is:

> **A generic constraint-based schedule where medication, meals, sleep, wake-up, and other treatment events can depend on each other, and the schedule is recalculated from actual events.**

This creates product behaviors such as:

- “When can I eat?”
- “I want to eat at 19:30.”
- “I took this 27 minutes late.”
- “What changed because of that?”
- “Can all of today’s configured rules still fit?”
- “Why is this medication scheduled at 13:10?”

## 5. Strategic principles

### 5.1 Prescription first

The app should distinguish:

- user-entered doctor instructions;
- manufacturer/reference information;
- app-calculated schedule.

The schedule follows the treatment instructions selected by the user.

### 5.2 Rules > timestamps

A timestamp is an output when a rule exists.

Example:

Bad primary representation:

`Drug B = 08:30`

Better:

`Drug B = 20–30 minutes before breakfast`

Calculated today:

`08:42–08:52`

### 5.3 Actual > planned

History should preserve both:

- planned time/window;
- actual administration/event time.

The actual event may become the anchor for downstream calculations.

### 5.4 Explainability is a feature

Every derived time needs an explanation path.

Example:

> Breakfast earliest: 09:17  
> Because: Drug A was logged at 08:17 and your rule requires 60 minutes before breakfast.

### 5.5 Conflict rather than invention

If configured constraints cannot all be satisfied, the engine must not silently choose one to violate.

It should instead:

- identify the smallest relevant conflict set;
- show it simply;
- ask the user to review the treatment instructions or timing preferences;
- avoid medical recommendations.

## 6. Product boundaries

### In scope

- organizing a treatment plan;
- reminding;
- logging;
- recalculating user-configured timing relationships;
- explaining schedule derivation;
- identifying configuration conflicts;
- exporting history.

### Out of scope for initial product

- recommending a drug;
- recommending a dose;
- changing prescribed frequency;
- deciding how to recover a missed dose;
- checking drug-drug interactions as a clinical decision tool;
- diagnosing conditions;
- predicting treatment outcomes;
- advising that a constraint can safely be ignored.

## 7. Product goals

### G1 — reduce medication math

A complex-plan user should rarely need to manually calculate:

- “60 minutes from now”;
- “30 minutes before that meal”;
- “six hours after the actual dose”.

### G2 — improve treatment clarity

At any point, the Today screen should answer:

1. What should I do next?
2. When?
3. What can I do after that?
4. Why?
5. Has anything changed?

### G3 — make delays manageable

A late event should be captured in one action and translated into a revised schedule.

### G4 — earn trust

Correctness, deterministic behavior, transparent explanations, and reliable notifications are more important than a broad feature list.

## 8. Non-goals

DoseFlow should not initially become:

- calorie tracker;
- symptom diary;
- generic wellness app;
- social network;
- medication encyclopedia;
- telemedicine service;
- pharmacy marketplace;
- AI medical assistant.

Each additional category dilutes the core and increases regulatory/safety complexity.

## 9. Moat hypotheses

The initial product does not have a durable moat merely because it has a scheduler. Potential longer-term defensibility:

1. **Rule-engine quality** — large, well-tested corpus of real schedule patterns.
2. **UX for complex treatment rules** — hard to copy well because configuration must remain understandable.
3. **Trust** — a long history of reliable schedule behavior.
4. **Structured treatment-plan model** — reusable across caregiver, clinician-sharing, travel, and cycles.
5. **Anonymized product insight** — only if legally/privacy appropriate, derived from schedule friction patterns rather than personal medical data.
6. **Clinician/pharmacist workflow integration** — later stage, not an MVP moat.

## 10. Biggest strategic risks

### Risk A — users do not want a generic rule engine

They may prefer a simpler fixed reminder even when it requires manual calculation.

**Test:** usability research and retention among complex-plan users.

### Risk B — configuration is more work than the value received

The app may solve scheduling after asking the user to complete a painful 15-minute setup.

**Mitigation:** progressive disclosure, templates, duplication, natural-language helper later.

### Risk C — schedule correctness becomes a safety liability

A mathematically correct interpretation can still be based on incorrect user-entered instructions.

**Mitigation:** explain source, confirmation, audit trail, no hidden clinical assumptions.

### Risk D — OS notification restrictions reduce reliability

Especially Android exact alarms and iOS critical-alert restrictions.

**Mitigation:** native scheduling, permission health checks, fallback behavior, reminder reliability testing.

### Risk E — category becomes crowded

Meal-aware competitors already exist.

**Mitigation:** focus messaging and product around dependency-aware dynamic treatment planning, not meal reminders alone.

## 11. Product success definition

A strong early signal is not downloads. It is behavior such as:

> A user with a complex treatment stops maintaining a parallel calculator/alarm/note workflow and relies on DoseFlow’s Today timeline for several weeks.

That should be the standard for deciding whether to invest beyond the personal MVP.

## 12. Technical direction

Phase A's platform, storage, and UI stack are decided and recorded in
`DECISIONS.md` — Capacitor + Svelte + TypeScript + SQLite. These are
build-mechanism choices; they do not change the product vision, principles,
or boundaries described above. Whether DoseFlow becomes a personal tool or
a shippable product is deliberately still open — see `DECISIONS.md`.
