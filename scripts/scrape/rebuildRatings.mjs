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
// A curated anchor is applied to an identity either (a) that reached within this of it on merit in
// some season, OR (b) that is the *primary* identity for the name (highest-rated, an established
// regular) — because a genuine star should be anchored even when their position suppresses the
// computed rating (keepers/deep playmakers have no output/defensive stats: Xavi, Alisson, Foden).
// A fringe *namesake* (a different player who happens to share the name — a squad "Óscar", the
// Colombian "Luis Suárez") is neither, so it keeps its own modest rating.
const ANCHOR_GATE = 14;
// The primary identity must at least look like a real first-team regular to claim the anchor, so a
// name whose only bearers are fringe players (the real star absent from our data) anchors nobody.
const STAR_FLOOR = 68;
const STAR_MIN_APPS = 18;

// Every scraped spelling/code of a nationality → one canonical code. Squad sources are wildly
// inconsistent (ITA vs Italy, CIV vs "Ivory Coast", IRL vs IRE vs "Republic of Ireland", SUI vs
// SWI, AUT vs Austria, POR vs PRT). Without folding these, one real player is split into several
// career identities and shows a different prime per season. Unlisted inputs fall back to their
// first three letters (already-consistent codes stay themselves).
const NAT_CANON = {
  IRL: 'IRL', IRE: 'IRL', IRELAND: 'IRL', REPUBLICOFIRELAND: 'IRL', ROI: 'IRL', EIRE: 'IRL',
  NIR: 'NIR', NORTHERNIRELAND: 'NIR',
  SUI: 'SUI', SWI: 'SUI', SWITZERLAND: 'SUI', SCHWEIZ: 'SUI',
  CIV: 'CIV', IVORYCOAST: 'CIV', COTEDIVOIRE: 'CIV',
  MAR: 'MAR', MOROCCO: 'MAR', MRC: 'MAR',
  AUT: 'AUT', AUSTRIA: 'AUT',
  AUS: 'AUS', AUSTRALIA: 'AUS',
  GER: 'GER', DEU: 'GER', GERMANY: 'GER', DEUTSCHLAND: 'GER', ALLEMAGNE: 'GER',
  ESP: 'ESP', SPA: 'ESP', SPAIN: 'ESP', ESPAGNE: 'ESP',
  NED: 'NED', NET: 'NED', HOL: 'NED', NETHERLANDS: 'NED', HOLLAND: 'NED', PAYSBAS: 'NED',
  POR: 'POR', PRT: 'POR', PORTUGAL: 'POR',
  SRB: 'SRB', SER: 'SRB', SERBIA: 'SRB',
  CRO: 'CRO', HRV: 'CRO', CROATIA: 'CRO', CROATIE: 'CRO',
  SVN: 'SVN', SLO: 'SVN', SLOVENIA: 'SVN',
  SVK: 'SVK', SLOVAKIA: 'SVK',
  COD: 'COD', DRCONGO: 'COD', CONGODR: 'COD', DRC: 'COD', DEMOCRATICREPUBLICOFTHECONGO: 'COD',
  CGO: 'CGO', CONGO: 'CGO',
  EQG: 'EQG', GNQ: 'EQG', EQUATORIALGUINEA: 'EQG',
  TGO: 'TGO', TOG: 'TGO', TOGO: 'TGO',
  NGA: 'NGA', NGR: 'NGA', NIGERIA: 'NGA',
  KOS: 'KOS', KVX: 'KOS', RKS: 'KOS', KOSOVO: 'KOS',
  ITA: 'ITA', ITALY: 'ITA', ITALIE: 'ITA',
  BRA: 'BRA', BRAZIL: 'BRA', BRESIL: 'BRA',
  ARG: 'ARG', ARGENTINA: 'ARG', ARGENTINE: 'ARG',
  FRA: 'FRA', FRANCE: 'FRA',
  ENG: 'ENG', ENGLAND: 'ENG',
  SCO: 'SCO', SCOTLAND: 'SCO', ECOSSE: 'SCO',
  WAL: 'WAL', WALES: 'WAL',
  BEL: 'BEL', BELGIUM: 'BEL', BELGIQUE: 'BEL',
  URU: 'URU', URUGUAY: 'URU',
  COL: 'COL', COLOMBIA: 'COL', COLOMBIE: 'COL',
  SEN: 'SEN', SENEGAL: 'SEN',
  GHA: 'GHA', GHANA: 'GHA',
  CMR: 'CMR', CAMEROON: 'CMR', CAMEROUN: 'CMR',
  ALG: 'ALG', DZA: 'ALG', ALGERIA: 'ALG', ALGERIE: 'ALG',
  TUN: 'TUN', TUNISIA: 'TUN', TUNISIE: 'TUN',
  EGY: 'EGY', EGYPT: 'EGY',
  MEX: 'MEX', MEXICO: 'MEX',
  USA: 'USA', UNITEDSTATES: 'USA', US: 'USA',
  JPN: 'JPN', JAPAN: 'JPN', JAP: 'JPN',
  KOR: 'KOR', SOUTHKOREA: 'KOR', KOREAREPUBLIC: 'KOR',
  DEN: 'DEN', DNK: 'DEN', DENMARK: 'DEN', DANEMARK: 'DEN',
  SWE: 'SWE', SWEDEN: 'SWE', SUEDE: 'SWE',
  NOR: 'NOR', NORWAY: 'NOR', NORVEGE: 'NOR',
  POL: 'POL', POLAND: 'POL', POLOGNE: 'POL',
  CZE: 'CZE', CZECHREPUBLIC: 'CZE', CZECHIA: 'CZE',
  GRE: 'GRE', GRC: 'GRE', GREECE: 'GRE', GRECE: 'GRE',
  TUR: 'TUR', TURKEY: 'TUR', TURQUIE: 'TUR',
  RUS: 'RUS', RUSSIA: 'RUS', RUSSIE: 'RUS',
  UKR: 'UKR', UKRAINE: 'UKR',
  ROU: 'ROU', ROMANIA: 'ROU', ROUMANIE: 'ROU',
  HUN: 'HUN', HUNGARY: 'HUN',
  ISL: 'ISL', ICELAND: 'ISL',
  FIN: 'FIN', FINLAND: 'FIN',
  BIH: 'BIH', BOSNIAANDHERZEGOVINA: 'BIH', BOSNIA: 'BIH',
  MNE: 'MNE', MONTENEGRO: 'MNE',
  MKD: 'MKD', NORTHMACEDONIA: 'MKD', MACEDONIA: 'MKD',
  ALB: 'ALB', ALBANIA: 'ALB',
  PAR: 'PAR', PARAGUAY: 'PAR',
  PER: 'PER', PERU: 'PER', PEROU: 'PER',
  CHI: 'CHI', CHILE: 'CHI', CHILI: 'CHI',
  ECU: 'ECU', ECUADOR: 'ECU', EQUATEUR: 'ECU',
  VEN: 'VEN', VENEZUELA: 'VEN',
  CAN: 'CAN', CANADA: 'CAN',
  MLI: 'MLI', MALI: 'MLI',
  GUI: 'GUI', GIN: 'GUI', GUINEA: 'GUI', GUINEE: 'GUI',
  GAB: 'GAB', GABON: 'GAB',
  BFA: 'BFA', BURKINAFASO: 'BFA',
  ZAM: 'ZAM', ZMB: 'ZAM', ZAMBIA: 'ZAM',
  RSA: 'RSA', SOUTHAFRICA: 'RSA',
  NGR2: 'NGA',
};
function normNat(nat) {
  const up = (nat || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!up) return '';
  return NAT_CANON[up] ?? up.slice(0, 3);
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

  // Pass 1: resolve player *identities*. Records that share a name are the same person if they
  // share a nationality OR a club (union-find) — so different players who merely share a name split
  // apart (they wouldn't otherwise let a namesake inherit a star's best season, career bonus and
  // anchor), while the SAME player is kept together even when a season lists them under a second
  // nationality (Italo-Brazilian Jorginho at Napoli under "BRA" then "ITA" — the shared club links
  // them). This keeps one player's prime consistent across all their seasons.
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
    const parent = entries.map((_, i) => i);
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const union = (a, b) => { parent[find(a)] = find(b); };
    const firstByNat = new Map();
    const firstByClub = new Map();
    entries.forEach((e, i) => {
      const nn = normNat(e.record.nationality);
      if (nn) { if (firstByNat.has(nn)) union(i, firstByNat.get(nn)); else firstByNat.set(nn, i); }
      const cl = e.doc.clubId;
      if (firstByClub.has(cl)) union(i, firstByClub.get(cl)); else firstByClub.set(cl, i);
    });
    const comps = new Map(); // root -> entries[]
    entries.forEach((e, i) => { const r = find(i); (comps.get(r) ?? comps.set(r, []).get(r)).push(e); });
    for (const g of comps.values()) {
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

  // Pre-pass: each career's best computed season, and — per name — the "primary" identity (the
  // highest-rated one, and whether it's an established regular) used to place curated anchors.
  const algBestOf = new Map(careers.map((c) => [c, Math.max(...c.entries.map((e) => seasonOveralls.get(e.record)))]));
  const primaryByName = new Map(); // nameKey -> { alg, apps }
  for (const c of careers) {
    const alg = algBestOf.get(c);
    const apps = Math.max(...c.entries.map((e) => e.record.stats.appearances), 0);
    const prev = primaryByName.get(c.nameKey);
    if (!prev || alg > prev.alg) primaryByName.set(c.nameKey, { alg, apps });
  }

  // Pass 3: per-identity prime + curated anchoring, then write back.
  let anchoredPlayers = 0;
  for (const career of careers) {
    const algBest = algBestOf.get(career);
    const rawAnchor = anchors.get(career.nameKey);
    let anchor;
    if (rawAnchor === undefined) {
      anchor = undefined;
    } else {
      const primary = primaryByName.get(career.nameKey);
      const starPresent = primary.alg >= STAR_FLOOR && primary.apps >= STAR_MIN_APPS;
      const careerApps = Math.max(...career.entries.map((e) => e.record.stats.appearances), 0);
      // Anchor if this identity is independently near the peak, OR — when the name's star is really
      // in the data — this identity is itself an established regular at a plausible level. That last
      // clause keeps a star split across genuine dual nationalities (Rice IRL→ENG, Jorginho ITA/BRA)
      // consistent, while a fringe namesake (never a regular) is still excluded.
      const isStarIdentity = starPresent && careerApps >= STAR_MIN_APPS && algBest >= STAR_FLOOR;
      anchor = algBest >= rawAnchor - ANCHOR_GATE || isStarIdentity ? rawAnchor : undefined;
    }

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
