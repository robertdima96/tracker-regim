# DoseFlow — Product Blueprint

**Status:** v0.1  
**Date:** 2026-09-04  
**Working name:** DoseFlow  
**Product category:** Dynamic treatment scheduler / medication adherence utility  
**Primary idea:** Turn treatment instructions into a living daily schedule that adapts when medication intake, meals, wake time, sleep time, or other relevant events change.

> Core positioning: **Stop doing medication math.**

## Why this document set exists

This repository is meant to turn an initial product idea into an implementation-ready product plan. It deliberately separates:

- product vision;
- user problems;
- market positioning;
- UX;
- scheduling logic;
- engineering architecture;
- safety and compliance;
- QA;
- analytics;
- monetization;
- launch and growth;
- support and operations.

The goal is not to build another generic “pill reminder”. The product hypothesis is that there is a meaningful subset of users whose treatment is hard because **several instructions depend on meals, intervals, actual administration time, or each other**.

A conventional reminder says:

> Take Drug A at 08:00.

DoseFlow should be able to represent:

> Take Drug A at least 60 minutes before breakfast.  
> Take Drug B 20–30 minutes before breakfast.  
> Breakfast is preferred between 08:30 and 10:00.  
> If Drug A is taken late, recalculate the valid window for Drug B and the earliest valid breakfast time.

## Product principles

1. **Prescription first.** The app executes the treatment instructions the user has been given; it does not prescribe treatment.
2. **Rules over fixed times.** Where appropriate, model relationships such as “30 minutes before lunch” rather than forcing “12:30”.
3. **Actual events matter.** A real administration time can change future schedule calculations.
4. **Explain every calculation.** Users must be able to understand why a time was calculated.
5. **Do not silently break medical rules.** If constraints conflict, surface the conflict instead of choosing which rule to violate.
6. **Offline-first.** Core schedules and reminders should work without a network connection.
7. **Safety before convenience.** The engine may recalculate configured timing constraints; it must not invent missed-dose or clinical advice.
8. **Progressive complexity.** Simple treatments should be simple to configure; advanced rules should be available only when needed.

## Document map

| File | Purpose |
|---|---|
| `01_PRODUCT_STRATEGY.md` | Vision, positioning, differentiation, product principles, risks |
| `02_MARKET_AND_COMPETITORS.md` | Market hypothesis, competitor landscape, wedge, research questions |
| `03_PERSONAS_JTBD_USE_CASES.md` | Personas, jobs-to-be-done, use cases, anti-personas |
| `04_PRD_MVP.md` | MVP requirements, scope, user stories, acceptance criteria |
| `05_UX_INFORMATION_ARCHITECTURE.md` | Navigation, flows, screens, interaction patterns |
| `06_SCHEDULING_ENGINE_SPEC.md` | Constraint model, propagation, conflict handling, algorithms |
| `07_DATA_MODEL.md` | Entities, relationships, event sourcing concepts, example schema |
| `08_ENGINEERING_ARCHITECTURE.md` | Mobile architecture, modules, sync, security, observability |
| `09_NOTIFICATIONS_AND_BACKGROUND.md` | iOS/Android reminder architecture, permissions, rescheduling |
| `10_SAFETY_PRIVACY_COMPLIANCE.md` | Product boundaries, GDPR, MDR risk framing, incident classes |
| `11_QA_TEST_STRATEGY.md` | Unit, integration, device, scheduling, edge-case test plans |
| `12_ANALYTICS_METRICS_EXPERIMENTS.md` | North Star, event taxonomy, funnels, product experiments |
| `13_MONETIZATION_AND_BUSINESS.md` | Pricing hypotheses, free/pro split, unit-economics framework |
| `14_GTM_MARKETING.md` | Positioning, launch, acquisition loops, content, ASO |
| `15_SUPPORT_AND_OPERATIONS.md` | Support taxonomy, safety escalation, release/incident processes |
| `16_ROADMAP_AND_DELIVERY.md` | Phases from prototype to v2, gates, milestones |
| `17_USER_RESEARCH_PLAN.md` | Interview scripts, beta recruitment, usability studies |
| `18_BACKLOG_EPICS.md` | Implementation epics and prioritized backlog |
| `19_SOURCES.md` | External references and research links |

## Suggested implementation sequence

### Phase A — prove the core
Build only:

1. treatment plan;
2. medication rule input;
3. meal/event configuration;
4. deterministic schedule generation;
5. Today timeline;
6. Taken / Snooze / Skip;
7. recalculation;
8. local notifications;
9. history and explanation.

### Phase B — prove the product
Dogfood it for a real multi-month treatment, then recruit 20–50 beta users with deliberately different schedule patterns.

### Phase C — prove the market
Measure whether users repeatedly rely on the dynamic schedule rather than merely using the app as a static alarm.

## Important safety note

This blueprint is a product and engineering plan, not medical advice. Any behavior that could be interpreted as recommending treatment, dose changes, missed-dose recovery, drug interactions, contraindications, or clinical optimization requires separate medical, legal, and regulatory review.

## Working product statement

> **DoseFlow converts the treatment instructions you already have into a live schedule and helps you understand what comes next when your day changes.**
