import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  seededRandom, clamp, clamp01, computeSeasonOverall, subRatings, absoluteOutputScore,
  ABS_FLOOR, UNCURATED_SEASON_CAP, UNCURATED_PRIME_CAP,
} from './ratings.mjs';
import { buildAnchorMap, nameKey } from './curatedAnchors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data');
const HIST_DIR = join(__dirname, '..', '..', 'public', 'data', 'historical');

const HIGH_USAGE_THRESHOLD = 0.55; // a "first-choice" season, for career-consistency counting
const MIN_APPS_FOR_POOL = 8; // ignore cameo/injury seasons when building the peer distribution
const MIN_POOL_SIZE = 6; // below this a percentile is unreliable; fall back to absolute rate
// How far below their curated peak an anchored star's weakest observed season may fall.
const MAX_ANCHOR_DROP = 18;
// A curated anchor is only applied to an identity that reached within this of it on merit in some
// season. Without this gate a fringe *namesake* (a different player who happens to share the name,
// e.g. a squad "Óscar" or the Colombian "Luis Suárez") inherits the star's peak rating.
const ANCHOR_GATE = 14;

/**
 * Canonical nationality key: first three letters, upper-cased, with the common scraped-code
 * inconsistencies folded together (SPA/ESP, NET/HOL/NED, DEU/Germany…). Used to split players who
 * merely share a name into separate career identities. Empty/unknown → ''.
 */
function normNat(nat) {
  const up = (nat || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!up) return '';
  const code = up.slice(0, 3);
  return ({ SPA: 'ESP', NET: 'NED', HOL: 'NED', DEU: 'GER', HRV: 'CRO', POR: 'POR' }[code]) ?? code;
}

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

/** Volume-aware goal rate: raw rate discounted for small samples so cameo scorers don't top a pool. */
function adjustedGoalRate(goals, appearances) {
  const rate = goals / Math.max(appearances, 1);
  const volumeWeight = Math.min(1, appearances / 28);
  return rate * (0.55 + 0.45 * volumeWeight);
}

/** Fraction of pool values strictly below `value` (mid-rank for ties) → percentile in [0,1]. */
function percentileRank(value, sortedPool) {
  if (sortedPool.length === 0) return 0;
  let below = 0;
  let equal = 0;
  for (const v of sortedPool) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return clamp01((below + equal / 2) / sortedPool.length);
}

/**
 * Recomputes every player's ratings across the whole scraped dataset:
 *   pass 0 — build per-(league, season, position) attacking-output distributions,
 *   pass 1 — cross-season player identity + career-consistency count,
 *   pass 2 — season overall from usage + tier + output-percentile + career context,
 *   pass 3 — career-best prime, curated-anchor reshaping, write files back.
 */
