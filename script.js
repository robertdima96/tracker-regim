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
    buildDefaultEvents, applyTimeChange, markDoneNow, toggleDone,
    MEAL_MED_MAP, mealWarning, nextEventId, isOverdue,
    getConfig, setConfig, getDay, persistDay, resetDay, exportBackup, importBackup
  };
}
