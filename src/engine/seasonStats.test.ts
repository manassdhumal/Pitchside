import { describe, it, expect } from 'vitest';
import { computeSeasonStats, deriveSeasonInsights, computeGoldenBoot } from './seasonStats';
import type { Match, Player, Position } from '../types';

// Minimal match factory from the user's perspective. `home` = user plays at home.
function m(userId: string, oppId: string, forG: number, againstG: number, home: boolean, id = Math.random().toString(36)): Match {
  return {
    id, competitionId: 'c', round: 'r',
    homeTeamId: home ? userId : oppId, awayTeamId: home ? oppId : userId,
    homeScore: home ? forG : againstG, awayScore: home ? againstG : forG,
    homeXG: 0, awayXG: 0, homeWinProbability: 0, drawProbability: 0, awayWinProbability: 0, simulated: true,
  };
}

/** A goal event helper. */
const goal = (teamId: string, scorerId: string, scorerName: string, assistId?: string) =>
  ({ minute: 1, teamId, scorerId, scorerName, assistId, assistName: assistId ? `A ${assistId}` : undefined });

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

  it('tallies scorers and assists from the goal events on each match', () => {
    const u = 'me';
    const xi = [pl('gk', 'GK', 20), pl('cb', 'CB', 40), pl('cm', 'CM', 65), pl('st', 'ST', 90)];
    const matches: Match[] = [
      { ...m(u, 'a', 2, 0, true, 'e1'), goals: [goal(u, 'st', 'Striker', 'cm'), goal(u, 'st', 'Striker')] },
      { ...m(u, 'b', 1, 1, false, 'e2'), goals: [goal(u, 'cm', 'Mid', 'st'), goal('b', 'oz', 'Opp')] },
    ];
    const s = computeSeasonStats(matches, u, { xi });
    const st = s.players!.find((p) => p.playerId === 'st')!;
    const cm = s.players!.find((p) => p.playerId === 'cm')!;
    expect(st.goals).toBe(2);
    expect(st.assists).toBe(1);
    expect(st.position).toBe('ST'); // resolved from the XI
    expect(cm.goals).toBe(1);
    expect(cm.assists).toBe(1);
    expect(s.players![0].playerId).toBe('st'); // ranked by goals
    // Opponent goals (team 'b') are not counted for the user.
    expect(s.players!.some((p) => p.playerId === 'oz')).toBe(false);
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

  it('picks a position-fair Player of the Season and builds a league golden boot from events', () => {
    const u = 'me';
    const xi = [pl('gk', 'GK', 20), pl('def', 'CB', 45), pl('st', 'ST', 92)];
    // A defender who chips in 8 should be able to pip a striker on 9 via the position weighting.
    const defGoals = Array.from({ length: 8 }, () => goal(u, 'def', 'Defender'));
    const stGoals = Array.from({ length: 9 }, () => goal(u, 'st', 'Striker'));
    const matches: Match[] = [{ ...m(u, 'opp', 17, 2, true, 'gb'), goals: [...defGoals, ...stGoals, goal('opp', 'oz', 'Rival'), goal('opp', 'oz', 'Rival')] }];
    const s = computeSeasonStats(matches, u, { xi });
    expect(s.playerOfSeason).toBeDefined();
    expect(s.playerOfSeason!.playerId).toBe('def'); // 8×1.5 prestige beats 9×0.9

    const gb = computeGoldenBoot(matches, new Map([[u, xi], ['opp', [pl('oz', 'ST', 80)]]]), new Map([[u, 'My XI'], ['opp', 'Rivals']]), u);
    expect(gb[0]).toMatchObject({ playerId: 'st', goals: 9, isUser: true }); // top scorer overall
    expect(gb.find((e) => e.playerId === 'oz')).toMatchObject({ goals: 2, isUser: false });
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
