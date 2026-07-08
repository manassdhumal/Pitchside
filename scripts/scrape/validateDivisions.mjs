import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWikitext } from './wiki.mjs';
import { detectDivision } from './parseSquad.mjs';
import { rebuildAllRatings } from './rebuildRatings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data');
const HIST_DIR = join(__dirname, '..', '..', 'public', 'data', 'historical');
const LOG_FILE = join(__dirname, 'scrape.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n');
}

function titleFromSourceUrl(sourceUrl) {
  return decodeURIComponent(sourceUrl.split('/wiki/')[1]).replace(/_/g, ' ');
}

function rebuildIndex() {
  const leagues = JSON.parse(readFileSync(join(DATA_DIR, 'leagues.json'), 'utf8'));
  const clubs = JSON.parse(readFileSync(join(DATA_DIR, 'clubs.json'), 'utf8'));
  const entries = [];
  for (const club of clubs) {
    const clubDir = join(HIST_DIR, club.leagueId, club.id);
    if (!existsSync(clubDir)) continue;
    for (const file of readdirSync(clubDir).filter((f) => f.endsWith('.json'))) {
      const season = file.replace('.json', '');
      const data = JSON.parse(readFileSync(join(clubDir, file), 'utf8'));
      entries.push({ leagueId: club.leagueId, clubId: club.id, season, playerCount: data.squad.length });
    }
  }
  writeFileSync(join(HIST_DIR, 'index.json'), JSON.stringify({ leagues, clubs, entries }, null, 2));
  log(`Index rebuilt: ${entries.length} club-seasons available.`);
}

/**
 * One-off / maintenance pass: re-checks every already-scraped club-season against the
 * top-flight division detector and deletes lower-division seasons (the scraper originally
 * accepted any club-season article, including e.g. Championship years). Files already
 * carrying a division field are trusted and skipped.
 */
async function main() {
  const files = [];
  for (const league of readdirSync(HIST_DIR, { withFileTypes: true })) {
    if (!league.isDirectory()) continue;
    for (const club of readdirSync(join(HIST_DIR, league.name), { withFileTypes: true })) {
      if (!club.isDirectory()) continue;
      for (const f of readdirSync(join(HIST_DIR, league.name, club.name))) {
        if (f.endsWith('.json')) files.push(join(HIST_DIR, league.name, club.name, f));
      }
    }
  }

  let checked = 0, deleted = 0, kept = 0, unknown = 0, skippedAlreadyTagged = 0;
  for (const file of files) {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    if (doc.division === 'top-flight') { skippedAlreadyTagged++; continue; }

    checked++;
    const title = titleFromSourceUrl(doc.sourceUrl);
    let division = 'unknown';
    try {
      const page = await fetchWikitext(title);
      if (page) division = detectDivision(page.wikitext, doc.leagueId);
    } catch (err) {
      log(`VALIDATE FAIL ${doc.leagueId}/${doc.clubId}/${doc.season}: ${err.message} (keeping file)`);
      continue;
    }

    if (division === 'lower-division') {
      unlinkSync(file);
      deleted++;
      log(`DELETE ${doc.leagueId}/${doc.clubId}/${doc.season} (lower division)`);
    } else {
      doc.division = division;
      writeFileSync(file, JSON.stringify(doc, null, 2));
      if (division === 'unknown') { unknown++; log(`UNKNOWN division ${doc.leagueId}/${doc.clubId}/${doc.season} (kept, review manually)`); }
      else kept++;
    }
  }

  log(`Division validation done. checked=${checked} kept=${kept} deleted=${deleted} unknown=${unknown} alreadyTagged=${skippedAlreadyTagged}`);
  rebuildIndex();
  rebuildAllRatings({ log });
}

main().catch((err) => {
  log(`FATAL ${err.stack}`);
  process.exit(1);
});
