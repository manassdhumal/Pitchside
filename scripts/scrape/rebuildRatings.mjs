import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seededRandom, clamp, deriveSeasonOverall, subRatings, SEASON_FLOOR } from './ratings.mjs';
import { buildAnchorMap, nameKey } from './curatedAnchors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data');
const HIST_DIR = join(__dirname, '..', '..', 'public', 'data', 'historical');

const HIGH_USAGE_THRESHOLD = 0.55;
const UNCURATED_PRIME_CAP = 94;

function listClubSeasonFiles() {
  const files = [];
  if (!existsSync(HIST_DIR)) return files;
  for (const leagueId of readdirSync(HIST_DIR, { withFileTypes: true })) {
    if (!leagueId.isDirectory()) continue;
    const leagueDir = join(HIST_DIR, leagueId.name);
    for (const clubId of readdirSync(leagueDir, { withFileTypes: true })) {
      if (!clubId.isDirectory()) continue;
      const clubDir = join(leagueDir, clubId.name);
      for (const f of readdirSync(clubDir)) {
        if (f.endsWith('.json')) files.push(join(clubDir, f));
      }
    }
  }
  return files;
}

/**
 * Recomputes every player's ratings across the whole scraped dataset:
 * pass 1 builds a cross-season identity per player (keyed by diacritic-insensitive name),
 * pass 2 derives each season's overall with club-tier + career-consistency context,
 * pass 3 anchors curated players' careers to their curated peak and writes files back.
 */
export function rebuildAllRatings({ log = console.log } = {}) {
  const clubs = JSON.parse(readFileSync(join(DATA_DIR, 'clubs.json'), 'utf8'));
  const tierByClub = new Map(clubs.map((c) => [c.id, c.tier ?? 3]));
  const anchors = buildAnchorMap();

  const files = listClubSeasonFiles();
  const documents = files.map((file) => ({ file, doc: JSON.parse(readFileSync(file, 'utf8')) }));

  // Pass 1: career context per player identity.
  const careers = new Map(); // nameKey -> { highUsageSeasons, records: [{record, doc}] }
  for (const { doc } of documents) {
    const maxAppearances = Math.max(...doc.squad.map((r) => r.stats.appearances), 20);
    for (const record of doc.squad) {
      const key = nameKey(record.name);
      let career = careers.get(key);
      if (!career) {
        career = { highUsageSeasons: 0, entries: [] };
        careers.set(key, career);
      }
      const usage = record.stats.appearances / maxAppearances;
      if (usage >= HIGH_USAGE_THRESHOLD) career.highUsageSeasons += 1;
      career.entries.push({ record, doc });
    }
  }

  // Pass 2: derive every season overall with tier + career context.
  const seasonOveralls = new Map(); // record object -> overall
  for (const { doc } of documents) {
    const tier = tierByClub.get(doc.clubId) ?? 3;
    const maxAppearances = Math.max(...doc.squad.map((r) => r.stats.appearances), 20);
    for (const record of doc.squad) {
      const career = careers.get(nameKey(record.name));
      const noStats = record.stats.appearances === 0 && doc.squad.every((r) => r.stats.appearances === 0);
      const seedKey = `${doc.clubId}-${doc.season}-${record.name}-${record.nationality}`;
      const overall = deriveSeasonOverall({
        broadPosition: record.broadPosition,
        appearances: record.stats.appearances,
        goals: record.stats.goals,
        maxAppearances,
        tier,
        careerHighUsageSeasons: career?.highUsageSeasons ?? 1,
        noStats,
        rng: seededRandom(seedKey),
      });
      seasonOveralls.set(record, overall);
    }
  }

  // Pass 3: per-career prime + curated anchoring, then write back.
  let anchoredPlayers = 0;
  for (const [key, career] of careers) {
    const overalls = career.entries.map(({ record }) => seasonOveralls.get(record));
    const algPrime = Math.max(...overalls);
    const anchor = anchors.get(key);

    let prime;
    let shift = 0;
    if (anchor !== undefined) {
      anchoredPlayers += 1;
      prime = anchor;
      // Shift the career toward the curated peak, keeping its shape. Upward shift is capped so a
      // star whose dataset coverage is only a bench/partial season isn't inflated to their peak;
      // downward shift is uncapped so over-rated algorithmic careers come fully down.
      shift = Math.min(anchor - algPrime, 8);
    } else {
      prime = clamp(algPrime + 1, 40, UNCURATED_PRIME_CAP);
    }

    for (const { record, doc } of career.entries) {
      const alg = seasonOveralls.get(record);
      // Anchored players never drop more than 16 below their peak: even a star's injury or
      // bench season stays recognisably that player, not a 50s-rated unknown.
      const seasonOverall = anchor !== undefined
        ? clamp(alg + shift, Math.max(SEASON_FLOOR, anchor - 16), anchor)
        : alg;

      const seedKey = `${doc.clubId}-${doc.season}-${record.name}-${record.nationality}`;
      record.seasonRatings = subRatings(record.broadPosition, seasonOverall, seededRandom(seedKey));
      record.primeRatings = subRatings(record.broadPosition, prime, seededRandom(seedKey + '-prime'));
    }
  }

  for (const { file, doc } of documents) {
    writeFileSync(file, JSON.stringify(doc, null, 2));
  }

  log(`Ratings rebuilt: ${documents.length} club-seasons, ${careers.size} distinct players, ${anchoredPlayers} matched curated anchors.`);
  return { clubSeasons: documents.length, players: careers.size, anchored: anchoredPlayers };
}

if (process.argv[1] && fileURLToPath(import.meta.url).endsWith('rebuildRatings.mjs') && process.argv[1].endsWith('rebuildRatings.mjs')) {
  rebuildAllRatings();
}
