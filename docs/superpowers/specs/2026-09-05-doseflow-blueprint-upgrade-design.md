# DoseFlow blueprint upgrade — design

Date: 2026-09-05

## Context

`docs/blueprint/` contains a 21-file product blueprint for "DoseFlow" (a
dynamic, constraint-aware medication/meal scheduler), produced externally
(ChatGPT) and imported into this repo. It supersedes the existing
`tracker-regim` static app (see
`docs/superpowers/specs/2026-09-04-treatment-tracker-design.md`), which this
project replaces rather than extends — the old app's hardcoded single-regimen
model does not carry forward.

The blueprint is structurally strong (see review in conversation) but was
written platform-agnostic in places where platform actually matters (native
iOS/Android assumptions in engineering/notifications docs) and uninformed by
this project's context (personal-use origin, existing PWA skills). This
document records the decisions needed to make the blueprint concrete enough
to build from, and scopes the doc-upgrade pass that follows.

## Decisions

Recorded in full, with rationale, in the new `docs/blueprint/DECISIONS.md`
(created as part of this work — see below). Summary:

| Decision | Choice | Status |
|---|---|---|
| Product direction | Undecided — personal tool and shippable product both stay viable | Open, revisit after Phase A/B |
| Platform | Capacitor (web app wrapped in native shell) | Locked for Phase A |
| Local storage | SQLite via Capacitor Community SQLite plugin | Locked for Phase A |
| UI approach | Svelte | Locked for Phase A |

Rationale:
- **Capacitor over native/React Native/Flutter**: reuses this project's
  existing web/JS skillset, needs no new language, and still gets real local
  notifications and app-store distribution when that matters. Lowest lift
  from current state.
- **SQLite over IndexedDB/Preferences-JSON**: the blueprint's data model
  (`07_DATA_MODEL.md`) is inherently relational (plans → medications → rules
  → events → revisions). SQLite supports that natively; a JSON blob would
  mean hand-rolling query logic the engine needs anyway.
- **Svelte over vanilla JS**: the blueprint's MVP scope (13 screens, a Today
  view that must re-render live as the schedule recalculates, rule builder,
  conflict/explanation views, revision history) is materially more reactive
  state than the existing calendar app. Svelte's reactivity removes the
  DOM-diffing code that would otherwise be hand-written and bug-prone, while
  compiling to a small bundle appropriate for a Capacitor shell. Chosen over
  React/Flutter for its shallower learning curve.
- **Product direction left open**: the original app was personal-use; the
  blueprint is written as a commercial product. Forcing a choice now isn't
  needed to build Phase A (prove the scheduling engine + UX), so it's
  deferred rather than guessed at.

## Scope of this pass

**New file:**
- `docs/blueprint/DECISIONS.md` — dated, append-only decision log (the
  table above, expanded with rationale). Future architectural decisions get
  appended here rather than being re-derived or silently disagreed-with
  across docs.

**Docs deepened, in dependency order:**

1. `01_PRODUCT_STRATEGY.md` — add a "Technical Direction" section pointing
   at `DECISIONS.md`; no other changes.
2. `07_DATA_MODEL.md` — replace the conceptual entity list with an actual
   SQLite schema (tables, columns, types, foreign keys, indices) that
   matches the TypeScript types already defined in `06`.
3. `06_SCHEDULING_ENGINE_SPEC.md` — light alignment pass only: field names
   consistent with the new schema. This doc is already the most rigorous in
   the set and needs no structural rewrite.
4. `05_UX_INFORMATION_ARCHITECTURE.md` — deepen each of the 13 MVP screens
   (layout, state transitions, empty/error states) and add an appendix of
   one image-mockup prompt per screen, written for ChatGPT's image
   generation, for the user to run externally.
5. `08_ENGINEERING_ARCHITECTURE.md` — rewritten around the locked stack:
   folder structure, Vite build tooling, Capacitor plugin list, Svelte
   module/state boundaries, offline-first data flow through SQLite.
6. `09_NOTIFICATIONS_AND_BACKGROUND.md` — rewritten around Capacitor's
   Local Notifications plugin: iOS's 64-pending-notification ceiling,
   Android exact-alarm permission requirements, the reschedule-on-recalc
   strategy, reboot/relaunch recovery.
7. `11_QA_TEST_STRATEGY.md` — deepen with concrete scenarios tied to the
   engine's existing T1–T7 test cases, plus Vitest + svelte-testing-library
   for component tests and Capacitor device-testing notes.
8. `04_PRD_MVP.md` — wording pass only: replace "iOS + Android mobile
   application" framing with Capacitor-based hybrid; no scope changes.

**Left untouched this pass** (not blocked by today's decisions, already
appropriately scoped as placeholders): `02, 03, 10, 12, 13, 14, 15, 16, 17,
18, 19`, `FILE_INDEX.md` (regenerated at the end from actual file sizes).

## Screen mockup workflow

For each of the 13 MVP screens, `05_UX_INFORMATION_ARCHITECTURE.md` gets one
ChatGPT image-generation prompt describing layout, content, and visual style
(paper/warm palette carried over from the old app's design language, per
user preference — see design notes in the 2026-09-04 spec). These are
mockup-only prompts; no code-generation prompts, since ChatGPT-written Svelte
would need to be substantially rewritten anyway once real data/state wiring
is involved — the mockups inform Svelte components written directly against
the UX spec.

## ChatGPT review loop

For each doc in the upgrade list: draft here → user pastes finished doc to
ChatGPT for a critique pass → substantive feedback comes back into this
conversation → folded in before moving to the next doc. `docs/blueprint/` in
this repo remains the single source of truth; ChatGPT drafts are not merged
in directly.

## Out of scope for this pass

- Any actual code (Capacitor project scaffold, Svelte components, SQLite
  migrations) — that follows this doc pass via a separate implementation
  plan.
- Resolving personal-tool-vs-product direction.
- Deepening business/GTM/compliance docs (02, 03, 10, 12–19) — revisit once
  product direction is resolved.

## Success criteria

This pass is done when: `DECISIONS.md` exists and is referenced from `01`;
the eight listed docs are internally consistent with each other (same field
names, same platform assumptions); the UX doc has a mockup prompt per
screen; and `FILE_INDEX.md` reflects the updated file sizes.
