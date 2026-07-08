/**
 * Independent rating estimator. All ratings here are PitchSide-original numeric estimates,
 * derived from real public appearance/goal data plus a hand-assigned club-strength tier —
 * never copied from FIFA, Football Manager, or any other proprietary ratings database.
 * Deterministic (seeded by name+club+season) so reruns are stable.
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

/**
 * v2 season overall. Comparative signals:
 * - usage: share of the squad's max appearances that season (proxy for being a first-choice pick)
 * - club tier: being first-choice at an elite club implies a far higher level than at a small club,
 *   scaled by usage so benchwarmers at big clubs don't inherit the bonus
 * - goal involvement per appearance, weighted by position archetype
 * - career consistency: number of seasons (across the whole dataset) as a heavy-usage player
 */
/**
 * Every player here made a real top-flight club's squad list, so the scale floor is 60 —
 * academy fillers land 60-64, fringe players mid-60s, regulars 70+, elite seasons up to 93.
 */
export const SEASON_FLOOR = 60;
export const SEASON_CAP = 93;

export function deriveSeasonOverall({ broadPosition, appearances, goals, maxAppearances, tier, careerHighUsageSeasons, noStats, rng }) {
  if (noStats) {
    // No appearance data available (older/simpler article format) - plausible squad-member
    // baseline, still tier-aware.
    const tierBase = { 1: 76, 2: 72, 3: 69, 4: 66 }[tier] ?? 69;
    return clamp(tierBase + (rng() - 0.5) * 10, SEASON_FLOOR, 88);
  }

  const usage = Math.min(1, appearances / Math.max(maxAppearances, 20));
  const tierBonus = ({ 1: 8, 2: 5, 3: 2, 4: 0 }[tier] ?? 2) * usage;

  let overall = SEASON_FLOOR + usage * 12 + tierBonus;

  // Weights sized so a first-choice regular at an elite club sits in the mid-80s and only a
  // truly prolific season approaches the low-90s cap - the very top is reserved for anchors.
  const goalsPerApp = goals / Math.max(appearances, 1);
  if (broadPosition === 'FW') overall += Math.min(11, goalsPerApp * 26);
  else if (broadPosition === 'MF') overall += Math.min(9, goalsPerApp * 36);
  else if (broadPosition === 'DF') overall += Math.min(4, goalsPerApp * 40);
  else if (broadPosition === 'GK') overall += 1.5 * usage;

  overall += Math.min(3, Math.max(0, (careerHighUsageSeasons ?? 1) - 1));
  overall += (rng() - 0.5) * 4;

  return clamp(overall, SEASON_FLOOR, SEASON_CAP);
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
 * v1 single-season derivation, kept for scrape-time placeholder ratings. The authoritative
 * ratings come from rebuildRatings.mjs, which recomputes everything with cross-season and
 * curated-anchor context after each scrape run.
 */
export function deriveRatings(seedKey, broadPosition, appearances, goals, maxAppearances, noStats = false) {
  const rng = seededRandom(seedKey);
  const overall = deriveSeasonOverall({
    broadPosition, appearances, goals, maxAppearances,
    tier: 3, careerHighUsageSeasons: 1, noStats, rng,
  });
  const seasonRatings = subRatings(broadPosition, overall, rng);

  const primeOverall = clamp(overall + (95 - overall) * 0.22, overall, 95);
  const primeRatings = subRatings(broadPosition, primeOverall, seededRandom(seedKey + '-prime'));

  return { seasonRatings, primeRatings };
}
