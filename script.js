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

function renderPlaceholder() {
  document.getElementById('day-panel').innerHTML = '<p>Aplicația se construiește…</p>';
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', renderPlaceholder);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toMinutes, fromMinutes, formatHHMM, toISODate, parseISODate,
    treatmentDayNumber, isMonth1, isWithinTreatmentWindow,
    buildDefaultEvents, applyTimeChange, markDoneNow, toggleDone
  };
}
