# Tracker tratament

Aplicație statică (HTML/CSS/JS, fără build step, fără backend) pentru
urmărirea unui tratament de 3 luni. Toate datele rămân în `localStorage`-ul
browserului — nimic nu e trimis către niciun server.

## Rulare locală

Deschide `index.html` direct în browser (dublu-click) — funcționează și
offline, din `file://`.

## Deploy pe GitHub Pages

1. Creează un repo nou pe GitHub — pe cont gratuit, **trebuie să fie public**
   (vezi nota de mai jos).
2. Urcă toate fișierele (`index.html`, `style.css`, `script.js`,
   `manifest.json`, `icon.svg`) pe branch-ul `main`.
3. Settings → Pages → Source: branch `main`, folder `/ (root)`.
4. După un minut, site-ul e disponibil la
   `https://<user>.github.io/<nume-repo>/`.

Live acum: **https://robertdima96.github.io/tracker-regim/**

### Notă despre confidențialitate

Datele reale (orele efectiv luate) nu ies niciodată din `localStorage`-ul
dispozitivului tău — nu sunt în cod, nu sunt în repo. Codul e generic (schema
de tratament, fără date personale), deci expunerea lui publică nu e o
scurgere de date.

Important: pe un cont GitHub **gratuit**, Pages **nu poate fi activat deloc**
pe un repo privat (API-ul respinge cererea — necesită GitHub Pro/Team/
Enterprise). Din acest motiv repo-ul acestui proiect e **public**, nu privat
cum s-a discutat inițial. Singura protecție reală rămasă e că URL-ul nu e
indexat/promovat nicăieri — dacă vreodată vreți control de acces real (doar
utilizatori logați cu acces la repo), e nevoie de upgrade la GitHub Pro.

## Backup

Folosește "Descarcă backup" din antet pentru a salva periodic un fișier
JSON cu toate datele din `localStorage`. "Încarcă backup" restaurează dintr-un
astfel de fișier (suprascrie datele curente, cu confirmare).

## Teste (opțional, doar pentru dezvoltare)

Logica pură (calcul date, generare program implicit, cascadă, avertismente)
are teste Node în `tests/`. Nu sunt necesare pentru a rula sau găzdui
aplicația.

```bash
node --test tests/schedule.test.js
```
