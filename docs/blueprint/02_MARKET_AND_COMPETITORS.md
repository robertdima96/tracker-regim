# Market & Competitor Landscape

**Research date:** 2026-09-04

## 1. Market hypothesis

The broad medication-reminder market is already validated. Large products have millions of users, and newer products continue to attract users by improving adherence, reminders, privacy, caregiver support, and meal-aware scheduling.

The opportunity is therefore not “prove people want pill reminders.”

The useful question is:

> Is there a sufficiently large and painful subproblem around **complex, dependency-based treatment schedules** that users will prefer a purpose-built scheduler over conventional alarms?

## 2. Evidence of an established category

### Medisafe

Medisafe publicly states:

- 13M+ patients on the platform;
- users across 190+ countries;
- partnerships with major pharmaceutical companies.

This demonstrates substantial demand for medication adherence tools, but does not by itself validate DoseFlow’s specific dynamic-scheduling wedge.

### Pillo

Google Play currently shows:

- 500K+ downloads;
- ~19K reviews;
- persistent medication alarms;
- dose history;
- refill tracking;
- caregiver alerts;
- meal status checking;
- snooze until after a meal;
- flexible schedules;
- tapering;
- health tracking.

This is important because it proves that “more than a basic reminder” is already expected by sophisticated users.

### Doz

Doz is strategically the most relevant visible competitor because its public positioning includes:

- meal-linked doses;
- moving a meal moves its linked medication;
- cycles;
- time-zone handling;
- refill reminders;
- offline operation;
- iCloud sync;
- Critical Alerts on iOS.

This eliminates “meal-linked reminders” as a sufficiently unique product claim.

## 3. Competitive frame

| Capability | Traditional reminder | Medisafe/Pillo class | Doz | DoseFlow target |
|---|---:|---:|---:|---:|
| Fixed-time reminder | Yes | Yes | Yes | Yes |
| Dose history | Basic | Strong | Yes | Yes |
| Refill | Sometimes | Yes | Yes | Later |
| Caregiver | Limited | Strong | Limited/varies | Later |
| Meal-linked dose | Rare | Some support | Strong | Strong |
| Move meal → move dose | Rare | Limited | Yes | Yes |
| Actual dose → recalc downstream | Rare | Limited | Partial/unknown | Core |
| Arbitrary event dependencies | No | Limited | Limited | Core |
| Min/max spacing constraints | Limited | Some | Some | Core |
| Conflict detection | Rare | Rare | Unknown | Core |
| “When can I eat?” derived from current state | Rare | Limited | Partial | Core |
| Reverse schedule from desired meal | Rare | Limited | Partial | Core |
| Explain derived time | Rare | Limited | Limited | Core |
| Doctor instructions as explicit override source | Mixed | Mixed | Mixed | Core |
| Offline-first | Varies | Varies | Yes | Core |

The table is a **product research model**, not a claim that every competitor lacks every advanced behavior. Each individual feature must be re-verified before external marketing comparisons are published.

## 4. Segment hypotheses

### Segment 1 — temporary complex treatments

Duration:

- 1 week to 6 months.

Examples:

- GI treatment;
- multi-medication post-operative plans;
- medication + supplements with spacing;
- treatment with several before/after-food rules.

Why attractive:

- high short-term pain;
- treatment has a clear beginning and end;
- user is motivated;
- product can prove value quickly.

Downside:

- treatment may end before subscription retention becomes strong.

### Segment 2 — chronic polypharmacy

Why attractive:

- persistent need;
- potentially high retention;
- strong caregiver use case.

Downside:

- older and medically complex users increase accessibility, support, and safety requirements.

### Segment 3 — irregular schedule users

Examples:

- shift workers;
- travel-heavy users;
- people whose wake/sleep/meal times vary.

Why attractive:

- fixed alarms are inherently weak for them;
- event-relative scheduling is easy to communicate.

### Segment 4 — caregivers

Need:

- visibility;
- escalation;
- shared confirmation;
- controlled access.

