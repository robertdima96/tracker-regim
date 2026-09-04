const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toMinutes, fromMinutes, toISODate, parseISODate,
  treatmentDayNumber, isMonth1, isWithinTreatmentWindow,
  buildDefaultEvents, applyTimeChange, markDoneNow, toggleDone,
  mealWarning, nextEventId, isOverdue
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
