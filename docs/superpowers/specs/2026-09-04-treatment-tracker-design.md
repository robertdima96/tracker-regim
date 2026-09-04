# Tracker tratament 3 luni — design

Data: 2026-09-04

## Scop

Aplicație web statică (HTML/CSS/JS vanilla, fără build step, fără backend),
găzduibilă pe GitHub Pages sau deschisă direct din `file://`, pentru urmărirea
zilnică a unui tratament de 3 luni (Nolpaza, Gastrofait, Asketon + mese).
Persistență exclusiv în `localStorage`. Utilizare principală: telefon mobil.

## Context medical (fix, nu se editează din UI)

- **Nolpaza 40mg** — pe stomacul gol.
  - Luna 1 (ziua tratamentului N ≤ 30): 2×/zi — dimineața (la trezire, ~60-75
    min înainte de mic dejun) și seara (2-2.5h după cină).
  - Lunile 2-3 (N > 30): doar 1×/zi, dimineața.
- **Gastrofait 1g** (sucralfat) — 4×/zi, tot timpul tratamentului (90 zile):
  ~1h înainte de fiecare masă principală + o doză chiar înainte de culcare.
- **Asketon 50mg** (itopridă) — 3×/zi, tot timpul tratamentului: 15-30 min
  înainte de fiecare masă principală.

Fereastra de tratament = 90 de zile calendaristice începând cu data de start
(ziua 1 = data de start, ultima zi = start + 89).

## Structura de date

### Config global — `localStorage["tracker:config"]`

```json
{
  "treatmentStartDate": "2026-09-01",
  "wakeTime": "07:00",
  "sleepTime": "23:00"
}
```

Singura sursă de adevăr pentru data de start și pentru orele implicite de
trezire/culcare folosite la generarea zilelor noi.

### Schema unei zile — `localStorage["tracker:day:YYYY-MM-DD"]`

Scrisă în `localStorage` **doar după prima interacțiune** a utilizatorului cu
acea zi (editare oră, marcare "am luat/mâncat", debifare, sau reset explicit).
Până atunci, ziua se generează efemer în memorie la fiecare afișare, pornind
din config global + ziua N de tratament, și NU se scrie nimic pe disc.

```json
{
  "date": "2026-09-04",
  "wakeTime": "07:00",
  "sleepTime": "23:00",
  "events": [
    { "id": "nolpaza-am",        "type": "med",  "label": "Nolpaza 40mg",  "time": "07:00", "done": false },
    { "id": "gastrofait-mic",    "type": "med",  "label": "Gastrofait",    "time": "07:10", "done": false },
    { "id": "asketon-mic",       "type": "med",  "label": "Asketon",       "time": "07:50", "done": false },
    { "id": "mic-dejun",         "type": "meal", "label": "Mic dejun",     "time": "08:10", "done": false },
    { "id": "gastrofait-pranz",  "type": "med",  "label": "Gastrofait",    "time": "12:10", "done": false },
    { "id": "asketon-pranz",     "type": "med",  "label": "Asketon",       "time": "12:50", "done": false },
    { "id": "pranz",             "type": "meal", "label": "Prânz",         "time": "13:10", "done": false },
    { "id": "gastrofait-cina",   "type": "med",  "label": "Gastrofait",    "time": "18:00", "done": false },
    { "id": "asketon-cina",      "type": "med",  "label": "Asketon",       "time": "18:40", "done": false },
    { "id": "cina",              "type": "meal", "label": "Cină",          "time": "19:00", "done": false },
    { "id": "nolpaza-pm",        "type": "med",  "label": "Nolpaza 40mg",  "time": "21:15", "done": false },
    { "id": "gastrofait-culcare","type": "med",  "label": "Gastrofait",    "time": "22:50", "done": false }
  ]
}
```

Reguli:
- `events` este un array **ordonat cronologic**; ordinea din array definește
  ordinea folosită de cascadă (nu se resortează după `time` — sortarea vizuală
  ar putea diverge temporar de ordinea "logică" în cazuri extreme, e acceptat).
- `nolpaza-pm` există în array doar dacă ziua e în luna 1 (N ≤ 30). Nu apare
  deloc în zilele din lunile 2-3.
