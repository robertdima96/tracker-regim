# Tracker Tratament 3 Luni — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, no-build, no-backend HTML/CSS/JS app that tracks a 3-month medication + meal regimen (Nolpaza, Gastrofait, Asketon), with a cascading time-recalculation engine, a navigable monthly calendar, localStorage persistence, JSON backup, and a minimal PWA manifest.

**Architecture:** Single-page app with three files (`index.html`, `style.css`, `script.js`, all classic scripts — no `type="module"` — so it also runs from `file://`). `script.js` is organized top-to-bottom as: pure date/time utilities → default-schedule generator → cascade engine → warning/status helpers → localStorage persistence + backup → DOM rendering/event wiring. Pure logic functions are exported via a `module.exports` guard at the bottom so they can be unit-tested with Node's built-in test runner without any build step or bundler; the guard is a no-op in the browser.

**Tech Stack:** Vanilla HTML/CSS/JS, Google Fonts (Fraunces + IBM Plex Sans) via `<link>`, `localStorage`, Node's built-in `node:test`/`node:assert` for dev-only unit tests (not required to run or deploy the app).

**Spec:** `docs/superpowers/specs/2026-09-04-treatment-tracker-design.md`

## Global Constraints

- No build step, no bundler, no framework, no backend — plain files only.
- `script.js` loaded as a classic script (no `type="module"`) so the app works from `file://` and from GitHub Pages.
- Persistence is `localStorage` only: `tracker:config` (global) and `tracker:day:YYYY-MM-DD` (per day), written only after the first user interaction with that day.
- Treatment window = 90 days starting at `treatmentStartDate` (day 1 = start date). Month 1 = day N ≤ 30 (Nolpaza 2×/day incl. `nolpaza-pm`). Months 2-3 = 31 ≤ N ≤ 90 (Nolpaza 1×/day, no `nolpaza-pm`).
- Cascade rule: changing an event's time (manual edit or "am luat/mâncat acum") computes `delta = new - old` (can be negative) and applies the same delta to every **later** event in the day's array that is **not** `done`. `done` events never move retroactively. No clamping/blocking of the cascade — only visual warnings.
- Meal warning: red icon + text if `gap(meal.time, matching gastrofait.time) < 45` OR `gap(meal.time, matching asketon.time) < 15` (gap can be negative).
- Colors (locked, all pairings contrast-checked): `--paper:#F6F3EC` `--paper-card:#FFFFFF` `--ink:#2B2822` `--muted:#6B6558` `--line:#E3DDCE` `--sage:#5F7A5F` `--sage-soft:#DCE8DC` `--terracotta:#A6543D` `--terracotta-soft:#F3DED4` `--warn:#B3261E` `--warn-soft:#FBE4E1` `--white:#FFFFFF`. Solid buttons (`--sage`, `--terracotta`, `--warn`) always pair with `--white` text; soft/badge backgrounds (`*-soft`) always pair with `--ink` text. Never mix a solid accent background with `--ink` text or a soft background with `--white` text.
- Fonts: Fraunces (serif, titles/times) + IBM Plex Sans (sans, body), loaded from Google Fonts.

---

## File Structure

- `index.html` — markup shell: header (title, start date, wake/sleep, backup buttons), banner, calendar container, day-panel container. Links `style.css`, Google Fonts, `manifest.json`, loads `script.js` at the end of `<body>`.
- `style.css` — CSS custom properties (palette above), reset, typography, mobile-first layout, calendar grid, timeline/card styles, button states, warning styles.
- `script.js` — single classic script, organized in this order:
  1. Date/time utilities
  2. Default schedule generator
  3. Cascade engine (the "regula de aur")
  4. Warning/status helpers
  5. Persistence + backup
  6. DOM rendering + event wiring
  7. `module.exports` guard (Node test interop only)
- `manifest.json` — PWA manifest with an inline SVG icon reference.
- `icon.svg` — simple flat icon (single circle/leaf on `--sage`), referenced by the manifest.
- `README.md` — GitHub Pages deploy steps (private repo caveat), local/offline usage.
- `tests/schedule.test.js` — Node (`node:test`) unit tests for the pure-logic functions (utilities, generator, cascade, warnings). Dev-only; not needed to run or deploy the app.

---

### Task 1: Project scaffold + visual shell

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `script.js`

**Interfaces:**
- Produces: DOM ids consumed by later tasks — `#banner`, `#calendar`, `#day-panel`, `#start-date-input`, `#wake-time-input`, `#sleep-time-input`, `#export-backup-btn`, `#import-backup-input`.

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tracker tratament</title>
<meta name="theme-color" content="#F6F3EC">
<link rel="manifest" href="manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="app-header">
  <h1>Tracker tratament</h1>
  <div class="header-controls">
    <label>Data de start<input type="date" id="start-date-input"></label>
    <label>Trezire<input type="time" id="wake-time-input"></label>
    <label>Culcare<input type="time" id="sleep-time-input"></label>
    <button id="export-backup-btn" type="button">Descarcă backup</button>
    <label class="file-label">Încarcă backup<input type="file" id="import-backup-input" accept="application/json"></label>
  </div>
</header>

<main>
  <div id="banner" class="banner"></div>
  <section id="calendar" class="calendar"></section>
  <section id="day-panel" class="day-panel"><p>Se încarcă…</p></section>
</main>

<script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `style.css` with palette, reset, and base layout**

