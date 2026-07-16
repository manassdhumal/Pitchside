import type { Player, EraRuleConfig } from '../types';
import { simulateMatch, NEUTRAL_TACTICS, type MatchResult, type TacticalShape } from './matchEngine';
import { computeTeamOvr } from './teamRatings';

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
  /** Every tie played, grouped by round (index 0 = first round) — the full bracket. */
  rounds: CupTie[][];
  /** Only the ties the user's team played, in order — their run. */
  userTies: CupTie[];
  /** The eventual winner of the whole competition. */
  champion: string;
  /** The round the user went out in (or 'Winners' if they lifted it). */
  userExit: string;
  /** 1-based seed per entrant (1 = strongest), for display in the bracket. */
  seedById: Record<string, number>;
  /** Teams that received a first-round bye (top seeds when the field isn't a power of two). */
  byeIds: string[];
}

const isPow2 = (x: number): boolean => x > 0 && (x & (x - 1)) === 0;

const roundLabel = (teams: number): string => {
  if (!isPow2(teams)) return 'First round';
  if (teams <= 2) return 'Final';
  if (teams <= 4) return 'Semi-final';
  if (teams <= 8) return 'Quarter-final';
  if (teams <= 16) return 'Round of 16';
  if (teams <= 32) return 'Round of 32';
  return `Round of ${teams}`;
};

/**
 * Standard single-elimination seed order for a power-of-two bracket: returns the seed number (1-based)
 * that belongs in each slot so seed 1 and seed 2 can only meet in the final, 1 vs the lowest seed
 * first, etc. Built by the classic mirror-and-fill recursion.
 */
function seedSlots(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const total = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) next.push(s, total - s);
    seeds = next;
  }
  return seeds;
}

/**
 * Single-elimination knockout seeded by team strength (`computeTeamOvr`): the field is ranked, placed
 * into a standard bracket so strong sides are kept apart, and the surplus above the next power of two
 * is handled by first-round byes for the top seeds. Returns the full bracket (all ties per round), the
 * user's run, and the champion. Reuses the Dixon-Coles simulator with extra-time/penalties.
 */
export function simulateCup(entrants: CupEntrant[], userId: string, tacticsByTeam?: Map<string, TacticalShape>): CupResult {
  // Rank by strength → seeds (1 = strongest). Ties in strength broken by a stable coin flip.
  const seeded = [...entrants].sort((a, b) =>
    computeTeamOvr(b.xi).overall - computeTeamOvr(a.xi).overall || (Math.random() < 0.5 ? -1 : 1));
  const seedById: Record<string, number> = {};
  seeded.forEach((e, i) => { seedById[e.id] = i + 1; });

  const n = seeded.length;
  let size = 1;
  while (size < n) size *= 2;
  // Place each entrant into its seeded slot; slots whose seed exceeds the field are byes (null).
  const order = seedSlots(size);
  let alive: (CupEntrant | null)[] = order.map((seed) => (seed <= n ? seeded[seed - 1] : null));

  const rounds: CupTie[][] = [];
  const userTies: CupTie[] = [];
  const byeIds: string[] = [];
  let userExit = 'First round';
  let userStillIn = seeded.some((e) => e.id === userId);

  while (alive.length > 1) {
    const teamsIn = alive.filter(Boolean).length;
    const round = roundLabel(teamsIn);
    const ties: CupTie[] = [];
    const next: (CupEntrant | null)[] = [];

    for (let i = 0; i < alive.length; i += 2) {
      const a = alive[i];
      const b = alive[i + 1];
      if (a && !b) { next.push(a); if (a.id === userId) byeIds.push(a.id); continue; } // bye
      if (b && !a) { next.push(b); if (b.id === userId) byeIds.push(b.id); continue; }
      if (!a && !b) { next.push(null); continue; }

      const result = simulateMatch(a!.xi, b!.xi, CUP_ERA_RULES, true,
        tacticsByTeam?.get(a!.id) ?? NEUTRAL_TACTICS, tacticsByTeam?.get(b!.id) ?? NEUTRAL_TACTICS);
      let winner: CupEntrant;
      if (result.homeGoals > result.awayGoals) winner = a!;
      else if (result.awayGoals > result.homeGoals) winner = b!;
      else if (result.penalties) winner = result.penalties.home >= result.penalties.away ? a! : b!;
      else winner = Math.random() < 0.5 ? a! : b!;

      const userInvolved = a!.id === userId || b!.id === userId;
      const tie: CupTie = { round, homeId: a!.id, awayId: b!.id, result, winnerId: winner.id, userInvolved };
      ties.push(tie);
      if (userInvolved) {
        userTies.push(tie);
        if (winner.id !== userId) { userStillIn = false; userExit = round; }
      }
      next.push(winner);
    }

    if (ties.length) rounds.push(ties);
    alive = next;
  }

  const champion = alive.find(Boolean)?.id ?? userId;
  if (userStillIn && champion === userId) userExit = 'Winners';
  return { rounds, userTies, champion, userExit, seedById, byeIds };
}