- `wakeTime`/`sleepTime` stocate per-zi permit suprascrierea valorii globale
  pentru acea zi specifică (folosite doar de funcția de reset a zilei).
- Convenția de `id` (`gastrofait-<masă>`, `asketon-<masă>`) e folosită pentru
  a lega fiecare doborâre de Gastrofait/Asketon de masa căreia îi corespunde,
  strict pentru calculul avertismentelor (secțiunea Avertismente).

### Zile în afara ferestrei de 90 zile

Calendarul permite navigare liberă, dar zilele din afara ferestrei
`[treatmentStartDate, treatmentStartDate+89]` nu au schemă de tratament: click
pe o asemenea zi arată un mesaj ("În afara perioadei de tratament") fără
listă de evenimente și fără generare/persistare.

## Calcul ziua N de tratament

```js
function treatmentDayNumber(date, startDate) {
  const diffDays = Math.floor((date - startDate) / 86400000);
  return diffDays + 1; // ziua 1 = data de start
}
```
`N ≤ 30` → luna 1 (Nolpaza 2×/zi). `31 ≤ N ≤ 90` → lunile 2-3 (Nolpaza 1×/zi).
`N < 1` sau `N > 90` → în afara tratamentului.

## Generarea programului implicit al unei zile noi

Pornind de la `wakeTime` (W) și `sleepTime` (S) — global sau override per-zi:

| Eveniment | Oră implicită |
|---|---|
| Nolpaza AM | W |
| Gastrofait (mic dejun) | mic-dejun − 60min |
| Asketon (mic dejun) | mic-dejun − 20min |
| Mic dejun | W + 70min |
| Gastrofait (prânz) | prânz − 60min |
| Asketon (prânz) | prânz − 20min |
| Prânz | mic-dejun + 5h |
| Gastrofait (cină) | cină − 60min |
| Asketon (cină) | cină − 20min |
| Cină | S − 4h |
| Nolpaza PM (doar luna 1) | cină + 135min |
| Gastrofait (culcare) | S − 10min |

Sunt euristici de pornire rezonabile (respectă intervalele medicale cerute),
nu constrângeri rigide — toate orele rămân editabile individual după generare.

## Regula de aur — recalculare în cascadă

```js
function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function fromMinutes(mins) {
  const m = ((mins % 1440) + 1440) % 1440; // wrap în jurul miezului nopții
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

function applyTimeChange(day, eventId, newTime) {
  const events = day.events;
  const idx = events.findIndex(e => e.id === eventId);
  const oldMinutes = toMinutes(events[idx].time);
  const newMinutes = toMinutes(newTime);
  const delta = newMinutes - oldMinutes; // poate fi negativ

  events[idx].time = newTime;

  if (delta !== 0) {
    for (let i = idx + 1; i < events.length; i++) {
      if (!events[i].done) {
        events[i].time = fromMinutes(toMinutes(events[i].time) + delta);
      }
      // evenimentele 'done' nu se ating niciodată retroactiv
    }
  }
  persistDay(day);
  return day;
}

function markDoneNow(day, eventId) {
  const nowTime = formatHHMM(new Date());
  applyTimeChange(day, eventId, nowTime);
  day.events.find(e => e.id === eventId).done = true;
  persistDay(day);
  return day;
}

function toggleDone(day, eventId, doneValue) {
  // debifare/bifare manuală, FĂRĂ recalculare de oră
  day.events.find(e => e.id === eventId).done = doneValue;
  persistDay(day);
  return day;
}
```

Comportament confirmat:
- Delta negativ (utilizatorul a luat mai devreme) se propagă identic ca delta
  pozitiv — simetric.
- Nu există nicio limitare/blocare a cascadei în cazuri extreme (ex. o
  doborâre ajunge după masa la care era menită să preceadă); singurul semnal
  e avertismentul vizual (mai jos). Utilizatorul ajustează manual dacă vrea.
- "Am luat/mâncat acum" = setează ora curentă + marchează `done = true`,
  folosind aceeași funcție de cascadă.
