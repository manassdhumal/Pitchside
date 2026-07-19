import type { Match } from '../types';

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
 * Team-level season stats derived purely from the user's matches (already in matchday order). The
 * simulator produces team scores only, so there are no individual-scorer stats. `points` uses the
 * standard 3-1-0.
 */
export function computeSeasonStats(matches: Match[], userTeamId: string): SeasonStats {
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

  return {
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
}