export function rebuildAllRatings({ log = console.log } = {}) {
  const clubs = JSON.parse(readFileSync(join(DATA_DIR, 'clubs.json'), 'utf8'));
  const tierByClub = new Map(clubs.map((c) => [c.id, c.tier ?? 3]));
  const anchors = buildAnchorMap();

  const files = listClubSeasonFiles();
  const documents = files.map((file) => ({ file, doc: JSON.parse(readFileSync(file, 'utf8')) }));

  // Pass 0: attacking-output distribution per league-season-position (regular players only).
  const pools = new Map(); // key -> number[] of adjusted goal rates
  const poolKey = (leagueId, season, pos) => `${leagueId}|${season}|${pos}`;
  for (const { doc } of documents) {
    for (const record of doc.squad) {
      if (record.stats.appearances < MIN_APPS_FOR_POOL) continue;
      const key = poolKey(doc.leagueId, doc.season, record.broadPosition);
      const arr = pools.get(key) ?? [];
      arr.push(adjustedGoalRate(record.stats.goals, record.stats.appearances));
      pools.set(key, arr);
    }
  }

  // Pass 1: group every record by name, then split each name into separate career *identities* by
  // normalized nationality so that different players who share a name don't merge into one career
  // (which would let a namesake inherit a star's best season, career bonus, and anchor). Records
  // with no nationality are folded into that name's largest identity (assumed to be the main player).
  const docMaxApps = new Map(documents.map(({ doc }) => [doc, Math.max(...doc.squad.map((r) => r.stats.appearances), 20)]));
  const byName = new Map(); // nameKey -> [{record, doc}]
  for (const { doc } of documents) {
    for (const record of doc.squad) {
      const k = nameKey(record.name);
      (byName.get(k) ?? byName.set(k, []).get(k)).push({ record, doc });
    }
  }

  const recordCareer = new Map(); // record -> career
  const careers = []; // { nameKey, highUsageSeasons, entries: [{record, doc}] }
  for (const [nk, entries] of byName) {
    const groups = new Map(); // normNat -> entries[]
    const blanks = [];
    for (const e of entries) {
      const nn = normNat(e.record.nationality);
      if (!nn) { blanks.push(e); continue; }
      (groups.get(nn) ?? groups.set(nn, []).get(nn)).push(e);
    }
    if (groups.size === 0) {
      groups.set('', blanks);
    } else if (blanks.length) {
      let best = null, bestApps = -1;
      for (const [nn, g] of groups) {
        const a = g.reduce((s, e) => s + e.record.stats.appearances, 0);
        if (a > bestApps) { bestApps = a; best = nn; }
      }
      groups.get(best).push(...blanks);
    }
    for (const g of groups.values()) {
      const career = { nameKey: nk, highUsageSeasons: 0, entries: g };
      for (const e of g) {
        if (e.record.stats.appearances / docMaxApps.get(e.doc) >= HIGH_USAGE_THRESHOLD) career.highUsageSeasons += 1;
        recordCareer.set(e.record, career);
      }
      careers.push(career);
    }
  }

  // Pass 2: derive every season overall.
  const seasonOveralls = new Map(); // record object -> overall
  for (const { doc } of documents) {
    const tier = tierByClub.get(doc.clubId) ?? 3;
    const maxAppearances = Math.max(...doc.squad.map((r) => r.stats.appearances), 20);
    for (const record of doc.squad) {
      const { appearances, goals } = record.stats;
      const pos = record.broadPosition;
      const usage = appearances / maxAppearances;
      const noStats = appearances === 0 && doc.squad.every((r) => r.stats.appearances === 0);

      // Output score: percentile vs positional peers this league-season, blended with an
      // absolute-excellence safety score (so a prolific scorer in a low-scoring league still
      // rates well). Cameo seasons lean on the absolute score only.
      const absScore = absoluteOutputScore(pos, goals, appearances);
      let outputScore;
      if (appearances < MIN_APPS_FOR_POOL) {
        outputScore = 0.35 * absScore;
      } else {
        const pool = pools.get(poolKey(doc.leagueId, doc.season, pos)) ?? [];
        if (pool.length >= MIN_POOL_SIZE) {
          const pct = percentileRank(adjustedGoalRate(goals, appearances), pool);
          outputScore = 0.65 * pct + 0.35 * absScore;
        } else {
          outputScore = absScore;
        }
      }

      const career = recordCareer.get(record);
      const seedKey = `${doc.clubId}-${doc.season}-${record.name}-${record.nationality}`;
      const overall = computeSeasonOverall({
        usage, tier, broadPosition: pos, outputScore,
        careerHighUsageSeasons: career?.highUsageSeasons ?? 1,
        noStats, shirtNumber: record.shirtNumber, rng: seededRandom(seedKey),
      });
      seasonOveralls.set(record, overall);
    }
  }

  // Pass 3: per-identity prime + curated anchoring, then write back.
  let anchoredPlayers = 0;
  for (const career of careers) {
    const algs = career.entries.map(({ record }) => seasonOveralls.get(record));
    const algBest = Math.max(...algs);
    const rawAnchor = anchors.get(career.nameKey);
    // Only anchor an identity that actually reached near the peak on merit — a fringe namesake
    // (different player, same name) never does, so it keeps its own modest rating.
    const anchor = rawAnchor !== undefined && algBest >= rawAnchor - ANCHOR_GATE ? rawAnchor : undefined;

    let prime;
    let shift = 0;
    if (anchor !== undefined) {
      anchoredPlayers += 1;
      prime = anchor;
      // Slide the career so its best observed season sits at (or near) the curated peak,
      // preserving its real shape. Upward slide is capped so a star whose only data is a weak
      // season is NOT fully inflated to their peak (prime still carries the fame). Keepers and
      // defenders get a larger cap: we have no defensive stats to lift their season rating via
      // output, so the anchor is the only thing that can express an elite defensive season.
      const pos = career.entries[0].record.broadPosition;
      const upwardCap = pos === 'GK' || pos === 'DF' ? 13 : 8;
      shift = Math.min(anchor - algBest, upwardCap);
    } else {
      prime = clamp(algBest + 3, ABS_FLOOR, UNCURATED_PRIME_CAP);
    }

    for (const { record, doc } of career.entries) {
      const alg = seasonOveralls.get(record);
      const seasonOverall = anchor !== undefined
        ? clamp(alg + shift, Math.max(ABS_FLOOR, anchor - MAX_ANCHOR_DROP), anchor)
        : Math.min(alg, UNCURATED_SEASON_CAP);

      const seedKey = `${doc.clubId}-${doc.season}-${record.name}-${record.nationality}`;
      record.seasonRatings = subRatings(record.broadPosition, seasonOverall, seededRandom(seedKey));
      record.primeRatings = subRatings(record.broadPosition, prime, seededRandom(seedKey + '-prime'));
    }
  }

  for (const { file, doc } of documents) {
    writeFileSync(file, JSON.stringify(doc, null, 2));
  }

  log(`Ratings rebuilt: ${documents.length} club-seasons, ${careers.length} distinct identities, ${anchoredPlayers} matched curated anchors.`);
  return { clubSeasons: documents.length, players: careers.length, anchored: anchoredPlayers };
}

if (process.argv[1] && fileURLToPath(import.meta.url).endsWith('rebuildRatings.mjs') && process.argv[1].endsWith('rebuildRatings.mjs')) {
  rebuildAllRatings();
}
