import type { Player, EraRuleConfig } from '../types';
import { simulateMatch, type MatchResult } from './matchEngine';

/** Knockout ties use decisive results: extra time then penalties when a match is level. */
export const CUP_ERA_RULES: EraRuleConfig = {
  awayGoalsRule: false,
  goldenGoal: false,
  extraTimeMinutes: 30,
  penaltyShootout: true,
};

export interface CupEntrant {
  id: string;
  xi: Player[];
}

export interface CupTie {
  round: string;
  homeId: string;
  awayId: string;
  result: MatchResult;
  winnerId: string;
  /** True when the user's team played in this tie. */
  userInvolved: boolean;
}

export interface CupResult {
  /** Only the ties the user's team played, in order — their run. */
  userTies: CupTie[];
  /** The eventual winner of the whole competition. */
  champion: string;
  /** The round the user went out in (or 'Winners' if they lifted it). */
  userExit: string;
}

const roundLabel = (remaining: number): string => {
  if (remaining <= 2) return 'Final';
  if (remaining <= 4) return 'Semi-final';
  if (remaining <= 8) return 'Quarter-final';
  if (remaining <= 16) return 'Round of 16';
  if (remaining <= 32) return 'Round of 32';
  return `Round of ${remaining}`;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Single-elimination knockout among the given entrants (random draw each round). Returns the user's
 * run (their ties in order), the eventual champion, and the round the user exited. An odd team out
 * in a round takes a bye. Reuses the Dixon-Coles match simulator with extra-time/penalties.
 */
export function simulateCup(entrants: CupEntrant[], userId: string): CupResult {
  let alive = shuffle(entrants);
  const userTies: CupTie[] = [];
  let userExit = 'Round 1';
  let userStillIn = alive.some((e) => e.id === userId);

  while (alive.length > 1) {
    const round = roundLabel(alive.length);
    const next: CupEntrant[] = [];
    const pool = [...alive];
    if (pool.length % 2 === 1) next.push(pool.shift()!); // a bye for one team

    for (let i = 0; i < pool.length; i += 2) {
      const a = pool[i];
      const b = pool[i + 1];
      const result = simulateMatch(a.xi, b.xi, CUP_ERA_RULES, true);
      let winner: CupEntrant;
      if (result.homeGoals > result.awayGoals) winner = a;
      else if (result.awayGoals > result.homeGoals) winner = b;
      else if (result.penalties) winner = result.penalties.home >= result.penalties.away ? a : b;
      else winner = Math.random() < 0.5 ? a : b;

      const userInvolved = a.id === userId || b.id === userId;
      if (userInvolved) {
        userTies.push({ round, homeId: a.id, awayId: b.id, result, winnerId: winner.id, userInvolved: true });
        if (winner.id !== userId) { userStillIn = false; userExit = round; }
      }
      next.push(winner);
    }
    alive = shuffle(next);
  }

  if (userStillIn && alive[0]?.id === userId) userExit = 'Winners';
  return { userTies, champion: alive[0]?.id ?? userId, userExit };
}
