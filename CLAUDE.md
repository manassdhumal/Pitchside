# PitchSide

Browser-based football (soccer) draft & season-simulation game. Direct clone of the "38-0" mechanic:
spin a wheel to land on a **real club in a real season**, draft a **real player who actually played
for that club that season** into a formation slot, repeat until an XI is complete, then simulate a
statistically-modeled season and see if you can go unbeaten. Differentiator vs 38-0: multi-league
(Premier League, Bundesliga, La Liga, Serie A, Ligue 1 — 38-0 is Premier League only) and transparent
match odds (visible xG/win% instead of a black-box result).

Full original spec (market context, phased roadmap, detailed algorithms) lives at
`~/Downloads/pitchside-project-plan.md` on the author's machine — not part of this repo. This file
is the living summary of what's actually built. The pivot to the real-club/real-season draft
mechanic (matching 38-0 exactly, replacing the earlier fictional-club/legends-blend concept) happened
2026-07-07; the fictional/procedural system (`legends.ts`, `squadBuilder.ts`, `teamGenerator.ts`)
still exists and still powers **CPU opponent squads** in `Season.tsx`, but no longer powers the
user's own drafted XI.

## Legal constraints (do not violate)

- Real club names, real player names/nationalities, and real season data ARE used (unlike the
  earlier fictional-club approach) — matching 38-0's own approach. This is legally fine: club names
  and biographical/statistical facts are not copyrightable. What's NOT allowed: real crests/logos,
  kit designs, or player photos/likenesses (crest icons are abstract placeholders, see `clubs.json`
  `crestIcon` field), and FIFA/Football Manager-sourced ratings.
- Every real-player rating is independently derived from public appearance/goals data (see
  `scripts/scrape/ratings.mjs`) — never copied from FIFA, Football Manager, or any other proprietary
  ratings database. `RealPlayerRecord.seasonRatings`/`primeRatings` both carry this provenance
  implicitly via `realPlayerToEnginePlayer`'s `sourceNote`.
- The footer disclaimer in `App.tsx` ("independent fan-made... not affiliated with...") must stay
  on every page — this is the same legal framing 38-0 itself uses.
- The `legends.ts` curated dataset (pre-1970s–2010s legends, hand-picked) is a separate, older
  system now used only for CPU-opponent squad variety, not the main draft loop.

## Tech stack

React 19 + TypeScript + Vite, Tailwind v4 (via `@tailwindcss/vite`), React Router, IndexedDB (via
`idb`) for persistence, Web Worker for simulation, Vitest for tests. No backend — everything is
client-side/static; real squad data is scraped ahead of time into static JSON, not fetched live.

## Commands

```
npm run dev              # dev server (vite)
npm run build             # tsc -b && vite build
npx vitest run             # run tests
npx tsc -b                 # typecheck only
npm run scrape             # run the squad scraper (default: 2011-2026, all 5 leagues)
npm run scrape:backfill    # scrape 1990-2011 to extend historical depth
node scripts/scrape/run.mjs --start=YYYY --end=YYYY --league=<id>   # custom range/league
```

**The scraper is resumable** — it skips any club-season that already has an output file, so it's
always safe to rerun to fill gaps or extend coverage. It writes to `src/data/historical/<leagueId>/<clubId>/<season>.json`
plus a rebuilt `src/data/historical/index.json` after each club. Progress/errors log to
`scripts/scrape/scrape.log`.

**Never run the scraper and the Vite dev server's file watcher against a fast-changing
`src/data/historical/` at the same time without the `vite.config.ts` `server.watch.ignored` entry**
(already in place) — every scraped file write otherwise triggers a dev-server reload mid-session.

## Real-data pipeline (`scripts/scrape/`)

- `wiki.mjs` — Wikipedia API client: resolves a club-season's article title (tries the direct
  `"20XX–XX {club} season"` title first, falls back to search, follows redirects), fetches raw
  wikitext, rate-limited (1.2s min gap, exponential backoff + `retry-after` handling on 429/503).
