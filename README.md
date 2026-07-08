# PitchSide

A browser-based football draft and season-simulation game.

Spin a wheel to land on a **real club from a real season** — across the Premier League, Bundesliga,
La Liga, Serie A, and Ligue 1 — then draft a player who actually played for that club that season
into your formation. Repeat until your XI is complete, then simulate a full 38-game season with a
transparent xG/win-probability match engine and see how close you can get to a perfect unbeaten run.

## Features

- **Five leagues, decades of seasons** — squad data covers real top-flight club-seasons, growing via a resumable data pipeline
- **12 formations** with an interactive pitch: pick a player, then choose which compatible slot to place them in
- **Difficulty modes** (rerolls, hidden ratings), squad-first or position-first drafting, season vs. career-prime ratings, and an era range filter
- **Statistical match engine** (Dixon-Coles model) with visible expected goals and win probabilities for every simulated match
- **Shareable result card** for your final season record

## Tech

React 19 + TypeScript + Vite, Tailwind CSS v4, IndexedDB persistence, Web Worker simulation, Vitest.
No backend — everything runs client-side against pre-built static squad data.

```
npm install
npm run dev        # start the dev server
npm run build      # production build
npx vitest run     # tests
npm run scrape     # extend/refresh the squad dataset
```

## Disclaimer

PitchSide is an independent, fan-made project. It is not affiliated with, endorsed by, or licensed
by any football club, league, or governing body. Club and player names are used factually; all
player ratings are this project's own independent estimates derived from public appearance and goal
data — not sourced from any official or proprietary ratings database. Squad data is sourced from
Wikipedia (CC BY-SA). No official logos, crests, or player likenesses are used.
