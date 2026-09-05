# Roadmap & Delivery Plan

## 1. Roadmap philosophy

Each phase must answer a question.

Do not advance because a date arrived.

## Phase 0 — Concept Prototype

### Question
Can users understand dynamic treatment scheduling?

### Deliverables
- clickable UX prototype;
- Today timeline;
- Rule Builder;
- late-dose recalculation animation;
- “When can I eat?”;
- conflict screen.

### Exit gate
5–8 target users understand the core without explanation.

## Phase 1 — Personal Alpha

### Question
Can the system reliably execute one real complex treatment for weeks?

### Deliverables
- React Native app;
- SQLite;
- treatment plan;
- meal-relative rules;
- scheduler v0;
- Today;
- Taken/Snooze/Skip;
- local notifications;
- history;
- explanation;
- diagnostic export.

### Explicit exclusions
- login;
- cloud;
- payment;
- caregiver;
- OCR;
- AI.

### Exit gate
14–30 days dogfood without unresolved critical schedule issues.

## Phase 2 — Closed Beta

### Question
Does the model generalize beyond the original treatment?

### Users
20–50.

### Additions
- more rule types;
- onboarding improvements;
- notification health;
- beta analytics;
- support reporting;
- robust timezone behavior.

### Exit gate
- no Sev-1 scheduling bugs;
- users independently configure diverse plans;
- repeated use of dynamic features.

## Phase 3 — Public Beta

### Question
Can strangers activate and trust it?

### Users
100–1,000.

### Additions
- polished onboarding;
- privacy/terms;
- store assets;
- localization EN/RO;
- crash/diagnostics;
- optional export;
- app-store review loop.

### Exit gate
Stable notification reliability + acceptable support load.

## Phase 4 — v1 Commercial

### Question
Will users pay for advanced value?

### Additions
- Pro entitlement;
- advanced rules;
- history/export improvements;
- optional cloud backup;
- multi-device if stable.

### Monetization experiments
- annual;
- lifetime;
- 90-day treatment pass.

## Phase 5 — Caregiver

### Question
Can DoseFlow coordinate treatment across people safely?

### Additions
- account;
- invite;
- permission scopes;
- shared event status;
- escalation;
- conflict resolution.

### Major risks
- privacy;
- duplicate action;
- synchronization;
- identity.

## Phase 6 — Advanced Plans

Add:
- cycles;
- tapering;
- conditional phases;
- multiple plan templates;
- travel planning.

Only after engine architecture is validated.

## Phase 7 — Import & Reference

Potential:
- barcode;
- prescription OCR;
- medication database;
- standard-instruction reference.

Requires:
- data licensing;
- jurisdiction;
- medical review;
- error handling.

## Phase 8 — Professional/B2B

Potential:
- clinician template;
- pharmacy handoff;
- treatment-plan links;
- organization admin.

Not a guaranteed destination.

## 2. 12-week MVP delivery sketch

### Weeks 1–2
- product spec;
- clickable prototype;
- engine domain model;
- test fixtures.

### Weeks 3–4
- DB;
- treatment setup;
- meal setup;
- base scheduler.

### Weeks 5–6
- Today;
- Taken;
- recalculation;
- explanations.

### Weeks 7–8
- notifications;
- snooze;
- skip;
- history.

### Weeks 9–10
- conflict handling;
- timezone;
- notification health;
- dogfood fixes.

### Weeks 11–12
- polish;
- test matrix;
- internal alpha.

This is a planning hypothesis, not a promise.

## 3. Decision gates

### Gate A — after prototype
If users do not understand relative scheduling, redesign.

### Gate B — after dogfood
If app does not replace manual math, core product failed.

### Gate C — after closed beta
If other plans cannot be expressed cleanly, fix model before adding features.

### Gate D — before payment
If reliability/support not strong, do not monetize yet.

## 4. Prioritization model

Score features by:
- user pain;
- differentiation;
- safety;
- frequency;
- implementation complexity;
- regulatory complexity.

Potential formula:
`Priority = (Pain × Frequency × Differentiation) / (Engineering × Risk)`

Use judgment; do not worship score.

## 5. Feature roadmap candidates

### v1.1
- widgets;
- duplicate medication/rule;
- better export;
- refill basics.

### v1.2
- advanced every-X rules;
- travel/timezone UX;
- treatment templates.

### v1.3
- cloud backup;
- multi-device.

### v1.4
- caregiver.

### v2
- advanced cycles;
- import;
- professional sharing.

## 6. Kill list

Features to reject until core proven:
- AI chatbot;
- community;
- nutrition tracking;
- symptoms;
- gamified streak economy;
- ads;
- broad health dashboard.

## 7. Roadmap success

A roadmap is successful if every new feature makes the treatment-execution loop:
- clearer;
- more reliable;
- more flexible;
- safer.

Not simply larger.
