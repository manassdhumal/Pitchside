import type { Match, Player, Position } from '../types';

export interface VenueRecord {
  won: number;
  drawn: number;
  lost: number;
}

export interface MarginResult {
  /** User's goals in that match. */
  forGoals: number;
  againstGoals: number;
  /** Opponent team id. */
  oppId: string;
  /** True if the user played at home. */
  home: boolean;
}

export interface SeasonStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** Win percentage, 0–100 (rounded). */
  winRate: number;
  cleanSheets: number;
  failedToScore: number;
  longestWinStreak: number;
  longestUnbeatenRun: number;
  home: VenueRecord;
  away: VenueRecord;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  biggestWin: MarginResult | null;
  heaviestDefeat: MarginResult | null;
  /** Per-matchday result letters in order — 'W' | 'D' | 'L'. */
  form: ('W' | 'D' | 'L')[];
  /** Cumulative points after each matchday, for a progression chart. */
  cumulativePoints: number[];
  /**
   * Per-player goal/assist tallies for the user's XI, present only when the XI is passed to
   * `computeSeasonStats`. The sim produces team scores only, so these are a deterministic
   * attribution of each real goal to a likely scorer/assister (see `attributePlayerStats`).
   */
  players?: PlayerStatLine[];
  /** A headline "how did the season go" verdict, present when league context is supplied. */
  verdict?: SeasonVerdict;
  /** Bulleted takeaways about the campaign, present when league context is supplied. */
  insights?: SeasonInsight[];
}

export interface PlayerStatLine {
  playerId: string;
  name: string;
  position: Position;
  goals: number;
  assists: number;
}

export type InsightTone = 'good' | 'bad' | 'neutral';

export interface SeasonVerdict {
  title: string;
  blurb: string;
  tone: InsightTone;
}

export interface SeasonInsight {
  title: string;
  detail: string;
  tone: InsightTone;
}

/** League context needed to phrase finish-based and rank-based insights. */
export interface SeasonContext {
  /** Final league position, 1-based. */
  position: number;
  /** Number of teams in the division. */
  teamCount: number;
  /** Rank of the user's goals-scored among all teams, 1 = most. */
  goalsForRank: number;
  /** Rank of the user's goals-conceded among all teams, 1 = fewest. */
  goalsAgainstRank: number;
  /** Competition/league name, for phrasing. */
  competition?: string;
}

export interface SeasonStatsOptions {
  /** The user's starting XI — enables per-player scorer/assist attribution. */
  xi?: Player[];
  /** League context — enables the verdict + insights. */
  context?: SeasonContext;
}

/**
 * What we persist in a saved season's `summary` so My Career can re-render the full stats panel
 * without the raw match blob or the live team-name map. `teamNames` is a plain id→name object
 * (JSON-friendly) covering the opponents referenced by the stats (biggest win / heaviest defeat).
 */
export interface StoredSeasonStats {
  stats: SeasonStats;
  teamNames: Record<string, string>;
}

/** The user's view of a single match: goals for/against, opponent, venue, and W/D/L outcome. */
function fromUser(m: Match, userTeamId: string): MarginResult & { outcome: 'W' | 'D' | 'L' } {
  const home = m.homeTeamId === userTeamId;
  const forGoals = home ? m.homeScore : m.awayScore;
  const againstGoals = home ? m.awayScore : m.homeScore;
  const oppId = home ? m.awayTeamId : m.homeTeamId;
  const outcome = forGoals > againstGoals ? 'W' : forGoals === againstGoals ? 'D' : 'L';
  return { forGoals, againstGoals, oppId, home, outcome };
}

/**
 * Team-level season stats derived from the user's matches (already in matchday order), `points`
 * on the standard 3-1-0. Pass `opts.xi` to also attribute per-player goals/assists, and
 * `opts.context` to add a verdict + insights. Both are optional so the pure team-stats path (and
 * its unit test) is unaffected.
 */
