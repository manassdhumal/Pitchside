/**
 * Independent rating estimator (v3). All ratings here are PitchSide-original numeric estimates,
 * derived from real public appearance/goal data plus a hand-assigned club-strength tier and a
 * curated peak-anchor list — never copied from FIFA, Football Manager, or any other proprietary
 * ratings database. Deterministic (seeded by name+club+season) so reruns are stable.
 *
 * Design philosophy (mirrors 38-0's season-by-season model):
 *   - A season rating answers "how good was this player THAT season", not their fame/career.
 *   - Attacking output is scored as a PERCENTILE against same-position peers in the same
 *     league-season, so scoring "a few goals" only helps if few peers scored more (dominance vs
 *     the era's league), instead of an unbounded goals-per-app bonus that inflated mid players.
 *   - Playing time sets a fringe→starter axis with a genuine low floor: bench/academy players
 *     fall into the 40s-low-50s; a full-season regular at a mid club is ~70-74, not 80+.
 *   - Club tier is the main vertical spread for defenders/keepers (we have no defensive stats).
 *   - Prime = career-best interpretation (anchor for curated stars; best season + small premium
 *     otherwise), always distinct from the season rating.
 */
export function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function clamp(value, min = 1, max = 99) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

// Absolute scale bounds. Fringe/bad players may sit in the mid-40s; only curated elite anchors
// reach 94+. Uncurated players are capped below the elite band in rebuildRatings.
export const ABS_FLOOR = 44;
export const HARD_CAP = 97;
export const UNCURATED_SEASON_CAP = 87;
export const UNCURATED_PRIME_CAP = 89;

// Club-quality proxy added at full usage (weight 1). This is the MAIN vertical lever for
// defenders and keepers: they have no attacking output to separate them, but a trusted
// first-choice regular at an elite club is, on average, an elite defender even though the raw
// data can't prove it. Scaled by usage so a fringe player at a big club is NOT inflated.
const TIER_QUALITY = { 1: 14, 2: 9.5, 3: 5, 4: 2 };
// How heavily each position leans on the club-quality proxy vs attacking output. Keepers and
// defenders lean almost entirely on it (their whole vertical spread), while forwards earn most
// of their rating through output instead, so the two levers don't stack into the cap.
const TIER_POS_WEIGHT = { GK: 1.05, DF: 1.05, MF: 0.7, FW: 0.5 };
// Maximum attacking-output contribution by position (a league-leading scorer gets the full amount).
const POS_OUTPUT_MAX = { FW: 18, MF: 12, DF: 4, GK: 0 };
// Goals-per-appearance considered "elite" for the absolute-excellence safety score.
export const POS_ELITE_RATE = { FW: 0.75, MF: 0.42, DF: 0.16, GK: 1 };

/** Playing-time base: fringe ~48-52, rotation ~59-62, full-season regular ~67-68. */
export function usageBase(usage) {
  return 46 + 22 * Math.pow(Math.max(0, Math.min(1, usage)), 0.7);
}

/**
 * Absolute-excellence score in [0,1] from raw goal rate alone — used as the scrape-time
 * placeholder and blended (35%) into the authoritative percentile score in rebuildRatings.
 */
export function absoluteOutputScore(broadPosition, goals, appearances) {
  const rate = goals / Math.max(appearances, 1);
  return clamp01(rate / (POS_ELITE_RATE[broadPosition] ?? 1));
}

/**
 * The core season-overall model. `outputScore` is a [0,1] measure of attacking output strength
 * (percentile-vs-peers in the authoritative path, absolute-rate at scrape time).
 */
export function computeSeasonOverall({ usage, tier, broadPosition, outputScore, careerHighUsageSeasons, noStats, rng }) {
  if (noStats) {
    // No appearance data available (older/simpler article format) - tier-aware plausible baseline.
    const tierBase = { 1: 72, 2: 68, 3: 65, 4: 62 }[tier] ?? 65;
    return clamp(tierBase + (rng() - 0.5) * 8, ABS_FLOOR, 84);
  }

  const u = clamp01(usage);
  let overall = usageBase(u);
  // Club-quality proxy: dominant lever for GK/DF, lighter for FW/MF (who get output instead).
  overall += (TIER_QUALITY[tier] ?? 5) * u * (TIER_POS_WEIGHT[broadPosition] ?? 0.7);
  overall += (POS_OUTPUT_MAX[broadPosition] ?? 0) * clamp01(outputScore ?? 0);
  overall += Math.min(2, Math.max(0, (careerHighUsageSeasons ?? 1) - 1) * 0.9); // proven fixture
  overall += (rng() - 0.5) * 3;

  return clamp(overall, ABS_FLOOR, HARD_CAP);
}

export function subRatings(broadPosition, overall, rng) {
  const jitter = () => (rng() - 0.5) * 6;
  const base = {
    pace: overall, shooting: overall, passing: overall,
    dribbling: overall, defending: overall, physical: overall,
  };

  switch (broadPosition) {
    case 'GK':
      return {
        overall,
        pace: clamp(45 + jitter()),
        shooting: clamp(18 + jitter()),
        passing: clamp(overall - 15 + jitter()),
        dribbling: clamp(overall - 30 + jitter()),
        defending: clamp(overall - 20 + jitter()),
        physical: clamp(overall - 5 + jitter()),
        goalkeeping: clamp(overall + 8 + jitter()),
      };
    case 'DF':
      return {
        overall,
        pace: clamp(base.pace - 5 + jitter()),
        shooting: clamp(base.shooting - 20 + jitter()),
        passing: clamp(base.passing - 5 + jitter()),
        dribbling: clamp(base.dribbling - 10 + jitter()),
        defending: clamp(base.defending + 8 + jitter()),
        physical: clamp(base.physical + 3 + jitter()),
      };
    case 'MF':
      return {
        overall,
        pace: clamp(base.pace - 3 + jitter()),
        shooting: clamp(base.shooting - 8 + jitter()),
        passing: clamp(base.passing + 5 + jitter()),
        dribbling: clamp(base.dribbling + jitter()),
        defending: clamp(base.defending - 10 + jitter()),
        physical: clamp(base.physical - 3 + jitter()),
      };
    case 'FW':
    default:
      return {
        overall,
        pace: clamp(base.pace + 3 + jitter()),
        shooting: clamp(base.shooting + 8 + jitter()),
        passing: clamp(base.passing - 8 + jitter()),
        dribbling: clamp(base.dribbling + 3 + jitter()),
        defending: clamp(base.defending - 25 + jitter()),
        physical: clamp(base.physical - 3 + jitter()),
      };
  }
}

/**
 * Scrape-time placeholder derivation (no whole-dataset context). Uses absolute goal rate for
 * output and neutral tier/career assumptions. The authoritative ratings come from
 * rebuildRatings.mjs, which recomputes everything with league-season percentiles and anchors.
 */
export function deriveRatings(seedKey, broadPosition, appearances, goals, maxAppearances, noStats = false) {
  const rng = seededRandom(seedKey);
  const usage = Math.min(1, appearances / Math.max(maxAppearances, 20));
  const overall = computeSeasonOverall({
    usage, tier: 3, broadPosition,
    outputScore: absoluteOutputScore(broadPosition, goals, appearances),
    careerHighUsageSeasons: 1, noStats, rng,
  });
  const seasonRatings = subRatings(broadPosition, overall, rng);

  const primeOverall = clamp(overall + 3, overall, UNCURATED_PRIME_CAP);
  const primeRatings = subRatings(broadPosition, primeOverall, seededRandom(seedKey + '-prime'));

  return { seasonRatings, primeRatings };
}
