# DoseFlow Blueprint Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen the eight Phase-A-critical documents in `docs/blueprint/` so they're internally consistent with each other and with the locked technical stack (Capacitor + Svelte + SQLite), and add a decision log so the choice doesn't need re-deriving later.

**Architecture:** This is a documentation-editing plan, not a code plan — there are no automated tests. Each task edits one file (or one section of a large file) with fully-specified replacement content, then a manual verification step (grep/read-back) confirms the edit landed and stayed consistent with sibling docs, then a commit.

**Tech Stack:** N/A for this plan (the docs *describe* Capacitor + Svelte + TypeScript + SQLite via `@capacitor-community/sqlite` + `@capacitor/local-notifications`, which is the subject of Tasks 7–8, but no code is written here).

**Spec:** `docs/superpowers/specs/2026-09-05-doseflow-blueprint-upgrade-design.md`

## Global Constraints

- Locked stack (from spec): Capacitor + Svelte + TypeScript, SQLite via `@capacitor-community/sqlite`, local notifications via `@capacitor/local-notifications`.
- Product direction (personal tool vs. shippable product) stays **undecided** — do not resolve it in these docs.
- Docs `02, 03, 10, 12–19` are explicitly out of scope for this pass — do not edit them.
- `docs/blueprint/` in this repo is the single source of truth. ChatGPT is used only as an external reviewer per doc; its output is never pasted in directly without the user relaying it back for review.
- Every entity/enum name introduced or changed must match across `06_SCHEDULING_ENGINE_SPEC.md` and `07_DATA_MODEL.md` — these two files describe the same objects at different layers (TypeScript type vs. SQL table) and must not silently diverge.
- Match each file's existing voice: short headers, terse bullets, small code/SQL blocks. Do not turn any file into flowing prose paragraphs.

---

## Task 1: Create the decision log

**Files:**
- Create: `docs/blueprint/DECISIONS.md`

**Interfaces:**
- Produces: a decision log that Task 2 links to from `01_PRODUCT_STRATEGY.md`.

- [ ] **Step 1: Write the file**

```markdown
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
```

- [ ] **Step 2: Verify**

Read the file back and confirm it has two dated entries, both dated
2026-09-05, and that the "Supersedes" line correctly names
`08_ENGINEERING_ARCHITECTURE.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/blueprint/DECISIONS.md
git commit -m "docs(blueprint): add decision log for Phase A tech stack"
```

---

## Task 2: Link the decision log from Product Strategy

**Files:**
- Modify: `docs/blueprint/01_PRODUCT_STRATEGY.md` (append after line 266, the final line of the existing file)

**Interfaces:**
- Consumes: `docs/blueprint/DECISIONS.md` (Task 1)

- [ ] **Step 1: Append a new section at the end of the file**

```markdown

## 12. Technical direction

Phase A's platform, storage, and UI stack are decided and recorded in
`DECISIONS.md` — Capacitor + Svelte + TypeScript + SQLite. These are
build-mechanism choices; they do not change the product vision, principles,
or boundaries described above. Whether DoseFlow becomes a personal tool or
a shippable product is deliberately still open — see `DECISIONS.md`.
```

- [ ] **Step 2: Verify**

```bash
grep -n "Technical direction" "docs/blueprint/01_PRODUCT_STRATEGY.md"
grep -n "DECISIONS.md" "docs/blueprint/01_PRODUCT_STRATEGY.md"
```

Expected: both greps return a match.

- [ ] **Step 3: Commit**

```bash
git add docs/blueprint/01_PRODUCT_STRATEGY.md
git commit -m "docs(blueprint): link decision log from product strategy"
```

---

## Task 3: Complete the SQLite schema and reconcile enums

**Files:**
- Modify: `docs/blueprint/07_DATA_MODEL.md`

**Interfaces:**
- Produces: canonical enum values that Task 4 (06) must reuse verbatim:
  - `event_templates.kind`: `medication | meal | wake | sleep | custom`
  - `constraints`/`RelativeConstraint.source`: `clinician | pharmacist | package | user_routine | other`
  - `constraints.relation`: `before | after`

This task fixes two real gaps found while reading the existing docs:
1. The existing `constraints` SQL table (§5) has no `relation` column, even
   though `06_SCHEDULING_ENGINE_SPEC.md`'s `RelativeConstraint` type has a
   required `relation: 'before' | 'after'` field.
2. `EventTemplate.kind` values differ between docs: §2 of this file lists
   `medication_dose`, while `06_SCHEDULING_ENGINE_SPEC.md`'s `ScheduleEvent.kind`
   uses `medication`. Same for instruction source: this file's
   `InstructionSet.sourceType` uses `clinician/pharmacist/package/reference/
   user/other` (6 values) while `06`'s `RelativeConstraint.source` uses
   `doctor/pharmacist/reference/user` (4 values) — neither matches the PRD's
   5 instruction-source options (`04_PRD_MVP.md` §5.2: Doctor/clinician,
   Pharmacist, Package/reference, My own routine, Other). Canonicalize to
   the 5-value PRD-aligned set: `clinician | pharmacist | package |
   user_routine | other`.

- [ ] **Step 1: Fix `EventTemplate.kind` values in §2**

Find this text (around line 99-104):

```text
Kinds:
- medication_dose;
- meal;
- wake;
- sleep;
- custom.
```

Replace with:

```text
Kinds (must match `ScheduleEvent.kind` in `06_SCHEDULING_ENGINE_SPEC.md`):
- medication;
- meal;
- wake;
- sleep;
- custom.
```