export function computeSeasonStats(matches: Match[], userTeamId: string, opts: SeasonStatsOptions = {}): SeasonStats {
  const played = matches.length;
  let won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0;
  let cleanSheets = 0, failedToScore = 0;
  let winStreak = 0, longestWinStreak = 0;
  let unbeaten = 0, longestUnbeatenRun = 0;
  const home: VenueRecord = { won: 0, drawn: 0, lost: 0 };
  const away: VenueRecord = { won: 0, drawn: 0, lost: 0 };
  let biggestWin: MarginResult | null = null;
  let heaviestDefeat: MarginResult | null = null;
  const form: ('W' | 'D' | 'L')[] = [];
  const cumulativePoints: number[] = [];
  let running = 0;

  for (const m of matches) {
    const u = fromUser(m, userTeamId);
    goalsFor += u.forGoals;
    goalsAgainst += u.againstGoals;
    if (u.againstGoals === 0) cleanSheets += 1;
    if (u.forGoals === 0) failedToScore += 1;

    const venue = u.home ? home : away;
    if (u.outcome === 'W') {
      won += 1; venue.won += 1;
      winStreak += 1; unbeaten += 1;
      const margin = u.forGoals - u.againstGoals;
      const best = biggestWin ? biggestWin.forGoals - biggestWin.againstGoals : -Infinity;
      if (margin > best) biggestWin = u;
      running += 3;
    } else if (u.outcome === 'D') {
      drawn += 1; venue.drawn += 1;
      winStreak = 0; unbeaten += 1;
      running += 1;
    } else {
      lost += 1; venue.lost += 1;
      winStreak = 0; unbeaten = 0;
      const margin = u.againstGoals - u.forGoals;
      const worst = heaviestDefeat ? heaviestDefeat.againstGoals - heaviestDefeat.forGoals : -Infinity;
      if (margin > worst) heaviestDefeat = u;
    }
    longestWinStreak = Math.max(longestWinStreak, winStreak);
    longestUnbeatenRun = Math.max(longestUnbeatenRun, unbeaten);
    form.push(u.outcome);
    cumulativePoints.push(running);
  }

  const stats: SeasonStats = {
    played, won, drawn, lost, goalsFor, goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points: won * 3 + drawn,
    winRate: played ? Math.round((won / played) * 100) : 0,
    cleanSheets, failedToScore, longestWinStreak, longestUnbeatenRun,
    home, away,
    goalsForPerGame: played ? goalsFor / played : 0,
    goalsAgainstPerGame: played ? goalsAgainst / played : 0,
    biggestWin, heaviestDefeat, form, cumulativePoints,
  };

  if (opts.xi && opts.xi.length > 0) {
    stats.players = attributePlayerStats(matches, userTeamId, opts.xi);
  }
  if (opts.context) {
    const { verdict, insights } = deriveSeasonInsights(stats, opts.context);
    stats.verdict = verdict;
    stats.insights = insights;
  }
  return stats;
}

// ---- Per-player scorer/assist attribution ---------------------------------------------------
//
// The match engine only outputs team scores, so we can't know who actually scored. Instead we
// deterministically hand each real goal to a plausible scorer (and often an assister), weighted by
// position and finishing/creativity rating. Seeding the RNG from the match id makes it stable: the
// live results screen and the persisted-then-reopened Career view attribute identically.

/** Finishing propensity by position — how likely a player in that slot is to be the goalscorer. */
const GOAL_WEIGHT: Record<Position, number> = {
  GK: 0.02, CB: 0.35, LB: 0.25, RB: 0.25, LWB: 0.3, RWB: 0.3,
  CDM: 0.4, CM: 0.75, CAM: 1.25, LM: 0.9, RM: 0.9, LW: 1.55, RW: 1.55, ST: 2.0,
};
/** Chance-creation propensity by position — how likely a player is to lay on the assist. */
const ASSIST_WEIGHT: Record<Position, number> = {
  GK: 0.02, CB: 0.2, LB: 0.5, RB: 0.5, LWB: 0.7, RWB: 0.7,
  CDM: 0.6, CM: 1.1, CAM: 1.6, LM: 1.2, RM: 1.2, LW: 1.35, RW: 1.35, ST: 0.7,
};
/** Share of goals that get an assist attributed (the rest are solo efforts / unassisted). */
const ASSIST_SHARE = 0.78;

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32) → a `() => [0,1)` stream from a seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weighted pick from `players` using `weights[i]`; returns the chosen index, or -1 if all zero. */
function weightedPick(weights: number[], roll: number): number {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return -1;
  let r = roll * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

const playerName = (p: Player) => `${p.firstName} ${p.lastName}`.trim();

function attributePlayerStats(matches: Match[], userTeamId: string, xi: Player[]): PlayerStatLine[] {
  const lines: PlayerStatLine[] = xi.map((p) => ({
    playerId: p.id, name: playerName(p), position: p.position, goals: 0, assists: 0,
  }));
  const goalW = xi.map((p) => GOAL_WEIGHT[p.position] * (0.55 + 0.9 * (p.ratings.shooting / 100)));
  const assistW = xi.map((p) => ASSIST_WEIGHT[p.position] * (0.55 + 0.9 * (p.ratings.passing / 100)));

  for (const match of matches) {
    const home = match.homeTeamId === userTeamId;
    const goalsFor = home ? match.homeScore : match.awayScore;
    if (goalsFor <= 0) continue;
    const rng = mulberry32(hashString(match.id));
    for (let g = 0; g < goalsFor; g++) {
      const scorer = weightedPick(goalW, rng());
      if (scorer < 0) continue;
      lines[scorer].goals += 1;
      // Assist: sometimes, and never the scorer themselves.
      if (rng() < ASSIST_SHARE) {
        const aw = assistW.slice();
        aw[scorer] = 0;
        const assister = weightedPick(aw, rng());
        if (assister >= 0) lines[assister].assists += 1;
      }
    }
  }

  return lines
    .filter((l) => l.goals > 0 || l.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name));
}

