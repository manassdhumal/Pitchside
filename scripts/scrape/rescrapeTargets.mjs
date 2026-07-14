// One-off surgical re-scrape: refresh a hand-picked list of club-seasons whose stored file predates
// a parseSquad.mjs improvement (so they're stale roster-only baselines), then rebuild the index and
// ratings. Non-destructive: a club-season that fails to re-parse leaves its existing file untouched.
// Usage: node scripts/scrape/rescrapeTargets.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSeasonArticleTitle, fetchWikitext } from './wiki.mjs';
import { extractClubSeasonSquad, detectDivision } from './parseSquad.mjs';
import { deriveRatings } from './ratings.mjs';
import { rebuildAllRatings } from './rebuildRatings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data');
const HIST_DIR = join(__dirname, '..', '..', 'public', 'data', 'historical');

// leagueId/clubId/season triples recovered by the new parseGroupedTotalsSquad branch + Efs `\d*` fix.
const TARGETS = [
  ['bundesliga', 'bayern-munich', '2013-14'],
  ['bundesliga', 'bayern-munich', '2016-17'],
  ['bundesliga', 'bayern-munich', '2017-18'],
  ['bundesliga', 'koln', '2017-18'],
  ['bundesliga', 'schalke-04', '2016-17'],
  ['bundesliga', 'schalke-04', '2017-18'],
  ['bundesliga', 'schalke-04', '2018-19'],
];

const playerId = (name, nationality) =>
  `${name}-${nationality}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function scrapeOne(league, club, season) {
  const title = await resolveSeasonArticleTitle(club.wikiTitle, season, club.name);
  if (!title) return { status: 'not-found' };
  const page = await fetchWikitext(title);
  if (!page) return { status: 'fetch-failed' };
  const division = detectDivision(page.wikitext, league.id);
  if (division === 'lower-division') return { status: 'not-top-flight' };
  const rows = extractClubSeasonSquad(page.wikitext);
  if (!rows) return { status: 'no-table' };
  for (const row of rows) { row.appearances = Math.max(0, row.appearances); row.goals = Math.max(0, row.goals); }
  const maxAppearances = Math.max(...rows.map((r) => r.appearances), 20);
  const squad = rows.map((row) => {
    const seedKey = `${club.id}-${season}-${row.name}-${row.nationality}`;
    const { seasonRatings, primeRatings } = deriveRatings(
      seedKey, row.broadPosition, row.appearances, row.goals, maxAppearances, row.noStats === true,
    );
    return {
      id: playerId(row.name, row.nationality), name: row.name, nationality: row.nationality,
      broadPosition: row.broadPosition, shirtNumber: row.shirtNumber,
      stats: { appearances: row.appearances, goals: row.goals }, seasonRatings, primeRatings,
    };
  });
  const clubSeason = {
    leagueId: league.id, clubId: club.id, season, division, squad,
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    scrapedAt: new Date().toISOString(),
  };
  const outDir = join(HIST_DIR, league.id, club.id);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${season}.json`), JSON.stringify(clubSeason, null, 2));
  return { status: 'ok', players: squad.length, maxApps: Math.max(...squad.map((p) => p.stats.appearances)) };
}

function rebuildIndex() {
  const clubs = JSON.parse(readFileSync(join(DATA_DIR, 'clubs.json'), 'utf8'));
  const leagues = JSON.parse(readFileSync(join(DATA_DIR, 'leagues.json'), 'utf8'));
  const entries = [];
  for (const club of clubs) {
    const clubDir = join(HIST_DIR, club.leagueId, club.id);
    if (!existsSync(clubDir)) continue;
    for (const file of readdirSync(clubDir).filter((f) => f.endsWith('.json'))) {
      const data = JSON.parse(readFileSync(join(clubDir, file), 'utf8'));
      entries.push({ leagueId: club.leagueId, clubId: club.id, season: file.replace('.json', ''), playerCount: data.squad.length });
    }
  }
  writeFileSync(join(HIST_DIR, 'index.json'), JSON.stringify({ leagues, clubs, entries }, null, 2));
  return entries.length;
}

async function main() {
  const clubs = JSON.parse(readFileSync(join(DATA_DIR, 'clubs.json'), 'utf8'));
  const leagues = JSON.parse(readFileSync(join(DATA_DIR, 'leagues.json'), 'utf8'));
  for (const [leagueId, clubId, season] of TARGETS) {
    const league = leagues.find((l) => l.id === leagueId);
    const club = clubs.find((c) => c.id === clubId && c.leagueId === leagueId);
    if (!league || !club) { console.log(`SKIP ${leagueId}/${clubId}/${season}: club/league not found`); continue; }
    try {
      const r = await scrapeOne(league, club, season);
      console.log(`${r.status === 'ok' ? 'OK  ' : 'MISS'} ${leagueId}/${clubId}/${season}: ${r.status}${r.players ? ` (${r.players} players, max ${r.maxApps} apps)` : ''}`);
    } catch (e) { console.log(`FAIL ${leagueId}/${clubId}/${season}: ${e.message}`); }
  }
  const n = rebuildIndex();
  console.log(`\nindex rebuilt: ${n} entries`);
  console.log('rebuilding ratings (whole-dataset)…');
  rebuildAllRatings({ log: () => {} });
  console.log('ratings rebuilt. done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
