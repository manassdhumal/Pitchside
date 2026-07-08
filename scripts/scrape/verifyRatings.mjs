import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAnchorMap, nameKey } from './curatedAnchors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HIST_DIR = join(__dirname, '..', '..', 'public', 'data', 'historical');

function loadAll() {
  const docs = [];
  for (const league of readdirSync(HIST_DIR, { withFileTypes: true })) {
    if (!league.isDirectory()) continue;
    for (const club of readdirSync(join(HIST_DIR, league.name), { withFileTypes: true })) {
      if (!club.isDirectory()) continue;
      for (const f of readdirSync(join(HIST_DIR, league.name, club.name))) {
        if (f.endsWith('.json')) docs.push(JSON.parse(readFileSync(join(HIST_DIR, league.name, club.name, f), 'utf8')));
      }
    }
  }
  return docs;
}

const docs = loadAll();
const anchors = buildAnchorMap();
const rows = [];
for (const d of docs) {
  for (const p of d.squad) {
    rows.push({
      name: p.name, pos: p.broadPosition, club: d.clubId, season: d.season,
      ovr: p.seasonRatings.overall, prime: p.primeRatings.overall,
      apps: p.stats.appearances, gls: p.stats.goals,
      curated: anchors.has(nameKey(p.name)),
    });
  }
}

console.log(`dataset: ${docs.length} club-seasons, ${rows.length} player-season rows\n`);

console.log('=== TOP 30 season ratings (C = curated anchor) ===');
for (const r of rows.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 30)) {
  console.log(String(r.ovr).padStart(2), '|', String(r.prime).padStart(2), r.curated ? 'C' : ' ', r.pos, r.name, '@', r.club, r.season, `(${r.apps} apps, ${r.gls} gls)`);
}

console.log('\n=== Uncurated players with season rating >= 88 (potential over-ratings to review) ===');
const suspicious = rows.filter((r) => !r.curated && r.ovr >= 88).sort((a, b) => b.ovr - a.ovr);
for (const r of suspicious.slice(0, 25)) {
  console.log(String(r.ovr).padStart(2), r.pos, r.name, '@', r.club, r.season, `(${r.apps} apps, ${r.gls} gls)`);
}
if (suspicious.length === 0) console.log('(none)');

function printClubSeason(leagueId, clubId, season, label) {
  const file = join(HIST_DIR, leagueId, clubId, `${season}.json`);
  if (!existsSync(file)) { console.log(`\n(${label}: ${clubId} ${season} not in dataset)`); return; }
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`\n=== ${label}: ${clubId} ${season} ===`);
  for (const p of doc.squad.slice().sort((a, b) => b.seasonRatings.overall - a.seasonRatings.overall).slice(0, 14)) {
    console.log(String(p.seasonRatings.overall).padStart(2), '|', String(p.primeRatings.overall).padStart(2), p.broadPosition, p.name, `(${p.stats.appearances} apps, ${p.stats.goals} gls)`);
  }
}

printClubSeason('premier-league', 'chelsea', '2017-18', 'elite club');
printClubSeason('bundesliga', 'bayern-munich', '2015-16', 'elite club');
printClubSeason('premier-league', 'crystal-palace', '2023-24', 'mid/small club');