- [ ] **Step 2: Canonicalize instruction source in §2's `InstructionSet` entity**

Find this text (around line 76-84):

```text
`sourceType`:
- clinician;
- pharmacist;
- package;
- reference;
- user;
- other.
```

Replace with:

```text
`sourceType` (must match `RelativeConstraint.source` in
`06_SCHEDULING_ENGINE_SPEC.md`, and the instruction-source picker in
`04_PRD_MVP.md` §5.2 / `05_UX_INFORMATION_ARCHITECTURE.md` §7):
- clinician;
- pharmacist;
- package;
- user_routine;
- other.
```

- [ ] **Step 3: Add the missing `relation` column and rewrite the `constraints` table in §5**

Find the `CREATE TABLE constraints (...)` block (around line 247-260) and
replace the whole block with:

```sql
CREATE TABLE constraints (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  source_template_id TEXT NOT NULL,
  target_template_id TEXT NOT NULL,
  relation TEXT NOT NULL,              -- 'before' | 'after'
  min_offset_minutes INTEGER,
  max_offset_minutes INTEGER,
  fixed_local_time TEXT,
  hardness TEXT NOT NULL,              -- 'hard' | 'preference'
  source_type TEXT NOT NULL,           -- 'clinician' | 'pharmacist' | 'package' | 'user_routine' | 'other'
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(plan_id) REFERENCES treatment_plans(id),
  FOREIGN KEY(source_template_id) REFERENCES event_templates(id),
  FOREIGN KEY(target_template_id) REFERENCES event_templates(id)
);
```

Note directly below it (add as new paragraph after the SQL block):

```text
`source_template_id` and `target_template_id` may be equal. This is how
"minimum X hours between administrations" (rule primitive #9 in
`04_PRD_MVP.md` §5.3) is modeled: a self-referencing constraint where both
sides point at the same medication-dose template, `relation = 'after'`, and
`min_offset_minutes` is the required spacing. This is also the SQL form of
the "previous same-medication administration" anchor described in
`06_SCHEDULING_ENGINE_SPEC.md` §8. Fixed-schedule recurrence ("every X
hours" regardless of actual dose time, rule primitive #8) is instead
encoded in `event_templates.recurrence_json` — the two rule primitives are
deliberately different mechanisms; see §12 of `06_SCHEDULING_ENGINE_SPEC.md`.
```

- [ ] **Step 4: Add the six missing CREATE TABLE statements**

Append after the `constraints` table block (and its new note from Step 3),
still within §5, before the `## 6. Recurrence model` heading:

```sql
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL,
  timezone TEXT NOT NULL,
  week_start TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE instruction_sets (
  id TEXT PRIMARY KEY,
  medication_id TEXT NOT NULL,
  source_type TEXT NOT NULL,           -- 'clinician' | 'pharmacist' | 'package' | 'user_routine' | 'other'
  source_label TEXT,
  notes TEXT,
  confirmed_at TEXT NOT NULL,
  FOREIGN KEY(medication_id) REFERENCES medications(id)
);

CREATE TABLE schedule_revisions (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reason TEXT NOT NULL,                -- 'plan_activated' | 'event_logged' | 'actual_time_edited' | 'meal_moved' | 'plan_changed' | 'timezone_changed'
  trigger_event_id TEXT,
  engine_version TEXT NOT NULL,
  FOREIGN KEY(plan_id) REFERENCES treatment_plans(id)
);

CREATE TABLE daily_events (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  planned_earliest TEXT NOT NULL,
  planned_latest TEXT NOT NULL,
  current_earliest TEXT NOT NULL,
  current_latest TEXT NOT NULL,
  status TEXT NOT NULL,                -- 'upcoming' | 'taken' | 'skipped' | 'cancelled'
  revision_id TEXT NOT NULL,
  FOREIGN KEY(template_id) REFERENCES event_templates(id),
  FOREIGN KEY(revision_id) REFERENCES schedule_revisions(id)
);

CREATE TABLE administration_records (
  id TEXT PRIMARY KEY,
  daily_event_id TEXT NOT NULL,
  action TEXT NOT NULL,                -- 'taken' | 'skipped' | 'corrected' | 'undone'
  actual_at TEXT,
  recorded_at TEXT NOT NULL,
  source TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY(daily_event_id) REFERENCES daily_events(id)
);

CREATE TABLE notification_records (
  id TEXT PRIMARY KEY,
  daily_event_id TEXT NOT NULL,
  platform_notification_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  fire_at TEXT NOT NULL,
  state TEXT NOT NULL,                 -- 'pending' | 'delivered' | 'cancelled' | 'failed'
  schedule_revision_id TEXT NOT NULL,
  FOREIGN KEY(daily_event_id) REFERENCES daily_events(id),
  FOREIGN KEY(schedule_revision_id) REFERENCES schedule_revisions(id)
);
```

The `reason`, `action`, and `state` enum values above are copied verbatim
from `ScheduleRevision.reason` (06 §13), `AdministrationRecord.action` (§2
of this file), and `09_NOTIFICATIONS_AND_BACKGROUND.md`'s notification
lifecycle respectively. `daily_events.status` is copied from
`ScheduleEvent.status` in `06_SCHEDULING_ENGINE_SPEC.md` §4 — **not** from
§7 of this file, which currently disagrees (see next step).

- [ ] **Step 5: Reconcile §7 "Event status" with the engine spec**

