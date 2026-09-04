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

function renderPlaceholder() {
  document.getElementById('day-panel').innerHTML = '<p>Aplicația se construiește…</p>';
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', renderPlaceholder);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toMinutes, fromMinutes, formatHHMM, toISODate, parseISODate,
    treatmentDayNumber, isMonth1, isWithinTreatmentWindow
  };
}
