import { describe, it, expect } from 'vitest';
import { computeSeasonStats } from './seasonStats';
import type { Match } from '../types';

// Minimal match factory from the user's perspective. `home` = user plays at home.
function m(userId: string, oppId: string, forG: number, againstG: number, home: boolean): Match {
  return {
    id: Math.random().toString(36), competitionId: 'c', round: 'r',
    homeTeamId: home ? userId : oppId, awayTeamId: home ? oppId : userId,
    homeScore: home ? forG : againstG, awayScore: home ? againstG : forG,
    homeXG: 0, awayXG: 0, homeWinProbability: 0, drawProbability: 0, awayWinProbability: 0, simulated: true,
  };
}

describe('computeSeasonStats', () => {
  it('aggregates W/D/L, goals, streaks, clean sheets, and venue splits', () => {
    const u = 'me';
    const matches: Match[] = [
      m(u, 'a', 3, 0, true),   // W (clean sheet), +3
      m(u, 'b', 1, 1, false),  // D
      m(u, 'c', 2, 0, true),   // W (clean sheet)
      m(u, 'd', 0, 2, false),  // L (failed to score)
      m(u, 'e', 4, 1, true),   // W (biggest win +3? margin 3 same as first; first wins on >)
      m(u, 'f', 0, 0, false),  // D (clean sheet, failed to score)
    ];
    const s = computeSeasonStats(matches, u);
    expect(s.played).toBe(6);
    expect(s.won).toBe(3);
    expect(s.drawn).toBe(2);
    expect(s.lost).toBe(1);
    expect(s.goalsFor).toBe(10);
    expect(s.goalsAgainst).toBe(4);
    expect(s.goalDifference).toBe(6);
    expect(s.points).toBe(11); // 3*3 + 2
    expect(s.winRate).toBe(50);
    expect(s.cleanSheets).toBe(3);
    expect(s.failedToScore).toBe(2);
    expect(s.longestWinStreak).toBe(1); // wins never back-to-back
    expect(s.longestUnbeatenRun).toBe(3); // W,D,W then L breaks it
    expect(s.home).toEqual({ won: 3, drawn: 0, lost: 0 });
    expect(s.away).toEqual({ won: 0, drawn: 2, lost: 1 });
    expect(s.biggestWin?.oppId).toBe('a'); // first +3 kept (strict >)
    expect(s.heaviestDefeat?.oppId).toBe('d');
    expect(s.form).toEqual(['W', 'D', 'W', 'L', 'W', 'D']);
    expect(s.cumulativePoints).toEqual([3, 4, 7, 7, 10, 11]);
  });

  it('handles a perfect unbeaten run', () => {
    const u = 'me';
    const matches = Array.from({ length: 5 }, (_, i) => m(u, `o${i}`, 2, 0, i % 2 === 0));
    const s = computeSeasonStats(matches, u);
    expect(s.won).toBe(5);
    expect(s.lost).toBe(0);
    expect(s.longestWinStreak).toBe(5);
    expect(s.longestUnbeatenRun).toBe(5);
    expect(s.points).toBe(15);
    expect(s.heaviestDefeat).toBeNull();
  });
});
