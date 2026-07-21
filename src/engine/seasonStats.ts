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
  /** Total expected goals for/against, summed from each match's model xG. */
  xgFor?: number;
  xgAgainst?: number;
  /**
   * Per-player goal/assist tallies for the user's XI, present only when the XI is passed to
   * `computeSeasonStats`. The sim produces team scores only, so these are a deterministic
   * attribution of each real goal to a likely scorer/assister (see `attributePlayerStats`).
   */
  players?: PlayerStatLine[];
  /** The standout performer of the user's XI, position-weighted so a big-contributing defender counts. */
  playerOfSeason?: PlayerStatLine;
  /** League-wide top scorers (all teams), present when a golden-boot table is computed and attached. */
  goldenBoot?: GoldenBootEntry[];
  /** A headline "how did the season go" verdict, present when league context is supplied. */
  verdict?: SeasonVerdict;
  /** Bulleted takeaways about the campaign, present when league context is supplied. */
  insights?: SeasonInsight[];
}

/** A league-wide golden-boot row: a scorer from any team, tagged if it's one of the user's players. */
export interface GoldenBootEntry {
  playerId: string;
  name: string;
  position: Position;
  teamId: string;
  teamName: string;
  goals: number;
  assists: number;
  isUser: boolean;
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
  let xgFor = 0, xgAgainst = 0;

  for (const m of matches) {
    const u = fromUser(m, userTeamId);
    goalsFor += u.forGoals;
    goalsAgainst += u.againstGoals;
    xgFor += u.home ? m.homeXG : m.awayXG;
    xgAgainst += u.home ? m.awayXG : m.homeXG;
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
    xgFor, xgAgainst,
  };

  if (opts.xi && opts.xi.length > 0) {
    stats.players = playerStatsFromEvents(matches, userTeamId, opts.xi);
    stats.playerOfSeason = pickPlayerOfSeason(stats.players);
  }
  if (opts.context) {
    const { verdict, insights } = deriveSeasonInsights(stats, opts.context);
    stats.verdict = verdict;
    stats.insights = insights;
  }
  return stats;
}

// ---- Per-player stats from the event sim ----------------------------------------------------
//
// The match engine records who scored and assisted each goal (Match.goals), so we just tally those
// events — the scorers are causally consistent with the scorelines, no attribution guessing. Position
// (for the display chip and the Player-of-the-Season weighting) is resolved from the team's XI.

function positionById(xi: Player[]): Map<string, Position> {
  return new Map(xi.map((p) => [p.id, p.position]));
}

/** Tally a team's goals/assists from the goal events on its matches. */
function playerStatsFromEvents(matches: Match[], teamId: string, xi: Player[]): PlayerStatLine[] {
  const pos = positionById(xi);
  const lines = new Map<string, PlayerStatLine>();
  const bump = (id: string, name: string, dg: number, da: number) => {
    let cur = lines.get(id);
    if (!cur) { cur = { playerId: id, name, position: pos.get(id) ?? 'CM', goals: 0, assists: 0 }; lines.set(id, cur); }
    cur.goals += dg; cur.assists += da;
  };
  for (const m of matches) {
    for (const g of m.goals ?? []) {
      if (g.teamId !== teamId) continue;
      bump(g.scorerId, g.scorerName, 1, 0);
      if (g.assistId) bump(g.assistId, g.assistName ?? g.assistId, 0, 1);
    }
  }
  return [...lines.values()]
    .filter((l) => l.goals > 0 || l.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name));
}

// Prestige of a goal contribution by position: goals are rarer for defensive players, so a
// defender/keeper who chips in is a bigger story than a striker doing their job. Used to pick a
// position-fair Player of the Season rather than always crowning the top striker.
const POTS_PRESTIGE: Record<Position, number> = {
  GK: 1.7, CB: 1.5, LB: 1.35, RB: 1.35, LWB: 1.35, RWB: 1.35,
  CDM: 1.28, CM: 1.12, CAM: 1.0, LM: 1.02, RM: 1.02, LW: 0.96, RW: 0.96, ST: 0.9,
};

/** The standout performer: highest position-weighted (goals + 0.6·assists). */
function pickPlayerOfSeason(players: PlayerStatLine[]): PlayerStatLine | undefined {
  let best: PlayerStatLine | undefined;
  let bestScore = 0;
  for (const p of players) {
    const score = (p.goals + 0.6 * p.assists) * POTS_PRESTIGE[p.position];
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best;
}

/**
 * League-wide golden-boot table straight from every match's goal events, ranked across all teams.
 * `xiByTeam` is used only to resolve each scorer's position; `teamNames` for the club label.
 */
export function computeGoldenBoot(
  matches: Match[],
  xiByTeam: Map<string, Player[]>,
  teamNames: Map<string, string>,
  userTeamId: string,
  limit = 10,
): GoldenBootEntry[] {
  const pos = new Map<string, Position>();
  for (const xi of xiByTeam.values()) for (const p of xi) pos.set(p.id, p.position);

  const entries = new Map<string, GoldenBootEntry>(); // key: `${teamId}:${playerId}`
  const entry = (teamId: string, id: string, name: string): GoldenBootEntry => {
    const key = `${teamId}:${id}`;
    let e = entries.get(key);
    if (!e) {
      e = { playerId: id, name, position: pos.get(id) ?? 'CM', teamId, teamName: teamNames.get(teamId) ?? teamId, goals: 0, assists: 0, isUser: teamId === userTeamId };
      entries.set(key, e);
    }
    return e;
  };
  for (const m of matches) {
    for (const g of m.goals ?? []) {
      entry(g.teamId, g.scorerId, g.scorerName).goals += 1;
      if (g.assistId) entry(g.teamId, g.assistId, g.assistName ?? g.assistId).assists += 1;
    }
  }
  return [...entries.values()]
    .filter((e) => e.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name))
    .slice(0, limit);
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

  // Finishing vs expected goals (the model's xG proxy) — only when xG data is present.
  if (stats.xgFor && stats.xgFor > 0 && played > 0) {
    const diff = stats.goalsFor - stats.xgFor;
    if (diff / played > 0.25) {
      insights.push({ tone: 'good', title: 'Clinical finishers', detail: `Scored ${Math.round(diff)} more than expected (${stats.goalsFor} from ~${Math.round(stats.xgFor)} xG).` });
    } else if (diff / played < -0.25) {
      insights.push({ tone: 'bad', title: 'Profligate up front', detail: `${Math.round(-diff)} fewer goals than your ~${Math.round(stats.xgFor)} xG deserved.` });
    }
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