`06_SCHEDULING_ENGINE_SPEC.md` §4 defines `ScheduleEvent.status` as
`'upcoming' | 'taken' | 'skipped' | 'cancelled'` (4 values, used above for
`daily_events.status`). This file's own §7 currently recommends a
different, larger set (`scheduled; available; late; taken; skipped;
cancelled`). Reconcile by treating the larger set as UI-derived, not
persisted. Find §7's current content:

```text
## 7. Event status

Recommended:
- scheduled;
- available;
- late;
- taken;
- skipped;
- cancelled.

“Late” may be derived rather than persisted.
```

Replace with:

```text
## 7. Event status

Persisted (`daily_events.status`, matching `ScheduleEvent.status` in
`06_SCHEDULING_ENGINE_SPEC.md` §4):
- upcoming;
- taken;
- skipped;
- cancelled.

UI-derived, never persisted (computed from `upcoming` + the event's current
window + the current time — see `05_UX_INFORMATION_ARCHITECTURE.md` §4 for
the fuller UI state list this feeds into):
- available now;
- due soon;
- due;
- late.
```

- [ ] **Step 6: Verify**

```bash
grep -c "CREATE TABLE" "docs/blueprint/07_DATA_MODEL.md"
```

Expected: `10` (4 original tables + 6 new ones).

```bash
grep -n "relation TEXT" "docs/blueprint/07_DATA_MODEL.md"
grep -n "medication_dose" "docs/blueprint/07_DATA_MODEL.md"
grep -n "^- scheduled;" "docs/blueprint/07_DATA_MODEL.md"
```

Expected: first grep matches the new `constraints` table; second and third
greps return no matches (both fully replaced).

- [ ] **Step 7: Commit**

```bash
git add docs/blueprint/07_DATA_MODEL.md
git commit -m "docs(blueprint): complete SQLite schema and reconcile enums with engine spec"
```

---

## Task 4: Align the scheduling engine spec's enums

**Files:**
- Modify: `docs/blueprint/06_SCHEDULING_ENGINE_SPEC.md`

**Interfaces:**
- Consumes: canonical enums from Task 3 (`clinician | pharmacist | package | user_routine | other`)

- [ ] **Step 1: Update the `RelativeConstraint` type's `source` field**

Find (around line 96-106):

```ts
type RelativeConstraint = {
  id: string
  sourceTemplateId: string
  targetTemplateId: string
  relation: 'before' | 'after'
  minOffsetMinutes: number
  maxOffsetMinutes?: number
  hardness: 'hard' | 'preference'
  source: 'doctor' | 'pharmacist' | 'reference' | 'user'
}
```

Replace with:

```ts
type RelativeConstraint = {
  id: string
  sourceTemplateId: string
  targetTemplateId: string
  relation: 'before' | 'after'
  minOffsetMinutes: number
  maxOffsetMinutes?: number
  hardness: 'hard' | 'preference'
  source: 'clinician' | 'pharmacist' | 'package' | 'user_routine' | 'other'
}
```

- [ ] **Step 2: Add a note on self-referencing constraints to §8 (Anchoring rules)**

Find the end of §8 (around line 145-149, ending "Later: another medication;
arbitrary custom event.") and append immediately after it, still within
§8:

```text

`previous same-medication administration` is implemented as a
self-referencing `RelativeConstraint` (`sourceTemplateId === targetTemplateId`).
See `07_DATA_MODEL.md` §5 for the SQL-level note on how this also expresses
"minimum X hours between administrations" from `04_PRD_MVP.md` §5.3.
```

- [ ] **Step 3: Verify**

```bash
grep -n "'doctor'" "docs/blueprint/06_SCHEDULING_ENGINE_SPEC.md"
grep -n "user_routine" "docs/blueprint/06_SCHEDULING_ENGINE_SPEC.md"
grep -n "self-referencing" "docs/blueprint/06_SCHEDULING_ENGINE_SPEC.md"
```

Expected: first grep no matches, second and third greps each one match.

- [ ] **Step 4: Commit**

```bash
git add docs/blueprint/06_SCHEDULING_ENGINE_SPEC.md
git commit -m "docs(blueprint): align scheduling engine enums with data model"
```

---

## Task 5: Add screen-by-screen reference to the UX doc

**Files:**
- Modify: `docs/blueprint/05_UX_INFORMATION_ARCHITECTURE.md` (append new §21 after the existing §20 "UX research tasks", which currently ends the file)

The PRD (`04_PRD_MVP.md` §10) lists 13 MVP screens. Five are already
described in depth elsewhere in this file (Today, Rule Builder, Plan
Review, Conflict Detail, History) — this task cross-references those and
writes the eight that aren't covered as distinct screens yet (Welcome,
Create Treatment Plan, Medication List, Add/Edit Medication, Meal &
Routine Setup, Event Detail, Log Administration, Settings/Notification
Health).

- [ ] **Step 1: Append the new section**

