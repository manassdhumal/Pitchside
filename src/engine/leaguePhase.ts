import type { Player, StandingsRow, EraRuleConfig } from '../types';
import { generateRoundRobinFixtures, simulateLeagueFixtures, buildStandingsTable } from './competitions';
import { simulateMatch, NEUTRAL_TACTICS, type TacticalShape, type MatchResult } from './matchEngine';

const POINTS = { win: 3, draw: 1, loss: 0 };
const PHASE_ERA: EraRuleConfig = { awayGoalsRule: false, goldenGoal: false, extraTimeMinutes: 0, penaltyShootout: false };

/** Every side plays this many league-phase games (the modern format's 8). */
export const MATCHES_PER_TEAM = 8;

export interface LeaguePhaseResult {
  /** The single league-phase table, best first. */
  table: StandingsRow[];
  /** Top 8 → straight to the Round of 16. */
  directIds: string[];
  /** 9th–24th → the knockout play-off round. */
  playoffIds: string[];
  /** 25th–36th → eliminated. */
  eliminatedIds: string[];
}

/**
 * The modern Champions League "league phase": one big table where every side plays 8 DIFFERENT
 * opponents (not a full round-robin). Modelled by taking the first 8 rounds of a single round-robin
 * over the whole field (circle method), so each team gets exactly 8 distinct opponents, then ranking
 * everyone into one table. Top 8 go straight to the Round of 16, 9th–24th into a play-off, 25th+ out.
 */
export function simulateLeaguePhase(
  teamIds: string[],
  xiByTeam: Map<string, Player[]>,
  tacticsByTeam?: Map<string, TacticalShape>,
): LeaguePhaseResult {
  const fixtures = generateRoundRobinFixtures(teamIds, false).filter((f) => f.round < MATCHES_PER_TEAM);
  const matches = simulateLeagueFixtures(fixtures, xiByTeam, 'ucl-league-phase', PHASE_ERA, tacticsByTeam);
  const table = buildStandingsTable(matches, teamIds, POINTS);
  return {
    table,
    directIds: table.slice(0, 8).map((r) => r.teamId),
    playoffIds: table.slice(8, 24).map((r) => r.teamId),
    eliminatedIds: table.slice(24).map((r) => r.teamId),
  };
}

export interface PlayoffTie {
  /** Higher seed (9th–16th) — hosts the second leg. */
  homeId: string;
  /** Lower seed (17th–24th). */
  awayId: string;
  leg1: MatchResult;
  leg2: MatchResult;
  /** Aggregate for the higher / lower seed. */
  aggHome: number;
  aggAway: number;
  winnerId: string;
  penalties?: { home: number; away: number };
  userInvolved: boolean;
}

function shootout(): { home: number; away: number } {
  const kick = () => (Math.random() < 0.76 ? 1 : 0);
  let h = 0, a = 0;
  for (let i = 0; i < 5; i++) { h += kick(); a += kick(); }
  while (h === a) { h += kick(); a += kick(); }
  return { home: h, away: a };
}

/**
 * The knockout play-off round for the 9th–24th sides: seeded two-legged ties (9 v 24, 10 v 23, …),
 * decided on aggregate then penalties. `playoffIds` must be in league-phase order (9th first). Returns
 * the ties and the 8 winners who join the top 8 in the Round of 16.
 */
export function simulatePlayoffRound(
  playoffIds: string[],
  xiByTeam: Map<string, Player[]>,
  userId: string,
  tacticsByTeam?: Map<string, TacticalShape>,
): { ties: PlayoffTie[]; winners: string[] } {
  const tac = (id: string) => tacticsByTeam?.get(id) ?? NEUTRAL_TACTICS;
  const n = playoffIds.length;
  const ties: PlayoffTie[] = [];
  const winners: string[] = [];
  for (let i = 0; i < n / 2; i++) {
    const hi = playoffIds[i];
    const lo = playoffIds[n - 1 - i];
    const xHi = xiByTeam.get(hi) ?? [];
    const xLo = xiByTeam.get(lo) ?? [];
    // Leg 1 at the lower seed, leg 2 at the higher seed (higher seed hosts the decider).
    const leg1 = simulateMatch(xLo, xHi, PHASE_ERA, false, tac(lo), tac(hi));
    const leg2 = simulateMatch(xHi, xLo, PHASE_ERA, false, tac(hi), tac(lo));
    const aggHome = leg1.awayGoals + leg2.homeGoals;
    const aggAway = leg1.homeGoals + leg2.awayGoals;
    let winnerId: string;
    let penalties: { home: number; away: number } | undefined;
    if (aggHome > aggAway) winnerId = hi;
    else if (aggAway > aggHome) winnerId = lo;
    else { penalties = shootout(); winnerId = penalties.home >= penalties.away ? hi : lo; }
    winners.push(winnerId);
    ties.push({ homeId: hi, awayId: lo, leg1, leg2, aggHome, aggAway, winnerId, penalties, userInvolved: hi === userId || lo === userId });
  }
  return { ties, winners };
}
