# PitchSide

A browser-based football draft and season-simulation game.

Spin a wheel to land on a **real club from a real season** — across the Premier League, Bundesliga,
La Liga, Serie A, and Ligue 1 — then draft a player who actually played for that club that season
into your formation. Repeat until your XI is complete, then simulate a full season with a
transparent xG/win-probability match engine and chase a perfect unbeaten run.

## Features

**Draft** — a seeded wheel of 1,200+ real club-seasons, 12 formations on an interactive pitch,
difficulty modes (rerolls, hidden ratings), squad-first or position-first drafting, season vs.
career-prime ratings, and an era filter. A live TEAM/DEF/MID/ATK rating updates as your XI fills.

**Simulate** — a Dixon-Coles match engine with visible expected goals and win odds, played out one
game at a time against a league's real clubs. Then a seeded knockout **cup**, and the **Champions
League** (modern 36-team league phase) if you finish top four. Optional **managers** (tactical shapes
that bend the odds) and a **January transfer window**.

**End-of-season stats** — record, xG over/under-performance, per-player **scorers & assists**, a
**Player of the Season**, a league **Golden Boot** race, and a narrative verdict + insights. Plus a
shareable result card.

**Career mode** — carry your XI into the next season: the squad ages (youngsters rise, veterans
decline), players retire and youth graduates step up, and your season-by-season record accumulates.

**Daily Challenge** — one date-seeded draft a day, the same for everyone, scored by team rating with
a shareable summary and a personal streak.

**Accounts** — sign in to save your teams and full season history across devices (**My Career**:
career totals, all-time top scorers, per-season stats, drafted XIs), or **play as a guest** on-device.

## Tech

React 19 + TypeScript + Vite, Tailwind CSS v4, Recharts, Vitest. Squad data is pre-scraped into
static JSON and the sim runs client-side. A small **Express + `node:sqlite`** backend (`server/`)
handles accounts and saved data; guest play uses on-device IndexedDB.

```
npm install
npm run server:install   # once, for the accounts API
npm run dev:all          # web (5173) + api (3001) together
npm run build            # production build
npx vitest run           # tests
npm run scrape           # extend/refresh the squad dataset
```

## Disclaimer

PitchSide is an independent, fan-made project. It is not affiliated with, endorsed by, or licensed
by any football club, league, or governing body. Club and player names are used factually; all
player ratings are this project's own independent estimates derived from public appearance and goal
data — not sourced from any official or proprietary ratings database. Squad data is sourced from
Wikipedia (CC BY-SA). No official logos, crests, or player likenesses are used.