```markdown

## 21. Screen-by-screen reference

Maps the 13 MVP screens (`04_PRD_MVP.md` §10) to where they're specified.

### Already specified elsewhere in this document
- **Today** — see §3 (hierarchy), §4 (event states), §9 (recalculation UX), §10 (When can I eat)
- **Rule Builder** — see §5 (sentence construction), §6 (progressive disclosure)
- **Plan Review** — see §8
- **Conflict Detail** — see §15
- **History** — see §14

### Welcome / value proposition
Single screen, no login, no account fields (accountless MVP per
`04_PRD_MVP.md` §2). Centered layout:
- headline: "Stop doing medication math." (positioning line from `00_README.md`)
- one-line subtext: the working product statement from `00_README.md`
- single primary action: `[Get started]` → Create Treatment Plan
- no secondary screens/onboarding carousel in MVP — the value prop is proven by using the product, not by reading about it

### Create Treatment Plan
Form fields, all from `04_PRD_MVP.md` §5.1:
- name (required)
- start date (required, defaults to today)
- end date (optional)
- timezone mode (defaults to device timezone)
- notes (optional)

Status defaults to `draft` on save — there is no activation control here;
activation happens at Plan Review (§8) once medications and meals exist.
Primary action: `[Save]` → Medication list (empty state, see §16 "No plan").

### Medication list
Scoped to the current plan.
- Empty state: reuse §16 "No plan" copy ("Add your treatment instructions and DoseFlow will build today's schedule.")
- Each row: display name, strength (if set), rule summary line (e.g. "60 min before breakfast"), tap to edit
- `[Add medication]` → Add/Edit Medication
- Once at least one medication exists: `[Continue to meals & routine]` → Meal & Routine Setup

### Add/Edit Medication
Fields from `04_PRD_MVP.md` §5.2: display name (required), strength value +
unit (optional), form (optional), notes (optional). Instruction source
picker per §7 of this document (Doctor/clinician, Pharmacist, Package/
reference, My own routine, Other — stored as `instruction_sets.source_type`,
see `07_DATA_MODEL.md`).

A medication can have multiple dose templates (one `EventTemplate` per
dose, per `07_DATA_MODEL.md` §3 — e.g. morning dose and evening dose with
different rules). This screen lists each dose under the medication with an
`[Add dose]` action; each dose opens the Rule Builder (§5) to define its
timing rule. `[Save]` returns to Medication list.

### Meal & Routine Setup
- Built-in meals (breakfast, lunch, dinner, per `04_PRD_MVP.md` §5.4): toggle on/off, set preferred time or window, mark fixed vs. flexible
- Wake time / bedtime fields — these are the anchors used by "X after wake-up" / "X before bedtime" rules (`06_SCHEDULING_ENGINE_SPEC.md` §8)
- `[Add custom meal/event]` for snacks or named events
- `[Continue]` → Plan Review (§8)

### Event Detail
Opened by tapping any event on Today or in History.
- event label, current window/time, status (§4 event states)
- explanation: render the `Explanation.facts` array (`06_SCHEDULING_ENGINE_SPEC.md` §20) as a bulleted "why" list, following the error/explanation philosophy in §17 of this document
- instruction source (§7 of this document)
- actions matching current state: Taken now / Taken at… / Snooze / Skip / Undo (`04_PRD_MVP.md` §5.6)

### Log Administration
Reached from Event Detail's `[Taken at…]` (not `[Taken now]`, which requires
no screen — it's a single tap that logs the current device time).
- time picker defaulting to now
- quick offsets: "5 min ago", "15 min ago", "30 min ago"
- free time entry for anything else
- optional note
- `[Confirm]` triggers recalculation (`06_SCHEDULING_ENGINE_SPEC.md` §10) and returns to Today showing the "N upcoming events adjusted" summary (§9 of this document)

### Settings / Notification Health
- Notification health block (`08_ENGINEERING_ARCHITECTURE.md` §17): permission status, exact-alarm capability (Android), scheduled notification count, next reminder, last error. Rendered as "Reminders are ready." or "Precise reminders are not currently permitted on this device." per that section.
- Lock-screen privacy mode: Full / Private / Hidden (`10_SAFETY_PRIVACY_COMPLIANCE.md` §17)
- `[Export backup]` (JSON download)
- `[Reset app]` (destructive, requires confirmation)
- `[Report a schedule issue]` — sends the diagnostic package from `08_ENGINEERING_ARCHITECTURE.md` §16, consent-gated
```

- [ ] **Step 2: Verify**

```bash
grep -c "^### " "docs/blueprint/05_UX_INFORMATION_ARCHITECTURE.md"
```

