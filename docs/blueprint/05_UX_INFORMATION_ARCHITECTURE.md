# UX & Information Architecture

## 1. UX goal

The product must make a complicated treatment feel simpler **without hiding the logic**.

The main experience should answer:

> “What happens next?”

not:

> “Here is your entire medication database.”

## 2. Navigation

Recommended bottom navigation:

1. **Today**
2. **Plan**
3. **History**
4. **You**

### Today
Execution surface.

### Plan
Configuration surface.

### History
Audit surface.

### You
Settings, notification health, privacy, export, later account.

## 3. Today screen hierarchy

### Layer 1 — Next action

Large card:

- event;
- time/window;
- state;
- primary action.

Example:

> **Take Gastrofait**  
> 08:47–08:57  
> 20–30 min before breakfast  
> `[Taken now]`

### Layer 2 — Consequence

If relevant:

> **Breakfast from 09:17**

or:

> **Next dose not before 16:13**

### Layer 3 — timeline

Visual flow:

```text
NOW
 │
 ● 08:47–08:57  Gastrofait
 │
 │ 20m
 │
 🍳 09:17  Breakfast
 │
 ● 12:30  Medication C
```

### Layer 4 — secondary tools

- When can I eat?
- I want to eat at…
- View plan
- Report schedule issue

## 4. Event states

Design states:

- upcoming;
- available now;
- due soon;
- due;
- late;
- taken;
- skipped;
- changed;
- blocked;
- conflict.

Avoid using color as the only distinction.

## 5. Rule Builder

Rule Builder should use sentence construction.

Example:

**When should you take this?**

`[ 60 ] [minutes] [before] [breakfast]`

Then:

**How strict is this?**

- Required timing
- Preferred timing

For MVP, consider hiding “strictness” unless necessary; all treatment constraints can initially be treated as hard, while meal preference is soft.

### Range example

`[20] to [30] minutes before [breakfast]`

Output preview:

> If breakfast is 09:00, this dose will be scheduled between 08:30 and 08:40.

## 6. Progressive disclosure

Simple flow first:

1. How many times?
2. Related to a meal?
3. How long before/after?

Advanced:
- minimum spacing;
- time windows;
- separate rules per dose;
- custom anchor;
- cross-medication relationship.

Do not show graph terminology to users.

## 7. Instruction source UI

After timing rule:

**Where does this instruction come from?**

- My doctor / clinician
- Pharmacist
- Medication leaflet/package
- My established routine
- Other

Display in details:

> Scheduling source: Doctor instructions

Never label something “doctor verified” unless actually verified.

## 8. Plan Review

Before activation:

```text
MORNING
08:00   Drug A
08:30–08:40 Drug B
09:00   Breakfast

MIDDAY
...

EVENING
...
```

If derived:

> Times will adapt when linked events change.

Potential button:

`Activate treatment`

## 9. Recalculation UX

When user logs:

> Drug A taken at 08:17

Do not dramatically animate the entire page.

Show subtle summary:

> **2 upcoming events adjusted**
>
> Gastrofait: 08:47–08:57  
> Breakfast: 09:17

`Why?`

This teaches the product.

## 10. “When can I eat?”

### Entry

Persistent contextual shortcut when at least one active rule affects meal timing.

### Result

> **Earliest breakfast: 09:17**
>
> Before breakfast:
> - Gastrofait between 08:47–08:57
>
> Why 09:17?
> - Drug A was taken at 08:17
> - Your rule requires 60 min before breakfast

### No restriction

> No active configured rule is currently delaying breakfast.

Avoid “It is safe to eat now.”

## 11. “I want to eat at…”

Flow:

1. choose meal;
2. choose desired time;
3. preview required events;
4. apply for today only / update routine.

Example:

> Dinner at 20:30  
> Take A at 19:30  
> Take B between 20:00–20:10

If impossible:

> This time conflicts with your current configured rules.

