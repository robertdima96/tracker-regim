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