Why attractive:

- willingness to pay may be higher;
- real operational pain.

Downside:

- requires sync, permissions, identity, privacy, and conflict handling.

### Segment 5 — protocol/cycle users

Examples:

- tapering;
- X days on / Y days off;
- staged treatment plans.

Potentially valuable later, but adds significant scheduling complexity.

## 5. Beachhead recommendation

Start with:

> **Adults managing a temporary or chronic treatment with 2+ medications and at least one timing dependency around meals or another medication.**

Do not initially market to “everyone who takes medicine”.

Why:

- pain is easier to identify;
- differentiation is easier to demonstrate;
- onboarding can be designed around real complexity;
- user feedback is more informative.

## 6. Market-sizing approach

Do not rely on a generic analyst report saying the medication-adherence market is worth $X billion. For early product decisions, use a bottom-up sizing model.

### TAM-like framework

Potential users:

`people using medication reminders`

### SAM-like framework

Subset who have:

- multiple daily administrations;
- meal relationships;
- spacing rules;
- changing routines;
- desire for app-based management.

### Initial SOM-like framework

Users reachable through:

- app stores;
- treatment-specific communities;
- Reddit;
- SEO;
- caregiver communities;
- clinician/pharmacist recommendations.

Build the model only after obtaining:

- keyword volumes;
- App Store / Play Store competitor review data;
- survey incidence;
- interview incidence;
- beta conversion.

## 7. Competitor-research backlog

For each competitor, capture:

1. onboarding time;
2. supported schedule primitives;
3. meal model;
4. response to a late dose;
5. response to a missed dose;
6. conflict handling;
7. explanation UI;
8. notification behavior;
9. Android reboot behavior;
10. timezone behavior;
11. pricing;
12. account requirement;
13. privacy model;
14. caregiver;
15. export;
16. accessibility;
17. review complaints;
18. feature requests.

Priority products:

- Medisafe;
- Pillo;
- MyTherapy;
- Doz;
- CareClinic;
- Apple Health medication tracking;
- Samsung Health / Android ecosystem equivalents;
- region-specific medication reminder apps.

## 8. Review-mining research

Create a dataset of several hundred public reviews from major competitors and manually code them into categories:

- missed/late reminder;
- annoying notification;
- meal-related problem;
- schedule flexibility;
- every-X-hours problem;
- caregiver problem;
- timezone;
- refill;
- subscription complaint;
- UI complexity;
- medication database;
- reliability;
- sync;
- privacy.

The most valuable insights are **repeated user workarounds**, e.g.:

- multiple phone alarms;
- calendar events;
- handwritten notes;
- calculators;
- spreadsheets;
- reminders renamed with instructions.

## 9. Market validation thresholds

Before serious investment, seek evidence like:

### Qualitative
- 10+ users independently describe manual schedule math.
- Users immediately understand a dynamic timeline demo.
- Users can name an existing workaround they dislike.

### Behavioral
- 50%+ of complex-plan beta users finish setup.
- meaningful weekly use of dynamic rescheduling;
- users retain through multiple treatment weeks;
- users stop using parallel manual alarms.

### Commercial
- users accept a paid feature test;
- caregiver or advanced-plan features show willingness to pay;
- app-store intent converts without education-heavy copy.

## 10. Positioning options to test

### A
**Stop doing medication math.**

Best for pain awareness.

### B
**Your treatment schedule, automatically figured out.**

Best for clarity.

### C
**Your day changes. Your treatment plan adapts.**

Best for dynamic behavior.

### D
**Know what to take next — and when you can eat.**

Best for meal-dependent early niche.

## 11. Strategic conclusion

There is strong evidence that medication-management apps have a large audience. The competitive risk is also real: meal-aware scheduling already exists.

The strongest reason to build DoseFlow is therefore not category growth; it is the possibility that **current products model reminders, while DoseFlow models the treatment as a constraint graph**.

That hypothesis must be validated with user behavior, not assumed from feature novelty.