- Editarea manuală a orei (time input) NU schimbă automat `done`.
- Debifarea manuală a "făcut" nu recalculează nimic — doar redeschide
  evenimentul la cascade viitoare.

## Avertismente vizuale (mese)

Pentru fiecare masă, folosind orele curente (după orice cascadă):

```
gapGastrofait = toMinutes(masă.time) - toMinutes(gastrofaitCorespunzător.time)
gapAsketon    = toMinutes(masă.time) - toMinutes(asketonCorespunzător.time)

avertisment DACA gapGastrofait < 45  SAU  gapAsketon < 15
```

Un gap negativ (doborârea ajunge după masă) declanșează automat avertismentul
(fiind sub prag). Avertismentul apare ca iconiță + text roșu discret pe
cardul mesei respective, fără să blocheze nimic.

## Structură UI

- **Header**: titlu, dată de start a tratamentului (input dată, persistă în
  config global), câmpuri oră de trezire / culcare globale.
- **Calendar lunar**: grid standard 7 coloane, săgeți lună precedentă/
  următoare, buton "Azi". Zilele din fereastra de 90 zile au stil vizual
  distinct (fundal/contur accent). Click pe o zi din fereastră deschide
  panoul zilei; click pe o zi din afara ferestrei arată mesajul dedicat.
- **Panou zi** (sub calendar sau ca secțiune separată, nu modal — pt spațiu pe
  mobil): timeline vertical cu linie subțire + noduri colorate; câte un card
  per eveniment, în ordinea din array (Nolpaza AM → Gastrofait → Asketon →
  Mic dejun → Gastrofait → Asketon → Prânz → Gastrofait → Asketon → Cină →
  [Nolpaza PM] → Gastrofait culcare).
  - Card: eticheta, iconiță tip (med/meal), `<input type="time">`, checkbox
    "făcut", buton "Am luat/mâncat acum", (doar pe mese) avertisment dacă
    e cazul.
  - Câmpuri oră de trezire/culcare specifice zilei (opțional, suprascriu
    valoarea globală doar pentru regenerarea acelei zile).
  - Buton "Resetează ziua" → confirmare (`confirm()` nativ sau dialog custom)
    → șterge intrarea din `localStorage` pentru acea zi și regenerează
    programul implicit din ora de trezire curentă a zilei.

## Fișiere livrate

- `index.html` — markup, linkuri Google Fonts (Fraunces/Lora + IBM Plex
  Sans/Inter), `<script src="script.js">` clasic (fără `type="module"`, ca
  să funcționeze și deschis direct din `file://`, nu doar pe GitHub Pages).
- `style.css` — variabile CSS pentru paleta (`--paper`, `--ink`, `--sage`,
  `--terracotta`, `--warning-red`), stiluri responsive mobile-first,
  verificare explicită de contrast pe toate stările de buton/card.
- `script.js` — un singur fișier, script clasic: utilitare dată/oră, generare
  program implicit, cascadă, randare calendar, randare panou zi, persistență
  `localStorage`, event listeners.
- `README.md` — instrucțiuni scurte de deploy pe GitHub Pages (branch `main`,
  root sau `/docs`) + instrucțiuni de rulare locală offline.

## Design vizual

- Fundal hârtie `#F6F3EC`, text aproape negru-cald, accent verde-șalvie
  pentru medicamente, ocru/terracota pentru mese, roșu discret doar pentru
  avertismente.
- Serif cald (Fraunces sau Lora, Google Fonts) pentru titluri și ore;
  sans-serif (IBM Plex Sans sau Inter) pentru text curent.
- Timeline vertical, linie subțire, noduri pline colorate per eveniment;
  carduri cu colțuri rotunjite, fără umbre dure.
- Mobile-first, complet responsive.
- Verificare manuală a contrastului text/fundal pe fiecare combinație de
  clase CSS suprapuse (stare normală, hover, done, warning) — nicio
  combinație text-deschis-pe-fundal-deschis sau invers.

## În afara scopului (YAGNI)

- Fără cont/sincronizare cloud, fără notificări push, fără export/import de
  date, fără editare a schemei medicale din UI (e fixă, hardcodată).
- Fără suport multi-utilizator/multi-profil.
