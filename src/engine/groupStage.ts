import type { Player, StandingsRow, EraRuleConfig } from '../types';
import { generateRoundRobinFixtures, simulateLeagueFixtures, buildStandingsTable } from './competitions';
import type { TacticalShape } from './matchEngine';

const POINTS = { win: 3, draw: 1, loss: 0 };
const GROUP_ERA: EraRuleConfig = { awayGoalsRule: false, goldenGoal: false, extraTimeMinutes: 0, penaltyShootout: false };

export interface GroupResult {
  /** Group letter — 'A', 'B', … */
  id: string;
  /** Team ids in draw order. */
  teamIds: string[];
  /** Final standings, best first. */
  table: StandingsRow[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Seeds the field into strength pots (pot 1 = strongest `numGroups`, pot 2 = next, …) then draws one
 * team from each pot into each group — the standard Champions League draw, so every group has a top
 * seed, a second seed, and so on, and giants are kept apart in the group stage.
 */
export function drawGroups(teamIds: string[], strengthById: Map<string, number>, numGroups: number): string[][] {
  const ranked = [...teamIds].sort((a, b) => (strengthById.get(b) ?? 0) - (strengthById.get(a) ?? 0));
  const groups: string[][] = Array.from({ length: numGroups }, () => []);
  for (let i = 0; i < ranked.length; i += numGroups) {
    shuffle(ranked.slice(i, i + numGroups)).forEach((t, g) => groups[g].push(t));
  }
  return groups;
}

/** Plays each group as a double round-robin and returns the final tables. */
export function simulateGroupStage(
  groups: string[][],
  xiByTeam: Map<string, Player[]>,
  tacticsByTeam?: Map<string, TacticalShape>,
): GroupResult[] {
  return groups.map((teamIds, i) => {
    const fixtures = generateRoundRobinFixtures(teamIds, true);
    const matches = simulateLeagueFixtures(fixtures, xiByTeam, `ucl-group-${i}`, GROUP_ERA, tacticsByTeam);
    return { id: String.fromCharCode(65 + i), teamIds, table: buildStandingsTable(matches, teamIds, POINTS) };
  });
}

/** The knockout qualifiers: the top `perGroup` from every group — all winners first, then runners-up. */
export function groupQualifiers(groups: GroupResult[], perGroup = 2): string[] {
  const byRank: string[][] = Array.from({ length: perGroup }, () => []);
  for (const g of groups) {
    for (let r = 0; r < perGroup; r++) if (g.table[r]) byRank[r].push(g.table[r].teamId);
  }
  return byRank.flat();
}
