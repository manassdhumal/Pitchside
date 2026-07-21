import { describe, it, expect } from 'vitest';
import { generateSquadPool } from '../data/playerGenerator';
import { generateRoundRobinFixtures, simulateLeagueFixtures, buildStandingsTable } from './competitions';
import type { EraRuleConfig, Player } from '../types';

const ERA: EraRuleConfig = { awayGoalsRule: false, goldenGoal: false, extraTimeMinutes: 0, penaltyShootout: false };
const POINTS = { win: 3, draw: 1, loss: 0 };

describe('simulateLeagueFixtures (with form)', () => {
  it('ranks a full double round-robin roughly by squad strength', () => {
    // Eight teams of clearly stepped strength; the table should broadly follow that order.
    const teamIds = Array.from({ length: 8 }, (_, i) => `t${i}`);
    const strengthOf = (i: number): [number, number] => [56 + i * 4, 66 + i * 4]; // t0 weakest … t7 strongest

    // Average points across a few seasons to damp single-season variance.
    const avgPoints = new Map<string, number>(teamIds.map((id) => [id, 0]));
    const seasons = 4;
    for (let s = 0; s < seasons; s++) {
      const xiByTeam = new Map<string, Player[]>(teamIds.map((id, i) => [id, generateSquadPool({ potentialRange: strengthOf(i) })]));
      const fixtures = generateRoundRobinFixtures(teamIds, true);
      const matches = simulateLeagueFixtures(fixtures, xiByTeam, 'league', ERA);
      const table = buildStandingsTable(matches, teamIds, POINTS);
      for (const row of table) avgPoints.set(row.teamId, avgPoints.get(row.teamId)! + row.points / seasons);
    }

    // The strongest side clearly outpoints the weakest, and the top half outscores the bottom half.
    expect(avgPoints.get('t7')!).toBeGreaterThan(avgPoints.get('t0')! + 15);
    const topHalf = ['t4', 't5', 't6', 't7'].reduce((a, id) => a + avgPoints.get(id)!, 0);
    const bottomHalf = ['t0', 't1', 't2', 't3'].reduce((a, id) => a + avgPoints.get(id)!, 0);
    expect(topHalf).toBeGreaterThan(bottomHalf);
  });

  it('attaches goal events to league matches, consistent with the scoreline', () => {
    const teamIds = ['a', 'b'];
    const xiByTeam = new Map<string, Player[]>(teamIds.map((id) => [id, generateSquadPool({ potentialRange: [68, 82] })]));
    const fixtures = generateRoundRobinFixtures(teamIds, true);
    const matches = simulateLeagueFixtures(fixtures, xiByTeam, 'league', ERA);
    for (const m of matches) {
      const home = (m.goals ?? []).filter((g) => g.teamId === m.homeTeamId).length;
      const away = (m.goals ?? []).filter((g) => g.teamId === m.awayTeamId).length;
      expect(home).toBe(m.homeScore);
      expect(away).toBe(m.awayScore);
    }
  });
});