// ---- Narrative insights ---------------------------------------------------------------------

const pct = (position: number, teamCount: number) => (teamCount > 1 ? (position - 1) / (teamCount - 1) : 0);

/** A headline verdict + a prioritized list of takeaways from the season and its league context. */
export function deriveSeasonInsights(stats: SeasonStats, ctx: SeasonContext): { verdict: SeasonVerdict; insights: SeasonInsight[] } {
  const verdict = deriveVerdict(stats, ctx);
  const insights: SeasonInsight[] = [];
  const { played } = stats;
  const homeGames = stats.home.won + stats.home.drawn + stats.home.lost;
  const awayGames = stats.away.won + stats.away.drawn + stats.away.lost;

  // Attack.
  if (ctx.goalsForRank === 1) {
    insights.push({ tone: 'good', title: 'Sharpest attack in the division', detail: `${stats.goalsFor} goals — more than any other side.` });
  } else if (ctx.goalsForRank <= 3) {
    insights.push({ tone: 'good', title: 'One of the league’s best attacks', detail: `${stats.goalsFor} scored (${ordinal(ctx.goalsForRank)} most).` });
  } else if (played > 0 && stats.goalsForPerGame < 1) {
    insights.push({ tone: 'bad', title: 'Blunt in the final third', detail: `Just ${stats.goalsFor} goals all season (${stats.goalsForPerGame.toFixed(1)}/game).` });
  }

  // Defence.
  if (ctx.goalsAgainstRank === 1) {
    insights.push({ tone: 'good', title: 'Meanest defence around', detail: `Only ${stats.goalsAgainst} conceded — fewer than anyone.` });
  } else if (played > 0 && stats.cleanSheets >= played * 0.4) {
    insights.push({ tone: 'good', title: 'Defensively resolute', detail: `${stats.cleanSheets} clean sheets in ${played} games.` });
  } else if (played > 0 && stats.goalsAgainstPerGame > 1.6) {
    insights.push({ tone: 'bad', title: 'Leaky at the back', detail: `${stats.goalsAgainst} conceded (${stats.goalsAgainstPerGame.toFixed(1)}/game).` });
  }

  // Home & away character.
  if (homeGames > 0 && stats.home.lost === 0) {
    insights.push({ tone: 'good', title: 'A fortress at home', detail: `Unbeaten in all ${homeGames} home games.` });
  }
  if (awayGames >= 4 && stats.away.won === 0) {
    insights.push({ tone: 'bad', title: 'No joy on the road', detail: `Failed to win any of ${awayGames} away trips.` });
  }

  // Runs.
  if (stats.longestWinStreak >= 5) {
    insights.push({ tone: 'good', title: 'On a heater', detail: `Reeled off ${stats.longestWinStreak} wins in a row.` });
  } else if (stats.longestUnbeatenRun >= 10) {
    insights.push({ tone: 'good', title: 'Hard to beat', detail: `Went ${stats.longestUnbeatenRun} games unbeaten at one stretch.` });
  }

  // Talisman.
  const top = stats.players?.[0];
  if (top && top.goals > 0) {
    insights.push({ tone: 'neutral', title: 'Your talisman', detail: `${top.name} led the way with ${top.goals} goal${top.goals === 1 ? '' : 's'}.` });
  }

  // Statement result.
  const bw = stats.biggestWin;
  if (bw && bw.forGoals - bw.againstGoals >= 4) {
    insights.push({ tone: 'good', title: 'Statement result', detail: `A ${bw.forGoals}–${bw.againstGoals} demolition ${bw.home ? 'at home' : 'away'}.` });
  }

  return { verdict, insights: insights.slice(0, 6) };
}

function deriveVerdict(stats: SeasonStats, ctx: SeasonContext): SeasonVerdict {
  const { position, teamCount } = ctx;
  const p = pct(position, teamCount);
  if (stats.played > 0 && stats.lost === 0) {
    return { tone: 'good', title: 'The Invincibles', blurb: 'An entire season without a single defeat. Immortal.' };
  }
  if (position === 1) {
    return { tone: 'good', title: 'Champions', blurb: 'Top of the pile. The title is yours.' };
  }
  if (p <= 0.2) {
    return { tone: 'good', title: 'Right in the mix', blurb: `A ${ordinal(position)}-place finish — knocking on the door of the very top.` };
  }
  if (p <= 0.5) {
    return { tone: 'neutral', title: 'Comfortable mid-table', blurb: `${ordinal(position)} of ${teamCount}. Steady, if unspectacular.` };
  }
  if (position === teamCount) {
    return { tone: 'bad', title: 'The wooden spoon', blurb: 'Dead last. One to forget.' };
  }
  if (p <= 0.85) {
    return { tone: 'bad', title: 'A hard slog', blurb: `${ordinal(position)} of ${teamCount} — a season spent looking over your shoulder.` };
  }
  return { tone: 'bad', title: 'Down among the strugglers', blurb: `${ordinal(position)} of ${teamCount}. Survival was the only story.` };
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
