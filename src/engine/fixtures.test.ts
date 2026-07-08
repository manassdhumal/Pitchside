import { describe, it, expect } from 'vitest';
import { generateRoundRobinFixtures } from './fixtures';

describe('generateRoundRobinFixtures', () => {
  it('gives every team exactly one home and one away fixture against every other team (double round-robin)', () => {
    const teams = ['A', 'B', 'C', 'D', 'E', 'F'];
    const fixtures = generateRoundRobinFixtures(teams, true);

    expect(fixtures.length).toBe(teams.length * (teams.length - 1));

    const pairCounts = new Map<string, number>();
    for (const f of fixtures) {
      const key = [f.homeTeamId, f.awayTeamId].sort().join('-');
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }
    for (const count of pairCounts.values()) {
      expect(count).toBe(2);
    }

    for (const team of teams) {
      const played = fixtures.filter((f) => f.homeTeamId === team || f.awayTeamId === team);
      expect(played.length).toBe((teams.length - 1) * 2);
    }
  });

  it('handles an odd number of teams by dropping bye fixtures', () => {
    const teams = ['A', 'B', 'C', 'D', 'E'];
    const fixtures = generateRoundRobinFixtures(teams, false);

    expect(fixtures.length).toBe((teams.length * (teams.length - 1)) / 2);
    for (const team of teams) {
      const played = fixtures.filter((f) => f.homeTeamId === team || f.awayTeamId === team);
      expect(played.length).toBe(teams.length - 1);
    }
  });
});