```css
:root {
  --paper: #F6F3EC;
  --paper-card: #FFFFFF;
  --ink: #2B2822;
  --muted: #6B6558;
  --line: #E3DDCE;
  --sage: #5F7A5F;
  --sage-soft: #DCE8DC;
  --terracotta: #A6543D;
  --terracotta-soft: #F3DED4;
  --warn: #B3261E;
  --warn-soft: #FBE4E1;
  --white: #FFFFFF;
  --font-serif: 'Fraunces', Georgia, serif;
  --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  line-height: 1.4;
}

h1, .event-time, .banner-title {
  font-family: var(--font-serif);
}

.app-header {
  padding: 1rem;
  border-bottom: 1px solid var(--line);
}

.header-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
}

.header-controls label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  color: var(--muted);
}

button {
  font-family: var(--font-sans);
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  background: var(--sage);
  color: var(--white);
}

button.terracotta { background: var(--terracotta); color: var(--white); }
button.ghost { background: var(--paper-card); color: var(--ink); border: 1px solid var(--line); }

main { max-width: 480px; margin: 0 auto; padding: 1rem; }

.banner {
  background: var(--sage-soft);
  color: var(--ink);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-family: var(--font-serif);
}
```

- [ ] **Step 3: Create `script.js` with a placeholder render call**

```js
function renderPlaceholder() {
  document.getElementById('day-panel').innerHTML = '<p>Aplicația se construiește…</p>';
}

document.addEventListener('DOMContentLoaded', renderPlaceholder);
```

- [ ] **Step 4: Open `index.html` directly in a browser (double-click, `file://`) and verify**

Expected: paper-beige background, serif title, the header controls render without console errors, "Aplicația se construiește…" shows in the day-panel area.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css script.js
git commit -m "Add project scaffold with base layout and palette"
```

---

### Task 2: Date/time and treatment-window utilities (with tests)

**Files:**
- Modify: `script.js` (prepend utilities section, before the placeholder code)
- Create: `tests/schedule.test.js`

**Interfaces:**
- Produces: `toMinutes(hhmm: string): number`, `fromMinutes(mins: number): string`, `formatHHMM(date: Date): string`, `toISODate(date: Date): string`, `parseISODate(iso: string): Date`, `treatmentDayNumber(dateISO: string, startISO: string): number`, `isMonth1(dayNumber: number): boolean`, `isWithinTreatmentWindow(dayNumber: number): boolean`.

- [ ] **Step 1: Write `tests/schedule.test.js` with failing tests for the utilities**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toMinutes, fromMinutes, toISODate, parseISODate,
  treatmentDayNumber, isMonth1, isWithinTreatmentWindow
} = require('../script.js');

test('toMinutes converts HH:MM to minutes since midnight', () => {
  assert.equal(toMinutes('00:00'), 0);
  assert.equal(toMinutes('07:30'), 450);
  assert.equal(toMinutes('23:59'), 1439);
});

test('fromMinutes converts minutes back to HH:MM, wrapping around midnight', () => {
  assert.equal(fromMinutes(0), '00:00');
  assert.equal(fromMinutes(450), '07:30');
  assert.equal(fromMinutes(1440), '00:00');
  assert.equal(fromMinutes(-30), '23:30');
  assert.equal(fromMinutes(1500), '01:00');
});

test('toISODate / parseISODate round-trip local dates', () => {
  const d = parseISODate('2026-09-04');
  assert.equal(toISODate(d), '2026-09-04');
});

test('treatmentDayNumber: day 1 is the start date itself', () => {
  assert.equal(treatmentDayNumber('2026-09-01', '2026-09-01'), 1);
  assert.equal(treatmentDayNumber('2026-09-04', '2026-09-01'), 4);
  assert.equal(treatmentDayNumber('2026-08-31', '2026-09-01'), 0);
});

test('isMonth1 is true through day 30, false from day 31', () => {
  assert.equal(isMonth1(1), true);
  assert.equal(isMonth1(30), true);
  assert.equal(isMonth1(31), false);
});

test('isWithinTreatmentWindow covers exactly days 1..90', () => {
  assert.equal(isWithinTreatmentWindow(0), false);
  assert.equal(isWithinTreatmentWindow(1), true);
  assert.equal(isWithinTreatmentWindow(90), true);
  assert.equal(isWithinTreatmentWindow(91), false);
});
```

