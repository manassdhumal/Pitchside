import { describe, it, expect } from 'vitest';
import { computeSeasonStats, deriveSeasonInsights, computeGoldenBoot } from './seasonStats';
import type { Match, Player, Position } from '../types';

// Minimal match factory from the user's perspective. `home` = user plays at home. A fixed id keeps
// the deterministic scorer attribution stable across runs.
function m(userId: string, oppId: string, forG: number, againstG: number, home: boolean, id = Math.random().toString(36)): Match {
  return {
    id, competitionId: 'c', round: 'r',
    homeTeamId: home ? userId : oppId, awayTeamId: home ? oppId : userId,
    homeScore: home ? forG : againstG, awayScore: home ? againstG : forG,
    homeXG: 0, awayXG: 0, homeWinProbability: 0, drawProbability: 0, awayWinProbability: 0, simulated: true,
  };
}

function pl(id: string, position: Position, shooting: number, passing = 70): Player {
  return {
    id, firstName: 'P', lastName: id, nationality: 'X', retired: false, position, era: 'modern',
    ratings: { overall: 75, pace: 70, shooting, passing, dribbling: 70, defending: 60, physical: 70 },
    ratingsHistory: [], isLegend: false, isProcedural: false,
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

  it('attributes every goal to a scorer (goals sum to goals-for) and is deterministic', () => {
    const u = 'me';
    const xi = [pl('gk', 'GK', 20), pl('cb', 'CB', 40), pl('cm', 'CM', 65), pl('st', 'ST', 90)];
    const matches = [m(u, 'a', 3, 0, true, 'fixed-1'), m(u, 'b', 2, 1, false, 'fixed-2')];
    const s1 = computeSeasonStats(matches, u, { xi });
    const totalGoals = (s1.players ?? []).reduce((t, p) => t + p.goals, 0);
    expect(totalGoals).toBe(5); // 3 + 2 goals for
    expect((s1.players ?? [])[0].goals).toBeGreaterThan(0); // a top scorer exists
    // Assists never exceed goals; scorers are a subset of the XI.
    const totalAssists = (s1.players ?? []).reduce((t, p) => t + p.assists, 0);
    expect(totalAssists).toBeLessThanOrEqual(totalGoals);
    // Deterministic: same matches + XI → identical attribution.
    const s2 = computeSeasonStats(matches, u, { xi });
    expect(s2.players).toEqual(s1.players);
  });

  it('derives a verdict + insights from league context', () => {
    const u = 'me';
    const matches = Array.from({ length: 6 }, (_, i) => m(u, `o${i}`, 3, 0, i % 2 === 0));
    const s = computeSeasonStats(matches, u, {
      context: { position: 1, teamCount: 20, goalsForRank: 1, goalsAgainstRank: 1, competition: 'Test League' },
    });
    // Unbeaten season → the Invincibles verdict wins over plain "Champions".
    expect(s.verdict?.title).toBe('The Invincibles');
    expect(s.insights?.some((i) => i.title.includes('attack'))).toBe(true);
    expect(s.insights?.some((i) => i.title.includes('defence'))).toBe(true);
  });

  it('crowns a position-fair Player of the Season and a consistent golden boot', () => {
    const u = 'me';
    const xi = [pl('gk', 'GK', 20), pl('cb', 'CB', 45), pl('cm', 'CM', 65), pl('st', 'ST', 92)];
    const matches = [m(u, 'a', 4, 0, true, 'gb-1'), m(u, 'b', 3, 1, false, 'gb-2'), m(u, 'c', 2, 0, true, 'gb-3')];
    const s = computeSeasonStats(matches, u, { xi });
    expect(s.playerOfSeason).toBeDefined();
    expect((s.players ?? []).some((p) => p.playerId === s.playerOfSeason!.playerId)).toBe(true);

    // Golden boot must attribute the user's own goals identically to their stats.players — same
    // matches, XI and seed. (Opponents with no XI in the map are skipped.)
    const gb = computeGoldenBoot(matches, new Map([[u, xi]]), new Map([[u, 'My XI']]), u);
    expect(gb.length).toBeGreaterThan(0);
    expect(gb.every((r) => r.isUser)).toBe(true);
    const userTop = (s.players ?? [])[0];
    const gbUser = gb.find((r) => r.playerId === userTop.playerId);
    expect(gbUser?.goals).toBe(userTop.goals);
  });

  it('gives a relegation-tone verdict for a last-place finish', () => {
    const s = computeSeasonStats([], 'me', {});
    const { verdict } = deriveSeasonInsights(s, { position: 20, teamCount: 20, goalsForRank: 20, goalsAgainstRank: 20 });
    expect(verdict.tone).toBe('bad');
    expect(verdict.title).toBe('The wooden spoon');
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
