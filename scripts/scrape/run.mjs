import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSeasonArticleTitle, fetchWikitext } from './wiki.mjs';
import { extractClubSeasonSquad, detectDivision } from './parseSquad.mjs';
import { deriveRatings } from './ratings.mjs';
import { rebuildAllRatings } from './rebuildRatings.mjs';
import { rebuildIndex as buildIndex } from './indexBuilder.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data');
const HIST_DIR = join(__dirname, '..', '..', 'public', 'data', 'historical');
const LOG_FILE = join(__dirname, 'scrape.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n');
}

function seasonList(startYear, endYear) {
  const seasons = [];
  for (let y = startYear; y < endYear; y++) {
    const startYY = String(y).slice(-2);
    const endYY = String(y + 1).slice(-2);
    seasons.push(`${y}-${endYY}`);
    void startYY;
  }
  return seasons;
}

function playerId(name, nationality) {
  return `${name}-${nationality}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function scrapeClubSeason(league, club, season, force = false) {
  const outDir = join(HIST_DIR, league.id, club.id);
  const outFile = join(outDir, `${season}.json`);
  if (!force && existsSync(outFile)) return { status: 'skipped' };

  const title = await resolveSeasonArticleTitle(club.wikiTitle, season, club.name);
  if (!title) return { status: 'not-found' };

  const page = await fetchWikitext(title);
  if (!page) return { status: 'fetch-failed' };

  const division = detectDivision(page.wikitext, league.id);
  if (division === 'lower-division') return { status: 'not-top-flight' };

  const rows = extractClubSeasonSquad(page.wikitext);
  if (!rows) return { status: 'no-table' };

  // Defensive: appearances/goals are never negative; a negative value is a parse artifact
  // (e.g. a keeper's goals-conceded column read as goals).
  for (const row of rows) {
    row.appearances = Math.max(0, row.appearances);
    row.goals = Math.max(0, row.goals);
  }

  const maxAppearances = Math.max(...rows.map((r) => r.appearances), 20);
  const squad = rows.map((row) => {
    const seedKey = `${club.id}-${season}-${row.name}-${row.nationality}`;
    const { seasonRatings, primeRatings } = deriveRatings(
      seedKey, row.broadPosition, row.appearances, row.goals, maxAppearances, row.noStats === true,
    );
    return {
      id: playerId(row.name, row.nationality),
      name: row.name,
      nationality: row.nationality,
      broadPosition: row.broadPosition,
      shirtNumber: row.shirtNumber,
      stats: { appearances: row.appearances, goals: row.goals },
      seasonRatings,
      primeRatings,
    };
  });

  const clubSeason = {
    leagueId: league.id,
    clubId: club.id,
    season,
    division,
    squad,
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    scrapedAt: new Date().toISOString(),
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(clubSeason, null, 2));
  return { status: 'ok', players: squad.length };
}

function rebuildIndex() {
  const n = buildIndex(HIST_DIR, DATA_DIR);
  log(`Index rebuilt: ${n} club-seasons available.`);
}

async function main() {
  const args = process.argv.slice(2);
  const startYear = parseInt(args.find((a) => a.startsWith('--start='))?.split('=')[1] ?? '2011', 10);
  const endYear = parseInt(args.find((a) => a.startsWith('--end='))?.split('=')[1] ?? '2025', 10);
  const leagueFilter = args.find((a) => a.startsWith('--league='))?.split('=')[1];
  // --force re-scrapes and overwrites existing files (e.g. after a parser fix), instead of the
  // default resumable behaviour that skips any club-season already on disk.
  const force = args.includes('--force');

  mkdirSync(HIST_DIR, { recursive: true });
  const leagues = JSON.parse(readFileSync(join(DATA_DIR, 'leagues.json'), 'utf8'));
  const clubs = JSON.parse(readFileSync(join(DATA_DIR, 'clubs.json'), 'utf8'));
  const seasons = seasonList(startYear, endYear);

  const leaguesToRun = leagueFilter ? leagues.filter((l) => l.id === leagueFilter) : leagues;

  let ok = 0, skipped = 0, missing = 0, failed = 0;
  for (const league of leaguesToRun) {
    const leagueClubs = clubs.filter((c) => c.leagueId === league.id);
    for (const club of leagueClubs) {
      for (const season of seasons) {
        try {
          const result = await scrapeClubSeason(league, club, season, force);
          if (result.status === 'ok') { ok++; log(`OK   ${league.id}/${club.id}/${season} (${result.players} players)`); }
          else if (result.status === 'skipped') { skipped++; }
          else { missing++; log(`MISS ${league.id}/${club.id}/${season}: ${result.status}`); }
        } catch (err) {
          failed++;
          log(`FAIL ${league.id}/${club.id}/${season}: ${err.message}`);
        }
      }
      rebuildIndex();
      // Ratings need whole-dataset context (career spans, curated anchors), so recompute after
      // each club rather than trusting scrape-time placeholders — keeps the app's live data
      // correctly rated while a long scrape run is still in progress.
      rebuildAllRatings({ log });
    }
  }

  log(`Done. ok=${ok} skipped=${skipped} missing=${missing} failed=${failed}`);
}

main().catch((err) => {
  log(`FATAL ${err.stack}`);
  process.exit(1);
});