Expected: `8` (the eight newly-specified screens; the five cross-referenced
ones use `- **Name**` bullets, not `###` headers, so they don't count here).

```bash
grep -n "## 21. Screen-by-screen reference" "docs/blueprint/05_UX_INFORMATION_ARCHITECTURE.md"
```

Expected: one match.

- [ ] **Step 3: Commit**

```bash
git add docs/blueprint/05_UX_INFORMATION_ARCHITECTURE.md
git commit -m "docs(blueprint): add screen-by-screen reference to UX doc"
```

---

## Task 6: Add mockup-prompt appendix to the UX doc

**Files:**
- Modify: `docs/blueprint/05_UX_INFORMATION_ARCHITECTURE.md` (append new §22, after §21 from Task 5)

**Interfaces:**
- Consumes: the 13 screens described in Task 5's §21 and elsewhere in this file.

One ready-to-paste ChatGPT image-generation prompt per MVP screen. Shared
visual language across all prompts (carried over from the previous app's
design notes in `docs/superpowers/specs/2026-09-04-treatment-tracker-design.md`):
warm paper background (`#F6F3EC`), near-black warm ink text, sage green
accent for medication elements, ocre/terracotta accent for meal elements,
a warm serif for headings/times, a clean sans-serif for body text, calm
"reliable utility" feeling rather than a clinical/hospital look or a
playful/gamified one.

- [ ] **Step 1: Append the new section**

```markdown

## 22. Mockup prompts (for ChatGPT image generation)

Shared style baseline for every prompt below: mobile app screen, portrait
orientation, warm paper background (#F6F3EC), near-black warm ink text,
sage green accent for medication-related elements, ocre/terracotta accent
for meal-related elements, warm serif font for headings and times, clean
sans-serif for body text, generous whitespace, rounded card corners, no
harsh shadows. Calm and reliable, like a well-made scheduling utility —
not a hospital portal, not a gamified habit-tracker.

**1. Welcome:** Centered layout. Small line-icon mark near the top. Large
warm-serif headline "Stop doing medication math." One-sentence subtext
below in sans-serif. One full-width primary button "Get started" in sage
green with rounded corners. No login fields, no carousel dots, no logos
other than the app's own mark.

**2. Create Treatment Plan:** A simple form on the paper background: a
labeled text field "Plan name", two date fields ("Start date", "End date
(optional)"), a text area "Notes (optional)". Primary button "Save" at the
bottom, full width, sage green.

**3. Medication list:** A vertical list of rounded cards, each showing a
medication name in serif, a small pill/capsule icon, a one-line rule
summary in muted gray sans-serif ("60 min before breakfast"), and a chevron
to edit. A floating circular "+" button bottom-right in sage green. If
empty, show a centered empty-state illustration-free message instead of
the list.

**4. Add/Edit Medication:** Form with fields "Display name", "Strength"
(two inline fields: number + unit dropdown), "Form", "Notes". Below that,
a row of five pill-shaped selectable chips labeled "Doctor", "Pharmacist",
"Package", "My routine", "Other" under the heading "Where does this
instruction come from?". Below that, a card list titled "Doses" with an
"+ Add dose" link.

**5. Rule Builder:** A sentence-construction UI: a horizontal row of
inline dropdown/number chips reading like a sentence — "[60] [minutes]
[before] [breakfast]" — each bracketed part a distinct rounded selectable
chip. Below it, a muted preview line in italics: "If breakfast is 09:00,
this dose will be scheduled at 08:00." Primary button "Save rule" at the
bottom.

**6. Meal & Routine Setup:** Three rounded cards labeled "Breakfast",
"Lunch", "Dinner", each with a toggle switch and a time range shown in
terracotta accent color. Below them, two fields "Wake time" and "Bedtime"
with clock-style time pickers. A text link "+ Add custom meal or event"
beneath. Primary button "Continue" at the bottom.

**7. Plan Review:** A read-only vertical timeline grouped under
"MORNING" / "MIDDAY" / "EVENING" headers, each row showing a time (or time
range) in serif and a label in sans-serif, medication rows marked with the
sage dot, meal rows marked with the terracotta dot. A muted note: "Times
will adapt when linked events change." Primary button "Activate treatment"
at the bottom.

**8. Today:** The main screen. A "NOW" marker on a vertical timeline down
the left side with sage/terracotta dots per event. At the top, one large
elevated card — the next action — showing an event label in serif, a bold
time or time window, a one-line rule summary, and a primary button
("Taken now"). Below that, a smaller secondary line ("Breakfast from
09:17"). Beneath the timeline, three small text-link shortcuts: "When can
I eat?", "View plan", "Report schedule issue".

**9. Event Detail:** A single event shown large at the top (label, time
window, status badge). Below it, a "Why?" section with 2-3 bulleted plain-
language facts explaining the calculated time. Below that, a row of action
buttons: "Taken now", "Taken at…", "Snooze", "Skip".

**10. Log Administration:** A large time display at the top defaulting to
the current time. Below it, three quick-offset chip buttons: "5 min ago",
"15 min ago", "30 min ago". Below that, a manual time-picker wheel. A text
field "Note (optional)" beneath. Primary button "Confirm" at the bottom.

**11. Conflict Detail:** A card with a warning-toned (muted amber, not
alarming red) header icon and the title "Schedule conflict". Below it,
2-3 plain-language sentences describing which configured rules can't all
be satisfied. Below that, a list of review actions as outlined buttons:
"Review dinner time", "Review medication timing", "Review bedtime", and a
plain text link "Dismiss for now".

**12. History:** A vertical list grouped by day, each day showing a
compact sequence of small rows: a planned time (struck through gray if
changed), an actual time in ink black, and a small delta label like "+17
min" in muted terracotta. A segmented control at the top to switch between
"Actual timeline" / "Final schedule" / "Original schedule" views.

**13. Settings / Notification Health:** A list of grouped settings rows.
Top group "Notifications": a status row with a green dot "Reminders are
ready." and sub-rows for permission status, exact-alarm capability, next
reminder time. Middle group "Privacy": a segmented control "Full / Private
/ Hidden" for lock-screen notification content. Bottom group "Data":
"Export backup", "Report a schedule issue", and a destructive-styled
"Reset app" row in muted red text.
```

- [ ] **Step 2: Verify**

```bash
grep -c "^\*\*[0-9]" "docs/blueprint/05_UX_INFORMATION_ARCHITECTURE.md"
```

Expected: `13`.

- [ ] **Step 3: Commit**

```bash
git add docs/blueprint/05_UX_INFORMATION_ARCHITECTURE.md
git commit -m "docs(blueprint): add mockup-generation prompts for all 13 MVP screens"
```

---

## Task 7: Rewrite Engineering Architecture around Capacitor + Svelte + SQLite

**Files:**
- Modify: `docs/blueprint/08_ENGINEERING_ARCHITECTURE.md`

**Interfaces:**
- Consumes: `DECISIONS.md` (Task 1)

- [ ] **Step 1: Replace §2 "Recommended MVP stack"**

Find the whole `## 2. Recommended MVP stack` section (from that heading
through the line before `## 3. Monorepo structure`) and replace with:

```markdown
## 2. Recommended MVP stack

Locked in `DECISIONS.md` (2026-09-05).

### App
**Capacitor + Svelte + TypeScript**

Why:
- reuses this project's existing web/JS skillset — no new language;
- Svelte's reactivity fits a Today view that must re-render live as the schedule recalculates, without hand-written DOM-diffing;
- Capacitor wraps the web app in a real native shell — App Store/Play Store distribution, real local notifications, no fully-managed-environment lock-in;
- the scheduling engine (§5) stays plain TypeScript regardless of UI framework, so this choice doesn't affect its design.

### Local database
**SQLite via `@capacitor-community/sqlite`**

See `07_DATA_MODEL.md` §5 for the schema.

### Notifications
**`@capacitor/local-notifications`** (official Capacitor plugin) — see
`09_NOTIFICATIONS_AND_BACKGROUND.md` for platform-specific detail and its
known gaps.

### Capacitor plugins used in Phase A
- `@capacitor-community/sqlite` — local database
- `@capacitor/local-notifications` — reminders
- `@capacitor/preferences` — small device-level settings only (lock-screen
  privacy mode, notification style); never domain data, which lives in SQLite
- `@capacitor/filesystem` — backup export (§18 of `05_UX_INFORMATION_ARCHITECTURE.md`)

### State
Separate:
- persisted domain state (SQLite, via the `/database` repositories);
- UI state (Svelte component state / stores);
- derived schedule state (output of the scheduler package, §5 — never stored as UI state directly, always re-derived or persisted as a revision).

Avoid putting the scheduling domain into Svelte stores as the source of truth — stores should hold what the scheduler *returns*, not reimplement its logic.
```

- [ ] **Step 2: Replace §3 "Monorepo structure"**

Find the whole `## 3. Monorepo structure` section and replace with:

```markdown
## 3. Project structure

A single Capacitor app, not a multi-app monorepo (Capacitor doesn't need
separate per-platform app code the way a bare React Native workflow might):

```text
/src
  /domain          - plan/medication/constraint types & business rules (pure TS)
  /scheduler       - the scheduling engine (pure TS; no Svelte, no SQLite, no Capacitor APIs)
  /notifications   - notification planner + Capacitor Local Notifications adapter
  /database        - SQLite repositories (@capacitor-community/sqlite)
  /analytics       - Analytics interface + property allowlist (§13)
  /screens         - one Svelte component per MVP screen (see 05_UX_INFORMATION_ARCHITECTURE.md §21)
  /components      - shared Svelte UI components
capacitor.config.ts
vite.config.ts
android/           - generated by `npx cap add android`, not hand-edited except native plugin glue
ios/               - generated by `npx cap add ios`, not hand-edited except native plugin glue
```
```

- [ ] **Step 3: Update §5 "Scheduler package"**

Find the line "Requirements:" list intro paragraph (the one line before it
reads "Requirements:") — no wording change needed there, the pure-TS
requirement is already stack-agnostic. Instead, append one line right
after the closing code fence of the `calculateSchedule(...)` signature
block, still within §5:

```text

Lives at `/src/scheduler` (§3). Nothing outside this folder may import
Svelte, `@capacitor-community/sqlite`, or any `@capacitor/*` package.
```

- [ ] **Step 4: Update §22 "Architecture decision records"**

Find:

```text
Examples:
- ADR-001 React Native
- ADR-002 SQLite local source of truth
- ADR-003 No account in MVP
- ADR-004 Hard constraints never auto-violated
- ADR-005 Scheduler as pure package
```

Replace with:

```text
Examples:
- ADR-001 Capacitor + Svelte (see `DECISIONS.md`, 2026-09-05)
- ADR-002 SQLite local source of truth via `@capacitor-community/sqlite`
- ADR-003 No account in MVP
- ADR-004 Hard constraints never auto-violated
- ADR-005 Scheduler as pure package
```

- [ ] **Step 5: Update §20 "CI/CD"**

Find the `### On pull request` list and replace `scheduler unit tests` with
`scheduler unit tests (Vitest)` and add one line; find the `### Release
candidate` list and add a Capacitor-specific line. Full replacement of
§20:

```markdown
## 20. CI/CD

### On pull request
- lint;
- typecheck;
- scheduler unit tests (Vitest);
- Svelte component tests (Vitest + @testing-library/svelte);
- DB migration tests.

### Main
- `npx cap sync` to confirm the native projects still build;
- build development artifacts;
- integration smoke tests.

### Release candidate
- physical device matrix (iOS + Android);
- notification tests;
- timezone tests;
- upgrade/migration tests.
```

- [ ] **Step 6: Verify**

```bash
grep -n "React Native" "docs/blueprint/08_ENGINEERING_ARCHITECTURE.md"
```

Expected: no matches.

```bash
grep -n "Capacitor" "docs/blueprint/08_ENGINEERING_ARCHITECTURE.md" | wc -l
```

Expected: a number greater than 5.

- [ ] **Step 7: Commit**

```bash
git add docs/blueprint/08_ENGINEERING_ARCHITECTURE.md
git commit -m "docs(blueprint): rewrite engineering architecture around Capacitor+Svelte+SQLite"
```

---

## Task 8: Rewrite Notifications spec around Capacitor's Local Notifications plugin

**Files:**
- Modify: `docs/blueprint/09_NOTIFICATIONS_AND_BACKGROUND.md`

This task documents three real engineering constraints discovered by
grounding the original platform-agnostic spec in the actual chosen plugin:
(1) `@capacitor/local-notifications` does not manage the Android 12+
exact-alarm permission itself — that needs a small native plugin
extension, not pure JS; (2) Capacitor apps get no automatic
`BOOT_COMPLETED` receiver, so reboot recovery must happen via a
reconcile-on-launch pass rather than a native receiver; (3) Critical
Alerts require custom native entitlement work not provided by the stock
plugin, which the original spec already correctly excluded from MVP.

- [ ] **Step 1: Update §2 "Architecture" with the concrete plugin name**

Find:

```text
```text
Scheduler
  ↓
Notification Planner
  ↓
Desired Notification Set
  ↓
Platform Adapter
  ├─ iOS
  └─ Android
```

The scheduler does not call OS APIs.
```

Replace with:

```text
```text
Scheduler
  ↓
Notification Planner
  ↓
Desired Notification Set
  ↓
@capacitor/local-notifications
  ├─ iOS (UNUserNotificationCenter under the hood)
  └─ Android (AlarmManager under the hood)
```

The scheduler does not call OS APIs. The Notification Planner is the only
module that imports `@capacitor/local-notifications` (see
`08_ENGINEERING_ARCHITECTURE.md` §3, `/src/notifications`).
```

- [ ] **Step 2: Update §5 "iOS" — Critical Alerts subsection**

Find:

```text
### Critical Alerts

Apple offers Critical Alerts that can bypass mute/Focus, but apps require the relevant entitlement and approval.

Do not assume approval.

MVP:
- standard notifications;
- optional Time Sensitive notification behavior if platform policy/use case supports it and is reviewed.
```

Replace with:

```text
### Critical Alerts

Apple offers Critical Alerts that can bypass mute/Focus, but apps require
the relevant entitlement and approval. `@capacitor/local-notifications`
does not expose Critical Alerts — using them would require writing a
custom native iOS plugin. Not planned for Phase A.

MVP:
- standard notifications via `@capacitor/local-notifications`;
- optional Time Sensitive notification behavior if platform policy/use case supports it and is reviewed.
```

- [ ] **Step 3: Update §6 "Android" with the exact-alarm plugin gap**

Find:

```text
Modern Android restricts exact alarms. Apps targeting recent Android versions may need special exact-alarm access for APIs such as `setExact()` / `setExactAndAllowWhileIdle()` depending on the chosen permission model and use case.

Engineering tasks:
- determine whether product qualifies for exact-alarm policy;
- implement capability detection;
- guide user to settings only when justified;
- test Doze/battery modes;
- reboot receiver;
- reschedule after permission changes.
```

Replace with:

```text
Modern Android restricts exact alarms. Apps targeting recent Android
versions may need special exact-alarm access for APIs such as
`setExact()` / `setExactAndAllowWhileIdle()` depending on the chosen
permission model and use case.

**Known plugin gap:** `@capacitor/local-notifications` schedules
notifications but does not manage the Android 12+ `SCHEDULE_EXACT_ALARM`
permission grant/check itself. Detecting and requesting this permission
requires a small custom native Android plugin (a short Kotlin shim calling
`AlarmManager.canScheduleExactAlarms()`), not pure JS/TypeScript. Size this
as its own engineering task, not an afterthought inside the notification
planner.

Engineering tasks:
- build the native exact-alarm-permission shim described above;
- implement capability detection using it;
- guide user to settings only when justified;
- test Doze/battery modes;
- reconcile pending notifications on every app launch (see §12 — Capacitor apps get no automatic reboot receiver);
- reschedule after permission changes.
```

- [ ] **Step 4: Update §12 "Reboot"**

Find:

```text
## 12. Reboot

Android:
- device reboot can remove scheduled alarms depending on mechanism;
- rehydrate desired reminders after boot using native receiver/process.

iOS:
- verify pending local-notification behavior and resync at launch.
```

Replace with:

```text
## 12. Reboot

Capacitor apps do not get an automatic `BOOT_COMPLETED` broadcast receiver
the way a native Android app can register one — `@capacitor/local-
notifications` does not add this for you. Rather than building a custom
native receiver for Phase A, rely on the same reconciliation this spec
already needs after any recalculation (§4 Diff algorithm):

- on every app launch/resume, read the desired notification set from the
  database and compare it against what the plugin reports as currently
  scheduled (`LocalNotifications.getPending()`);
- reschedule anything missing.

This has a known gap: a device that reboots and is not reopened before a
reminder's fire time will miss that reminder. Acceptable for Phase A;
revisit with a native receiver if dogfooding shows this happening often.

iOS:
- verify pending local-notification behavior and resync at launch using the same `getPending()`-based reconciliation.
```

- [ ] **Step 5: Update §15 "Permission health" with the concrete API call**

Find the fenced block under §15 (`Notifications       Enabled` ... table)
and add one line immediately after that fenced block, still in §15:

```text

Read via `LocalNotifications.checkPermissions()` (notification permission)
and the native exact-alarm shim from §6 (Android precise-alarm capability).
```

- [ ] **Step 6: Verify**

```bash
grep -n "@capacitor/local-notifications" "docs/blueprint/09_NOTIFICATIONS_AND_BACKGROUND.md" | wc -l
```

Expected: a number greater than or equal to 5.

```bash
grep -n "SCHEDULE_EXACT_ALARM" "docs/blueprint/09_NOTIFICATIONS_AND_BACKGROUND.md"
```

Expected: one match.

- [ ] **Step 7: Commit**

```bash
git add docs/blueprint/09_NOTIFICATIONS_AND_BACKGROUND.md
git commit -m "docs(blueprint): ground notifications spec in Capacitor Local Notifications plugin"
```

---

## Task 9: Deepen QA strategy with concrete toolchain and file mapping

**Files:**
- Modify: `docs/blueprint/11_QA_TEST_STRATEGY.md` (append new §20 after the existing final §19 "Dogfood protocol")

**Interfaces:**
- Consumes: T1–T7 test cases from `06_SCHEDULING_ENGINE_SPEC.md` §23, SCH-001..006 from this file's own §4, and the `/src` structure from Task 7.

- [ ] **Step 1: Append the new section**

```markdown

## 20. Toolchain and file mapping

Concrete tooling for the tests described in §2–§16, given the Capacitor +
Svelte + TypeScript stack (`DECISIONS.md`, `08_ENGINEERING_ARCHITECTURE.md`):

- **Level 1 (scheduler unit tests):** Vitest. File:
  `src/scheduler/__tests__/schedule.spec.ts`. This is where the T1–T7
  cases from `06_SCHEDULING_ENGINE_SPEC.md` §23 and the SCH-001..006 cases
  from §4 of this document live — they are the same test set described
  twice at different levels of the doc set, not two separate suites.
- **Level 1 (property-based tests, §5):** Vitest + `fast-check`. File:
  `src/scheduler/__tests__/properties.spec.ts`.
- **Level 2 (domain/application integration):** Vitest, running against a
  real in-memory/temp-file SQLite instance via
  `@capacitor-community/sqlite`'s Node/Electron test mode (not a mock) —
  per this project's existing preference for integration tests to hit a
  real database. File: `src/database/__tests__/*.spec.ts`.
- **Level 3 (notification integration):** cannot be fully automated —
  `@capacitor/local-notifications` requires a real device/OS. Cover what's
  automatable (the diff algorithm in `09_NOTIFICATIONS_AND_BACKGROUND.md`
  §4, in isolation from the OS calls) with Vitest at
  `src/notifications/__tests__/planner.spec.ts`; the rest is the manual
  device matrix in §9/§17 of this document and §17 of
  `09_NOTIFICATIONS_AND_BACKGROUND.md`.
- **Level 4 (UI tests):** Vitest + `@testing-library/svelte`, one test
  file per screen component under `src/screens/__tests__/`.
- **Level 5 (manual device matrix):** unchanged — see §17.

Automated end-to-end testing (driving the real Capacitor app on a device
or emulator) is deferred past Phase A; the manual device matrix covers
this gap until it's worth the setup cost.
```

- [ ] **Step 2: Verify**

```bash
grep -n "## 20. Toolchain and file mapping" "docs/blueprint/11_QA_TEST_STRATEGY.md"
grep -n "fast-check" "docs/blueprint/11_QA_TEST_STRATEGY.md"
```

Expected: both return at least one match (fast-check already appeared once
in §5 before this edit, so expect 2 total for that grep).

- [ ] **Step 3: Commit**

```bash
git add docs/blueprint/11_QA_TEST_STRATEGY.md
git commit -m "docs(blueprint): add QA toolchain and test-file mapping for Capacitor stack"
```

---

## Task 10: Fix platform wording in the PRD

**Files:**
- Modify: `docs/blueprint/04_PRD_MVP.md`

- [ ] **Step 1: Replace the platform line**

Find (line 7):

```text
**Primary platform goal:** iOS + Android mobile application
```

Replace with:

```text
**Primary platform goal:** iOS + Android via Capacitor (single Svelte codebase, native shells — see `DECISIONS.md`)
```

- [ ] **Step 2: Verify**

```bash
grep -n "Primary platform goal" "docs/blueprint/04_PRD_MVP.md"
```

Expected: one match containing "Capacitor".

- [ ] **Step 3: Commit**

```bash
git add docs/blueprint/04_PRD_MVP.md
git commit -m "docs(blueprint): correct PRD platform wording to match locked stack"
```

---

## Task 11: Regenerate the file index

**Files:**
- Modify: `docs/blueprint/FILE_INDEX.md`

**Interfaces:**
- Consumes: final byte sizes of every file in `docs/blueprint/` after Tasks 1–10.

- [ ] **Step 1: Get current file sizes**

```bash
cd "docs/blueprint" && for f in *.md; do printf "%s\t%s\n" "$f" "$(du -h "$f" | cut -f1)"; done
```

- [ ] **Step 2: Rewrite the file**

Update `docs/blueprint/FILE_INDEX.md` — keep the existing table format and
column headers, update the `Generated:` date to 2026-09-05, add a new row
for `DECISIONS.md` (in filename order, so it sorts right after
`19_SOURCES.md` and before the existing `FILE_INDEX.md` self-row, matching
the existing convention of listing numbered files then unnumbered ones),
and update every size value using the output from Step 1.

- [ ] **Step 3: Verify**

```bash
grep -c "|" "docs/blueprint/FILE_INDEX.md"
```

Expected: 23 lines containing `|` (1 header + 1 separator + 21 file rows:
the original 20 plus `DECISIONS.md`).

```bash
grep -n "DECISIONS.md" "docs/blueprint/FILE_INDEX.md"
```

Expected: one match.

- [ ] **Step 4: Commit**

```bash
git add docs/blueprint/FILE_INDEX.md
git commit -m "docs(blueprint): regenerate file index"
```