Show conflict; do not decide which instruction to ignore.

## 12. Snooze

Snooze options:

- 5m;
- 10m;
- 15m;
- choose time.

Potential later:
- until meal;
- until home;
- after current activity.

Important distinction:

**Snooze reminder** does not mean **change actual dose time** until dose is logged.

The projected schedule may optionally show “if taken at snoozed time…” but should not rewrite history before the event happens.

## 13. Skip

Prompt:

> Mark this dose as skipped?

Then:

> DoseFlow will record the skip. It will not determine a replacement dose unless you have explicit instructions configured.

Possible actions:

- Skip
- Cancel

## 14. History UX

Daily history:

```text
08:00 planned
08:17 taken
+17 min

08:47–08:57 revised window
08:53 taken

09:17 breakfast
09:22 actual
```

Allow view:

- original schedule;
- final schedule;
- actual timeline.

This can become valuable for clinician reports later.

## 15. Conflict UX

Conflict card:

> **Schedule conflict**
>
> Dinner is set to 21:00.
> Medication B must be 30 min after dinner.
> Medication B must also be at least 3h before bedtime at 23:00.
>
> These configured rules cannot all be satisfied.

Actions:
- Review dinner time
- Review medication timing
- Review bedtime
- Dismiss for now

No “Recommended fix” unless regulatory/clinical scope is deliberately expanded.

## 16. Empty states

### No plan
> Add your treatment instructions and DoseFlow will build today’s schedule.

### Plan configured, no events
> Nothing scheduled right now.

### Notifications disabled
> Reminders are off on this device.
> `[Open settings]`

## 17. Error philosophy

Avoid:
> Something went wrong.

Prefer:
> We could not calculate a valid time for Gastrofait because its meal anchor is missing.

## 18. Accessibility

Requirements:

- large text must not truncate drug name or time;
- VoiceOver/TalkBack reads state + time + instruction;
- primary actions have clear labels;
- timeline order is accessible in reading order;
- haptics are optional;
- motion reductions respected;
- not dependent on green/red;
- minimum tap target.

## 19. Design direction

Recommended: **Daily Flow**

Characteristics:
- calm;
- neutral;
- timeline-centric;
- no mascots;
- no aggressive “streak” mechanics;
- status hierarchy rather than health-dashboard clutter.

The app should visually resemble a highly reliable scheduling utility more than a hospital portal.

## 20. UX research tasks

Prototype and test:

1. add “60 minutes before breakfast”;
2. add “20–30 minutes before breakfast”;
3. understand a generated window;
4. log a late dose;
5. explain why breakfast moved;
6. use “When can I eat?”;
7. attempt an impossible schedule;
8. correct an accidentally logged administration.

Success criterion:
Users should understand the schedule without explanation from the researcher.

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

## 22. Mockup prompts (for ChatGPT image generation)

**Generate one screen per request, not all 13 in a single composite
image.** A first attempt at generating all screens as one grid produced a
generic blue/white clinical-app look, ignoring the style baseline below —
image models default very strongly toward "blue = medical/health app"
unless told not to, and that default wins even harder when generating many
panels at once, because per-panel style adherence degrades with panel
count. Explicit negative constraints (below) plus one-screen-at-a-time
generation avoids this.

Shared style baseline for every prompt below — include it in full each
time, and lead the image request with the negative constraints:

> Do NOT use blue or teal as a primary color. Do NOT give this a clinical,
> hospital, or generic "health app" look — no stethoscope/cross icons, no
> sterile white backgrounds. Instead: mobile app screen, portrait
> orientation, warm paper background (#F6F3EC), near-black warm ink text,
> sage green accent for medication-related elements, ocre/terracotta
> accent for meal-related elements, warm serif font for headings and
> times, clean sans-serif for body text, generous whitespace, rounded card
> corners, no harsh shadows. Calm and reliable, like a well-made
> scheduling utility — not a hospital portal, not a gamified habit-tracker.

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