- `parseSquad.mjs` — parses whichever of **three** Wikipedia squad-listing formats a given article
  uses (richest first): (1) a wikitable with No./Pos./Nat.-or-inline-flag/Name-or-Player columns and
  a "Total" apps/goals column group, (2) `{{Efs player|...}}` / `{{Extended football squad
  player|...}}` templates (name/pos/nat as named params, apps/goals pairs as positional params per
  competition — **the positional params start at index 1, not 0, because index 0 is the template
  name itself; get this wrong and apps/goals silently swap**, which happened once already), or (3)
  `{{Fs player|...}}` / `{{football squad player|...}}` templates with no stats at all (squad-only,
  ratings fall back to a flat baseline). Coverage is roughly 90-95% of attempted club-seasons;
  genuine misses (different template again, e.g. `{{football season player stats}}`-transcluded
  tables) are logged and simply skipped — the pipeline doesn't error out, it just has less data for
  that club-season until someone adds a fourth parser branch.
- `ratings.mjs` — deterministic (seeded by name+club+season) rating primitives. Scrape-time ratings
  are only **placeholders**; the authoritative pass is `rebuildRatings.mjs` (below), which
  `run.mjs` chains automatically after every scrape run (`npm run ratings:rebuild` to run manually).
- `rebuildRatings.mjs` — the ratings v2 post-process, recomputes ALL ratings with whole-dataset
  context: (1) cross-season player identity (keyed by diacritic-insensitive name via
  `curatedAnchors.mjs#nameKey` — beware: two distinct players with identical names merge), (2) club
  tier from `clubs.json` (`tier` 1-4, hand-assigned; a first-choice regular at an elite club
  outrates one at a small club, scaled by usage so benchwarmers don't inherit it), (3) goal
  involvement by position archetype, (4) career consistency (seasons at ≥0.55 of squad-max
  appearances), and (5) **curated anchors** from `curatedAnchors.mjs` (~220 well-known players with
  hand-estimated peak overalls, same independent-derivation provenance rule as legends.ts).
  Anchored players: prime = anchor exactly; season ratings shift toward the anchor keeping career
  shape (upward shift capped at +8 so a star's bench/partial season isn't inflated to their peak;
  downward shift uncapped). Uncurated players cap at 93 season / 94 prime. When ratings "look off",
  fix here or add an anchor — never hand-edit the generated JSON, it's overwritten on every rebuild.
- `parseSquad.mjs#detectDivision` + `validateDivisions.mjs` — **top-flight filtering**. Club-season
  Wikipedia pages exist for lower-division years too (e.g. Fulham's Championship seasons), and raw
  apps/goals can't distinguish a second-tier top scorer from a Bundesliga star, so `run.mjs` skips
  (status `not-top-flight`) any season whose infobox league field matches the second/third-tier
  reject patterns. `validateDivisions.mjs` is the maintenance pass that re-checks and deletes
  already-scraped lower-division files (tags survivors `division: 'top-flight' | 'unknown'`;
  'unknown' means the page gave no usable league signal — kept, logged for manual review).
- `run.mjs` — orchestrator: iterates leagues × clubs (`src/data/clubs.json`) × season range,
  resumable, rebuilds the index after each club.
- `src/data/clubs.json` / `src/data/leagues.json` — hand-curated list of ~16-20 long-tenured
  top-flight clubs per league (not exhaustive — clubs never in the curated list won't have data even
  if Wikipedia has the page; expand this list to broaden coverage, independent of season range).

## Architecture

- `src/types/` — `Player`/`PlayerRatings` (generic engine shape, used for both real and procedural
  players), `Team`, `CompetitionTemplate`, `Match`, `Season`, `StandingsRow` (existing system) plus
  `League`/`RealClub` (`league.ts`), `RealPlayerRecord`/`ClubSeason` (`realPlayer.ts`), and
  `DraftSettings` (`settings.ts`) for the new real-data draft flow. `Position` now includes
  `LWB`/`RWB`; `BroadPosition` (`GK`/`DF`/`MF`/`FW`) is the coarser granularity real squad-list
  sources actually provide, with `POSITION_TO_BROAD` mapping one to the other for
  formation-slot-compatibility checks.
- `src/data/historicalData.ts` — the app-side data loader. Uses `import.meta.glob` for lazy,
  per-club-season code-split chunks (confirmed in production build: each club-season is its own
  ~2-15KB chunk, not bundled upfront). `realPlayerToEnginePlayer(record, slotPosition, ratingsMode,
  clubSeason)` converts a scraped real player into the existing generic `Player` shape at draft time
  — **this is why the match engine, fixtures, competitions, and worker code needed zero changes**:
  real players just become `Player` objects like procedural/legend ones always were, with
  `isProcedural: false`, `isLegend: false`, and a `sourceNote`.
- `src/data/formations.ts` — `FORMATION_SLOTS` defines pitch coordinates + `Position` per slot for
  all 12 formations (4-3-3, 4-4-2, 4-2-3-1, 4-5-1, 3-4-3, 3-5-2, 5-4-1, 4-1-2-1-2, 4-4-1-1, 5-3-2,
  3-4-1-2, 4-2-2-2), matching 38-0's formation list exactly.
- `src/engine/matchEngine.ts` — Dixon-Coles statistical match model, **unchanged** by the real-data
  pivot except adding `LWB`/`RWB` attack/defence weights. `computeExpectedGoals` derives
  λ_home/λ_away from weighted attack/defence ratings of the starting XI; tuned constants
  `LEAGUE_AVG_GOALS = 1.2`, `HOME_ADVANTAGE = 1.35` — calibrated in `calibration.test.ts` to hit
  ~25-30% draw rate and ~2.6-2.8 goals/game. **If you touch either constant, rerun
  `calibration.test.ts` and re-tune.**
- `src/engine/fixtures.ts` — circle-method round-robin fixture generator (single or double).
- `src/engine/competitions.ts` — resolves fixtures + starting XIs into `Match[]` and a sorted
  `StandingsRow[]` table.
- `src/workers/simWorker.ts` — runs fixture generation + match simulation off the UI thread.
- `src/storage/db.ts` + `cache.ts` — IndexedDB wrapper for the user's drafted team/players/seasons
  (not the static real-squad data, which is bundled/lazy-loaded JSON, not persisted per-user).
- `src/data/playerGenerator.ts` + `nationalities.ts` + `legends.ts` + `squadBuilder.ts` +
  `teamGenerator.ts` — the older fictional/procedural system, now used only to generate the 19 CPU
  opponent squads in `Season.tsx`. Not used for the user's own draft anymore.
- `src/pages/` — `Home` → `Setup` (league multi-select, formation grid+pitch preview, difficulty,
  show-ratings toggle, draft mode, season/prime ratings toggle, era range, managers/transfer-window
  advanced toggles — mirrors 38-0's settings screen) → `Draft` (spin wheel → real squad list →
  38-0-style placement: pick a player, then choose among the highlighted compatible open slots on
  the pitch — auto-places only when exactly one slot fits; position-first mode inverts this by
  locking the slot before the spin. The wheel picks a club uniformly at random then a season for
  that club, avoiding the immediately-previous club, so clubs with more scraped seasons don't
  dominate; reroll budget by difficulty) → `Season` (simulate 20-team double round-robin / 38 games against procedural
  CPU opponents, table + fixtures + xG/win%, shareable result card). `Draft` settings pass via
  React Router navigation state (`navigate('/draft', { state: settings })`), not `AppContext`.
- `src/components/pitch/PitchDiagram.tsx` — reusable formation pitch renderer, used by both `Setup`
  (preview) and `Draft` (interactive slot-fill display).

## Known gaps / not yet wired

- **Managers (Gaffers) and January Transfer Window** advanced toggles exist in the `Setup` UI and
  are captured in `DraftSettings`, but have no gameplay effect yet — Transfer Window is visibly
  disabled ("Coming soon") in the UI; Managers is enabled but currently a no-op in `Season.tsx`.
- Scraper coverage is intentionally partial and grows via reruns (see Commands above) — don't assume
  every club/season in `clubs.json` has data; `Setup.tsx` shows the live "N club-seasons spinnable"
  count so this is visible to the user rather than silently broken.
- `primeRatings` is a single-season-based estimate, not a true cross-career aggregation (see
  ratings.mjs note above) — a real "prime" system would need player-identity resolution across every
  club-season a player appears in, which v1 doesn't attempt.

## Status

**Real-data draft loop complete and verified working end-to-end** (spin → real squad → draft → fill
XI → simulate season), production build confirmed clean with proper per-club-season code splitting.
Bootstrap data scrape (2011-2026, all 5 leagues) is an ongoing background job — rerun/extend per
Commands above; not blocking, the app works with however much data exists at any point.

Not started: Phase 2 (generic competition engine for cups/continental/international formats,
promotion/relegation, career mode), Phase 3 (daily challenge, multiplayer), Phase 4 (monetization),
Managers/Transfer-Window gameplay effects (UI-only for now).

No backend component exists or is planned before Phase 3 — don't introduce one without confirming
with the user first.