- [ ] **Step 2: Run tests to verify they fail (functions don't exist yet)**

Run: `node --test tests/`
Expected: FAIL — `toMinutes is not a function` (or similar) for every test.

- [ ] **Step 3: Add the utilities to the top of `script.js`**

```js
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

function formatHHMM(date) {
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function toISODate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function treatmentDayNumber(dateISO, startISO) {
  const diffMs = parseISODate(dateISO) - parseISODate(startISO);
  return Math.round(diffMs / 86400000) + 1;
}

function isMonth1(dayNumber) {
  return dayNumber <= 30;
}

function isWithinTreatmentWindow(dayNumber) {
  return dayNumber >= 1 && dayNumber <= 90;
}
```

- [ ] **Step 4: Add the Node export guard at the very bottom of `script.js`**

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toMinutes, fromMinutes, formatHHMM, toISODate, parseISODate,
    treatmentDayNumber, isMonth1, isWithinTreatmentWindow
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS — all 7 tests green.

- [ ] **Step 6: Reload `index.html` in the browser and confirm no console errors** (the export guard is a no-op there since `module` is undefined).

- [ ] **Step 7: Commit**

```bash
git add script.js tests/schedule.test.js
git commit -m "Add date/time and treatment-window utilities with tests"
```

---

### Task 3: Default schedule generator (with tests)

**Files:**
- Modify: `script.js` (add generator section after utilities)
- Modify: `tests/schedule.test.js`

**Interfaces:**
- Consumes: `toMinutes`, `fromMinutes` (Task 2)
- Produces: `buildDefaultEvents(wakeTime: string, sleepTime: string, month1: boolean): Array<{id, type, label, time, done}>`

- [ ] **Step 1: Add failing tests to `tests/schedule.test.js`**

```js
const { buildDefaultEvents } = require('../script.js');

test('buildDefaultEvents produces 12 events in month 1, in the spec order', () => {
  const events = buildDefaultEvents('07:00', '23:00', true);
  assert.deepEqual(events.map(e => e.id), [
    'nolpaza-am', 'gastrofait-mic', 'asketon-mic', 'mic-dejun',
    'gastrofait-pranz', 'asketon-pranz', 'pranz',
    'gastrofait-cina', 'asketon-cina', 'cina',
    'nolpaza-pm', 'gastrofait-culcare'
  ]);
});

test('buildDefaultEvents omits nolpaza-pm outside month 1', () => {
  const events = buildDefaultEvents('07:00', '23:00', false);
  assert.equal(events.some(e => e.id === 'nolpaza-pm'), false);
  assert.equal(events.length, 11);
});

test('buildDefaultEvents computes times per the spec heuristics', () => {
  const events = buildDefaultEvents('07:00', '23:00', true);
  const byId = Object.fromEntries(events.map(e => [e.id, e.time]));
  assert.equal(byId['nolpaza-am'], '07:00');
  assert.equal(byId['mic-dejun'], '08:10');
  assert.equal(byId['gastrofait-mic'], '07:10');
  assert.equal(byId['asketon-mic'], '07:50');
  assert.equal(byId['pranz'], '13:10');
  assert.equal(byId['cina'], '19:00');
  assert.equal(byId['gastrofait-cina'], '18:00');
  assert.equal(byId['asketon-cina'], '18:40');
  assert.equal(byId['nolpaza-pm'], '21:15');
  assert.equal(byId['gastrofait-culcare'], '22:50');
});

test('buildDefaultEvents: every event starts as not done', () => {
  const events = buildDefaultEvents('07:00', '23:00', true);
  assert.ok(events.every(e => e.done === false));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `buildDefaultEvents is not a function`.

- [ ] **Step 3: Implement `buildDefaultEvents` in `script.js`**

```js
function buildDefaultEvents(wakeTime, sleepTime, month1) {
  const W = toMinutes(wakeTime);
  const S = toMinutes(sleepTime);
  const breakfast = W + 70;
  const lunch = breakfast + 300;
  const dinner = S - 240;

  const events = [
    { id: 'nolpaza-am', type: 'med', label: 'Nolpaza 40mg', time: fromMinutes(W), done: false },
    { id: 'gastrofait-mic', type: 'med', label: 'Gastrofait', time: fromMinutes(breakfast - 60), done: false },
    { id: 'asketon-mic', type: 'med', label: 'Asketon', time: fromMinutes(breakfast - 20), done: false },
    { id: 'mic-dejun', type: 'meal', label: 'Mic dejun', time: fromMinutes(breakfast), done: false },
    { id: 'gastrofait-pranz', type: 'med', label: 'Gastrofait', time: fromMinutes(lunch - 60), done: false },
    { id: 'asketon-pranz', type: 'med', label: 'Asketon', time: fromMinutes(lunch - 20), done: false },
    { id: 'pranz', type: 'meal', label: 'Prânz', time: fromMinutes(lunch), done: false },
    { id: 'gastrofait-cina', type: 'med', label: 'Gastrofait', time: fromMinutes(dinner - 60), done: false },
    { id: 'asketon-cina', type: 'med', label: 'Asketon', time: fromMinutes(dinner - 20), done: false },
    { id: 'cina', type: 'meal', label: 'Cină', time: fromMinutes(dinner), done: false },
  ];

  if (month1) {
    events.push({ id: 'nolpaza-pm', type: 'med', label: 'Nolpaza 40mg', time: fromMinutes(dinner + 135), done: false });
  }

  events.push({ id: 'gastrofait-culcare', type: 'med', label: 'Gastrofait', time: fromMinutes(S - 10), done: false });

  return events;
}
```

- [ ] **Step 4: Update the export guard to include `buildDefaultEvents`**

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add script.js tests/schedule.test.js
git commit -m "Add default schedule generator with tests"
```

---

### Task 4: Cascade recalculation engine (with tests) — the "regula de aur"

**Files:**
- Modify: `script.js` (add cascade section)
- Modify: `tests/schedule.test.js`

**Interfaces:**
- Consumes: `toMinutes`, `fromMinutes` (Task 2)
- Produces: `applyTimeChange(day: {events}, eventId: string, newTime: string): day`, `markDoneNow(day, eventId: string, nowTime?: string): day`, `toggleDone(day, eventId: string, doneValue: boolean): day`

- [ ] **Step 1: Add failing tests**

```js
const { applyTimeChange, markDoneNow, toggleDone } = require('../script.js');

function sampleDay() {
  return {
    events: [
      { id: 'a', type: 'med', label: 'A', time: '07:00', done: false },
      { id: 'b', type: 'med', label: 'B', time: '07:10', done: false },
      { id: 'c', type: 'meal', label: 'C', time: '08:00', done: false },
      { id: 'd', type: 'med', label: 'D', time: '12:00', done: false },
    ]
  };
}

test('applyTimeChange shifts later, not-done events by the same positive delta', () => {
  const day = sampleDay();
  applyTimeChange(day, 'a', '07:30'); // +30 min
  assert.equal(day.events[0].time, '07:30');
  assert.equal(day.events[1].time, '07:40');
  assert.equal(day.events[2].time, '08:30');
  assert.equal(day.events[3].time, '12:30');
});

test('applyTimeChange shifts later events by a negative delta symmetrically', () => {
  const day = sampleDay();
  applyTimeChange(day, 'a', '06:40'); // -20 min
  assert.equal(day.events[1].time, '06:50');
  assert.equal(day.events[2].time, '07:40');
  assert.equal(day.events[3].time, '11:40');
});

test('applyTimeChange never moves events before the changed one', () => {
  const day = sampleDay();
  applyTimeChange(day, 'c', '09:00');
  assert.equal(day.events[0].time, '07:00');
  assert.equal(day.events[1].time, '07:10');
});

test('applyTimeChange never moves events already marked done', () => {
  const day = sampleDay();
  day.events[2].done = true; // 'c' is done
  applyTimeChange(day, 'a', '07:30');
  assert.equal(day.events[2].time, '08:00'); // untouched
  assert.equal(day.events[3].time, '12:30'); // still shifts, it's after 'c' but not done
});

test('markDoneNow sets the time and marks done, cascading like applyTimeChange', () => {
  const day = sampleDay();
  markDoneNow(day, 'a', '07:45');
  assert.equal(day.events[0].time, '07:45');
  assert.equal(day.events[0].done, true);
  assert.equal(day.events[1].time, '07:55');
});

test('toggleDone flips the done flag without changing any times', () => {
  const day = sampleDay();
  toggleDone(day, 'a', true);
  assert.equal(day.events[0].done, true);
  assert.equal(day.events[0].time, '07:00');
  toggleDone(day, 'a', false);
  assert.equal(day.events[0].done, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — cascade functions don't exist yet.

- [ ] **Step 3: Implement the cascade engine in `script.js`**

```js
function applyTimeChange(day, eventId, newTime) {
  const events = day.events;
  const idx = events.findIndex(e => e.id === eventId);
  const delta = toMinutes(newTime) - toMinutes(events[idx].time);

  events[idx].time = newTime;

  if (delta !== 0) {
    for (let i = idx + 1; i < events.length; i++) {
      if (!events[i].done) {
        events[i].time = fromMinutes(toMinutes(events[i].time) + delta);
      }
    }
  }
  return day;
}

function markDoneNow(day, eventId, nowTime) {
  const time = nowTime || formatHHMM(new Date());
  applyTimeChange(day, eventId, time);
  day.events.find(e => e.id === eventId).done = true;
  return day;
}

function toggleDone(day, eventId, doneValue) {
  day.events.find(e => e.id === eventId).done = doneValue;
  return day;
}
```

- [ ] **Step 4: Update the export guard to include the three cascade functions**

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add script.js tests/schedule.test.js
git commit -m "Add cascade recalculation engine with tests"
```

---

### Task 5: Warning and status helpers (with tests)

**Files:**
- Modify: `script.js`
- Modify: `tests/schedule.test.js`

**Interfaces:**
- Consumes: `toMinutes` (Task 2)
- Produces: `MEAL_MED_MAP: Record<string, {gastrofait: string, asketon: string}>`, `mealWarning(events: Array, mealId: string): boolean`, `nextEventId(events: Array): string | null`, `isOverdue(event, nowMinutes: number): boolean`

- [ ] **Step 1: Add failing tests**

```js
const { mealWarning, nextEventId, isOverdue } = require('../script.js');

function mealDay() {
  return [
    { id: 'gastrofait-mic', type: 'med', time: '07:10', done: false },
    { id: 'asketon-mic', type: 'med', time: '07:50', done: false },
    { id: 'mic-dejun', type: 'meal', time: '08:10', done: false },
  ];
}

test('mealWarning is false when both gaps meet the thresholds', () => {
  assert.equal(mealWarning(mealDay(), 'mic-dejun'), false); // gaps: 60, 20
});

test('mealWarning is true when the gastrofait gap is under 45 minutes', () => {
  const events = mealDay();
  events[0].time = '07:40'; // gap becomes 30
  assert.equal(mealWarning(events, 'mic-dejun'), true);
});

test('mealWarning is true when the asketon gap is under 15 minutes', () => {
  const events = mealDay();
  events[1].time = '08:00'; // gap becomes 10
  assert.equal(mealWarning(events, 'mic-dejun'), true);
});

test('mealWarning is true when a dose lands after the meal (negative gap)', () => {
  const events = mealDay();
  events[0].time = '08:20';
  assert.equal(mealWarning(events, 'mic-dejun'), true);
});

test('nextEventId returns the first not-done event, or null if all done', () => {
  const events = [
    { id: 'a', done: true }, { id: 'b', done: false }, { id: 'c', done: false }
  ];
  assert.equal(nextEventId(events), 'b');
  events.forEach(e => e.done = true);
  assert.equal(nextEventId(events), null);
});

test('isOverdue is true only for not-done events whose time has passed', () => {
  assert.equal(isOverdue({ time: '07:00', done: false }, toMinutes('08:00')), true);
  assert.equal(isOverdue({ time: '07:00', done: true }, toMinutes('08:00')), false);
  assert.equal(isOverdue({ time: '09:00', done: false }, toMinutes('08:00')), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — functions don't exist yet.

- [ ] **Step 3: Implement the helpers in `script.js`**

```js
const MEAL_MED_MAP = {
  'mic-dejun': { gastrofait: 'gastrofait-mic', asketon: 'asketon-mic' },
  'pranz': { gastrofait: 'gastrofait-pranz', asketon: 'asketon-pranz' },
  'cina': { gastrofait: 'gastrofait-cina', asketon: 'asketon-cina' },
};

function mealWarning(events, mealId) {
  const map = MEAL_MED_MAP[mealId];
  const meal = events.find(e => e.id === mealId);
  const gastrofait = events.find(e => e.id === map.gastrofait);
  const asketon = events.find(e => e.id === map.asketon);
  const gapGastrofait = toMinutes(meal.time) - toMinutes(gastrofait.time);
  const gapAsketon = toMinutes(meal.time) - toMinutes(asketon.time);
  return gapGastrofait < 45 || gapAsketon < 15;
}

function nextEventId(events) {
  const next = events.find(e => !e.done);
  return next ? next.id : null;
}

function isOverdue(event, nowMinutes) {
  return !event.done && toMinutes(event.time) < nowMinutes;
}
```

- [ ] **Step 4: Update the export guard to include `MEAL_MED_MAP`, `mealWarning`, `nextEventId`, `isOverdue`**

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add script.js tests/schedule.test.js
git commit -m "Add meal warning and next/overdue status helpers with tests"
```

---

### Task 6: Persistence layer + JSON backup

**Files:**
- Modify: `script.js` (add persistence section; this section is browser-only, not unit tested with Node since it depends on `localStorage`)

**Interfaces:**
- Consumes: `buildDefaultEvents`, `treatmentDayNumber`, `isMonth1` (Tasks 2-3)
- Produces: `getConfig(): {treatmentStartDate, wakeTime, sleepTime}`, `setConfig(partial: object): void`, `getDay(dateISO: string): {date, wakeTime, sleepTime, events, persisted: boolean}`, `persistDay(day): void`, `resetDay(dateISO: string): day`, `exportBackup(): string`, `importBackup(jsonString: string): void`

- [ ] **Step 1: Implement config storage in `script.js`**

```js
const CONFIG_KEY = 'tracker:config';
const DEFAULT_CONFIG = { treatmentStartDate: null, wakeTime: '07:00', sleepTime: '23:00' };

function getConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  return raw ? Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw)) : Object.assign({}, DEFAULT_CONFIG);
}

function setConfig(partial) {
  const merged = Object.assign(getConfig(), partial);
  localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
}
```

- [ ] **Step 2: Implement per-day get/persist/reset**

```js
function dayKey(dateISO) {
  return 'tracker:day:' + dateISO;
}

function getDay(dateISO) {
  const raw = localStorage.getItem(dayKey(dateISO));
  if (raw) {
    const day = JSON.parse(raw);
    day.persisted = true;
    return day;
  }
  const config = getConfig();
  const dayNumber = config.treatmentStartDate ? treatmentDayNumber(dateISO, config.treatmentStartDate) : 0;
  const month1 = isMonth1(dayNumber);
  return {
    date: dateISO,
    wakeTime: config.wakeTime,
    sleepTime: config.sleepTime,
    events: buildDefaultEvents(config.wakeTime, config.sleepTime, month1),
    persisted: false,
  };
}

function persistDay(day) {
  const toSave = { date: day.date, wakeTime: day.wakeTime, sleepTime: day.sleepTime, events: day.events };
  localStorage.setItem(dayKey(day.date), JSON.stringify(toSave));
}

function resetDay(dateISO) {
  localStorage.removeItem(dayKey(dateISO));
  return getDay(dateISO);
}
```

- [ ] **Step 3: Implement backup export/import**

```js
function exportBackup() {
  const data = { config: getConfig(), days: {} };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.indexOf('tracker:day:') === 0) {
      data.days[key.slice('tracker:day:'.length)] = JSON.parse(localStorage.getItem(key));
    }
  }
  return JSON.stringify(data, null, 2);
}

function importBackup(jsonString) {
  const data = JSON.parse(jsonString);
  localStorage.setItem(CONFIG_KEY, JSON.stringify(data.config));
  Object.keys(data.days).forEach(dateISO => {
    localStorage.setItem(dayKey(dateISO), JSON.stringify(data.days[dateISO]));
  });
}
```

- [ ] **Step 4: Manual verification in the browser**

Open `index.html`, in the devtools console run:
```js
setConfig({ treatmentStartDate: '2026-09-01' });
const day = getDay('2026-09-04');
console.log(day.events.length, day.persisted); // 12 false (month 1, ephemeral)
persistDay(day);
console.log(getDay('2026-09-04').persisted); // true
console.log(exportBackup()); // JSON with config + one day
```
Expected: values match the comments; no console errors.

- [ ] **Step 5: Commit**

```bash
git add script.js
git commit -m "Add localStorage persistence layer and JSON backup"
```

---

### Task 7: Day panel rendering + interactions

**Files:**
- Modify: `script.js` (add rendering section, replacing the Task 1 placeholder)
- Modify: `style.css` (timeline/card/warning styles)

**Interfaces:**
- Consumes: `getDay`, `persistDay`, `resetDay` (Task 6), `applyTimeChange`, `markDoneNow`, `toggleDone` (Task 4), `mealWarning`, `nextEventId`, `isOverdue` (Task 5), `toMinutes`, `formatHHMM` (Task 2)
- Produces: `renderDayPanel(dateISO: string): void`, module-level `selectedDateISO` used by Task 8

- [ ] **Step 1: Add timeline/card CSS to `style.css`**

```css
.day-panel { position: relative; }

.timeline {
  list-style: none;
  margin: 0;
  padding: 0 0 0 1rem;
  border-left: 2px solid var(--line);
}

.event-card {
  background: var(--paper-card);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin: 0 0 0.75rem 1rem;
  position: relative;
}

.event-card::before {
  content: '';
  position: absolute;
  left: -1.55rem;
  top: 1.1rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--sage);
}

.event-card.meal::before { background: var(--terracotta); }

.event-card.next { outline: 2px solid var(--sage); }
.event-card.overdue { background: var(--sage-soft); }
.event-card.meal.overdue { background: var(--terracotta-soft); }

.event-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.event-label { font-family: var(--font-serif); font-weight: 600; margin-right: auto; }

.warning {
  color: var(--warn);
  background: var(--warn-soft);
  border-radius: 8px;
  padding: 0.2rem 0.5rem;
  font-size: 0.85rem;
  display: inline-block;
  margin-top: 0.4rem;
}

.step-btn { padding: 0.2rem 0.5rem; font-size: 0.8rem; }
```

- [ ] **Step 2: Add day-panel rendering to `script.js`, replacing `renderPlaceholder`**

```js
let selectedDateISO = toISODate(new Date());

function renderDayPanel(dateISO) {
  selectedDateISO = dateISO;
  const config = getConfig();
  const container = document.getElementById('day-panel');
  const bannerEl = document.getElementById('banner');

  if (!config.treatmentStartDate) {
    bannerEl.textContent = 'Setează mai întâi data de start a tratamentului.';
    container.innerHTML = '';
    return;
  }

  const dayNumber = treatmentDayNumber(dateISO, config.treatmentStartDate);

  if (!isWithinTreatmentWindow(dayNumber)) {
    bannerEl.textContent = 'În afara perioadei de tratament.';
    container.innerHTML = '';
    return;
  }

  bannerEl.textContent = 'Ziua ' + dayNumber + ' din 90 — ' + (isMonth1(dayNumber) ? 'Luna 1' : 'Lunile 2-3');

  const day = getDay(dateISO);
  const nowMinutes = (dateISO === toISODate(new Date())) ? toMinutes(formatHHMM(new Date())) : -1;
  const nextId = nextEventId(day.events);

  const cards = day.events.map(event => {
    const overdue = nowMinutes >= 0 && isOverdue(event, nowMinutes);
    const classes = ['event-card', event.type, event.id === nextId ? 'next' : '', overdue ? 'overdue' : ''].filter(Boolean).join(' ');
    const warn = event.type === 'meal' && mealWarning(day.events, event.id);
    return (
      '<li class="' + classes + '" data-id="' + event.id + '">' +
        '<div class="event-row">' +
          '<span class="event-label">' + event.label + '</span>' +
          '<input type="time" class="event-time" value="' + event.time + '" data-id="' + event.id + '">' +
          '<button type="button" class="step-btn ghost" data-step="-5" data-id="' + event.id + '">-5</button>' +
          '<button type="button" class="step-btn ghost" data-step="5" data-id="' + event.id + '">+5</button>' +
          '<label><input type="checkbox" class="event-done" data-id="' + event.id + '" ' + (event.done ? 'checked' : '') + '> făcut</label>' +
          '<button type="button" class="mark-now terracotta" data-id="' + event.id + '">Am luat/mâncat acum</button>' +
        '</div>' +
        (warn ? '<div class="warning">⚠ prea aproape de masă</div>' : '') +
      '</li>'
    );
  }).join('');

  container.innerHTML =
    '<ul class="timeline">' + cards + '</ul>' +
    '<button type="button" id="reset-day-btn" class="ghost">Resetează ziua</button>';

  attachDayPanelListeners(day);
}

function attachDayPanelListeners(day) {
  const container = document.getElementById('day-panel');

  container.querySelectorAll('.event-time').forEach(input => {
    input.addEventListener('change', () => {
      applyTimeChange(day, input.dataset.id, input.value);
      persistDay(day);
      renderDayPanel(day.date);
    });
  });

  container.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const event = day.events.find(e => e.id === btn.dataset.id);
      const newTime = fromMinutes(toMinutes(event.time) + Number(btn.dataset.step));
      applyTimeChange(day, btn.dataset.id, newTime);
      persistDay(day);
      renderDayPanel(day.date);
    });
  });

  container.querySelectorAll('.event-done').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      toggleDone(day, checkbox.dataset.id, checkbox.checked);
      persistDay(day);
      renderDayPanel(day.date);
    });
  });

  container.querySelectorAll('.mark-now').forEach(btn => {
    btn.addEventListener('click', () => {
      markDoneNow(day, btn.dataset.id);
      persistDay(day);
      renderDayPanel(day.date);
    });
  });

  document.getElementById('reset-day-btn').addEventListener('click', () => {
    if (confirm('Sigur resetezi ziua la programul implicit?')) {
      resetDay(day.date);
      renderDayPanel(day.date);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => renderDayPanel(selectedDateISO));
```

- [ ] **Step 3: Manual browser verification**

Open `index.html`. In the console, run `setConfig({ treatmentStartDate: toISODate(new Date()) })`, reload. Verify:
- The banner shows "Ziua 1 din 90 — Luna 1".
- 12 event cards render in the documented order, first one highlighted as "next".
- Clicking "Am luat/mâncat acum" on the first card sets its time to now, marks it done, and shifts every later not-done card's time by the same delta.
- Manually checking "făcut" on a later card, then changing an earlier card's time, confirms the checked one does not move.
- Editing a `mic-dejun` Gastrofait time to less than 45 minutes before breakfast shows the red warning on the `mic-dejun` card.
- "Resetează ziua" asks for confirmation and restores the default schedule.

- [ ] **Step 4: Commit**

```bash
git add script.js style.css
git commit -m "Add day panel rendering with cascade, warnings, and reset"
```

---

### Task 8: Calendar rendering + navigation

**Files:**
- Modify: `script.js` (add calendar section)
- Modify: `style.css` (calendar grid styles)

**Interfaces:**
- Consumes: `getConfig`, `treatmentDayNumber`, `isWithinTreatmentWindow` (Tasks 2, 6), `renderDayPanel`, `selectedDateISO` (Task 7)
- Produces: `renderCalendar(viewYear: number, viewMonth: number): void`

- [ ] **Step 1: Add calendar grid CSS**

```css
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.calendar-day {
  aspect-ratio: 1;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: var(--paper-card);
  color: var(--ink);
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid var(--line);
}
.calendar-day.in-window { background: var(--sage-soft); border-color: var(--sage); }
.calendar-day.selected { outline: 2px solid var(--terracotta); }
.calendar-day.empty { visibility: hidden; }
```

- [ ] **Step 2: Add calendar rendering to `script.js`**

```js
let calendarViewYear, calendarViewMonth;

function renderCalendar(viewYear, viewMonth) {
  calendarViewYear = viewYear;
  calendarViewMonth = viewMonth;
  const config = getConfig();
  const container = document.getElementById('calendar');

  const first = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7; // Monday-first grid

  let cells = '';
  for (let i = 0; i < leadingBlanks; i++) cells += '<div class="calendar-day empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const iso = toISODate(date);
    const dayNumber = config.treatmentStartDate ? treatmentDayNumber(iso, config.treatmentStartDate) : 0;
    const classes = ['calendar-day'];
    if (isWithinTreatmentWindow(dayNumber)) classes.push('in-window');
    if (iso === selectedDateISO) classes.push('selected');
    cells += '<div class="' + classes.join(' ') + '" data-date="' + iso + '">' + d + '</div>';
  }

  const monthLabel = first.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

  container.innerHTML =
    '<div class="calendar-header">' +
      '<button type="button" id="cal-prev" class="ghost">‹</button>' +
      '<strong>' + monthLabel + '</strong>' +
      '<button type="button" id="cal-today" class="ghost">Azi</button>' +
      '<button type="button" id="cal-next" class="ghost">›</button>' +
    '</div>' +
    '<div class="calendar-grid">' + cells + '</div>';

  document.getElementById('cal-prev').addEventListener('click', () => {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    renderCalendar(prev.getFullYear(), prev.getMonth());
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    renderCalendar(next.getFullYear(), next.getMonth());
  });
  document.getElementById('cal-today').addEventListener('click', () => {
    const today = new Date();
    renderCalendar(today.getFullYear(), today.getMonth());
    renderDayPanel(toISODate(today));
  });
  container.querySelectorAll('.calendar-day[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      renderDayPanel(cell.dataset.date);
      renderCalendar(calendarViewYear, calendarViewMonth);
    });
  });
}
```

- [ ] **Step 3: Wire initial render to open on today's calendar and day panel**

Replace the `DOMContentLoaded` listener from Task 7 with:

```js
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  renderCalendar(today.getFullYear(), today.getMonth());
  renderDayPanel(toISODate(today));
});
```

- [ ] **Step 4: Manual browser verification**

Reload `index.html`. Verify: calendar opens on the current month with today selected/outlined, the treatment-window days (once a start date is set) have the sage-soft background, prev/next arrows navigate months, "Azi" jumps back and reselects today, and clicking any day updates the day panel below.

- [ ] **Step 5: Commit**

```bash
git add script.js style.css
git commit -m "Add monthly calendar with treatment-window highlighting"
```

---

### Task 9: Header controls (start date, wake/sleep, backup buttons)

**Files:**
- Modify: `script.js` (wire header inputs)

**Interfaces:**
- Consumes: `getConfig`, `setConfig`, `exportBackup`, `importBackup` (Task 6), `renderCalendar` (Task 8), `renderDayPanel` (Task 7)

- [ ] **Step 1: Add header wiring to `script.js`, inside the same `DOMContentLoaded` listener**

```js
document.addEventListener('DOMContentLoaded', () => {
  const config = getConfig();
  document.getElementById('start-date-input').value = config.treatmentStartDate || '';
  document.getElementById('wake-time-input').value = config.wakeTime;
  document.getElementById('sleep-time-input').value = config.sleepTime;

  document.getElementById('start-date-input').addEventListener('change', (e) => {
    setConfig({ treatmentStartDate: e.target.value });
    renderCalendar(calendarViewYear, calendarViewMonth);
    renderDayPanel(selectedDateISO);
  });
  document.getElementById('wake-time-input').addEventListener('change', (e) => {
    setConfig({ wakeTime: e.target.value });
  });
  document.getElementById('sleep-time-input').addEventListener('change', (e) => {
    setConfig({ sleepTime: e.target.value });
  });

  document.getElementById('export-backup-btn').addEventListener('click', () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tracker-backup-' + toISODate(new Date()) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('import-backup-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Încărcarea unui backup suprascrie datele curente. Continui?')) return;
    const reader = new FileReader();
    reader.onload = () => {
      importBackup(reader.result);
      const today = new Date();
      renderCalendar(today.getFullYear(), today.getMonth());
      renderDayPanel(selectedDateISO);
    };
    reader.readAsText(file);
  });
});
```

- [ ] **Step 2: Manual browser verification**

Set a start date via the header input and confirm the banner/calendar update immediately. Change wake/sleep times and confirm they persist across a page reload (`getConfig()` in the console reflects the new values). Click "Descarcă backup" and confirm a `.json` file downloads with `config` and `days`. Edit a day, then use "Încarcă backup" with a previously downloaded file and confirm the edit is restored after confirming the overwrite prompt.

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "Wire header controls for config and JSON backup"
```

---

### Task 10: PWA manifest + icon

**Files:**
- Create: `manifest.json`
- Create: `icon.svg`

- [ ] **Step 1: Create `icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#5F7A5F"/>
  <circle cx="50" cy="50" r="28" fill="#F6F3EC"/>
</svg>
```

- [ ] **Step 2: Create `manifest.json`**

```json
{
  "name": "Tracker tratament",
  "short_name": "Tracker",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#F6F3EC",
  "theme_color": "#F6F3EC",
  "icons": [
    { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Step 3: Manual verification**

Open `index.html` in Chrome, open DevTools → Application → Manifest, and confirm it loads with no errors and shows the icon.

- [ ] **Step 4: Commit**

```bash
git add manifest.json icon.svg
git commit -m "Add minimal PWA manifest and icon"
```

---

### Task 11: README + deploy instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Tracker tratament

Aplicație statică (HTML/CSS/JS, fără build step, fără backend) pentru
urmărirea unui tratament de 3 luni. Toate datele rămân în `localStorage`-ul
browserului — nimic nu e trimis către niciun server.

## Rulare locală

Deschide `index.html` direct în browser (dublu-click) — funcționează și
offline, din `file://`.

## Deploy pe GitHub Pages

1. Creează un repo nou pe GitHub (recomandat: **privat** — vezi nota de mai jos).
2. Urcă toate fișierele (`index.html`, `style.css`, `script.js`,
   `manifest.json`, `icon.svg`) pe branch-ul `main`.
3. Settings → Pages → Source: branch `main`, folder `/ (root)`.
4. După un minut, site-ul e disponibil la
   `https://<user>.github.io/<nume-repo>/`.

### Notă despre confidențialitate

Datele reale (orele efectiv luate) nu ies niciodată din `localStorage`-ul
dispozitivului tău — nu sunt în cod, nu sunt în repo. Totuși, pe un cont
GitHub gratuit, un repo **privat** cu Pages activat generează în continuare
un URL tehnic accesibil oricui îl are (`user.github.io/repo`), doar
neindexat și nedescoperibil întâmplător — nu e control de acces real. Pentru
control de acces real (doar utilizatori logați cu acces la repo), e nevoie
de GitHub Pro/Team.

## Backup

Folosește "Descarcă backup" din antet pentru a salva periodic un fișier
JSON cu toate datele din `localStorage`. "Încarcă backup" restaurează dintr-un
astfel de fișier (suprascrie datele curente, cu confirmare).

## Teste (opțional, doar pentru dezvoltare)

Logica pură (calcul date, generare program implicit, cascadă, avertismente)
are teste Node în `tests/`. Nu sunt necesare pentru a rula sau găzdui
aplicația.

```bash
node --test tests/
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add README with GitHub Pages deploy instructions"
```

---

### Task 12: Final manual QA pass

**Files:** none (verification only; fix any files if issues are found)

- [ ] **Step 1: Full walkthrough in a real browser at a mobile viewport (~375px wide, DevTools responsive mode)**

Checklist:
- Set a start date ~20 days in the past; confirm today shows "Luna 1" and 12 events.
- Set a start date ~40 days in the past; confirm today shows "Lunile 2-3", 11 events, no `nolpaza-pm`.
- Mark several events done via "Am luat/mâncat acum" across a day; confirm the "next" highlight moves forward and overdue styling behaves correctly for times in the past.
- Trigger a meal warning (move a Gastrofait/Asketon within threshold) and confirm the red badge is legible (contrast) in both normal and `overdue` card backgrounds.
- Reset a day and confirm the confirmation prompt appears and defaults are restored.
- Export a backup, wipe `localStorage` via DevTools, reload, import the backup, confirm all data returns.
- Resize to ~375px width and confirm no horizontal scrolling, buttons remain tappable size, calendar grid stays 7 columns without overflow.

- [ ] **Step 2: Fix any issues found directly in `index.html` / `style.css` / `script.js`**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "Final QA fixes for treatment tracker"
```
