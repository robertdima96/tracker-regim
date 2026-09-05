# Decisions

Dated, append-only log of architectural/product decisions made outside the
original blueprint. Newer entries go at the top. Never edit or delete a past
entry — if a decision changes, add a new entry that supersedes it and say so.

---

## 2026-09-05 — Technical stack for Phase A

**Decided:** Capacitor (app shell) + Svelte (UI) + TypeScript + SQLite via
`@capacitor-community/sqlite` (local storage) + `@capacitor/local-notifications`
(reminders).

**Why Capacitor over native / React Native / Flutter:** reuses this
project's existing web/JS skillset, needs no new language, and still ships
to the App Store / Play Store with real local notifications when that
matters. Lowest lift from the project's starting point (a static PWA).

**Why SQLite over IndexedDB / a JSON blob:** the data model
(`07_DATA_MODEL.md`) is inherently relational — plans → medications → rules
→ events → revisions. SQLite supports that natively; a JSON blob means
hand-rolling the same query logic the scheduling engine needs anyway.

**Why Svelte over vanilla JS / React / Flutter:** the MVP scope (13 screens,
a Today view that re-renders live as the schedule recalculates, a rule
builder, conflict/explanation views, revision history, all sharing state)
is materially more reactive state than the app this project replaces.
Svelte's reactivity removes hand-written DOM-diffing code, compiles to a
small bundle appropriate for a Capacitor shell, and has a shallower
learning curve than React.

**Supersedes:** `08_ENGINEERING_ARCHITECTURE.md`'s original "React Native"
recommendation (written before this project's context was known).

## 2026-09-05 — Product direction left open

**Decided:** Do not choose between "personal tool" and "shippable product"
yet. Build Phase A (prove the scheduling engine + UX) so either direction
stays viable; revisit after dogfooding (blueprint Phase B).

**Why:** the original app was personal-use; the blueprint was written as a
commercial product end-to-end. Forcing the choice now isn't needed to build
Phase A and would bias early scope decisions on a guess.

**Effect on this doc set:** `02, 03, 10, 12–19` (market, personas, safety/
compliance, analytics, monetization, GTM, support, roadmap, research,
backlog, sources) are left as-is — not deepened, not deleted — until this
resolves.
