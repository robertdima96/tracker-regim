const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toMinutes, fromMinutes, toISODate, parseISODate,
  treatmentDayNumber, isMonth1, isWithinTreatmentWindow,
  buildDefaultEvents
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
