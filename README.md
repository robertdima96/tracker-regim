# DoseFlow

A dynamic, constraint-aware medication and meal scheduler — turns treatment
instructions you already have into a live daily schedule that adapts when
linked events change (a dose logged late pushes dependent meals/doses
forward, etc.). See `docs/blueprint/` for the full product spec and
`docs/blueprint/DECISIONS.md` for the technical stack decisions.

Replaces this repo's original static 3-month treatment tracker (see
`docs/superpowers/specs/2026-09-04-treatment-tracker-design.md` for that
app's design, kept for history).

## Stack

Capacitor + Svelte 5 + TypeScript + Vite, SQLite via
`@capacitor-community/sqlite` (native on iOS/Android, `jeep-sqlite` +
sql.js/IndexedDB on web — no native shell is set up yet, so it currently
only runs as a web app). All data stays local to the device; no account,
no backend.

## Running locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/`.

## Testing

```bash
npm run check   # typecheck (TS + Svelte)
npm test        # Vitest — scheduler engine, database layer, app services
```

The scheduler engine and database layer are tested against real
implementations (property-based tests via fast-check, and a real
`better-sqlite3` instance for integration tests) rather than mocks.

## Deploying

Pushing to `master` triggers `.github/workflows/deploy.yml`, which runs
the full check/test/build gate and deploys `dist/` to GitHub Pages via
GitHub Actions (not the legacy branch-based Pages source the old app
used, since this app has a real build step).

Live at: **https://robertdima96.github.io/tracker-regim/**

### Privacy note

The repo (code, docs, blueprint) is public — same as the original app.
Your actual treatment data (plans, medications, dose history) lives only
in your device's local SQLite/IndexedDB storage; it is never part of the
repo and never leaves your device (no backend to send it to).
