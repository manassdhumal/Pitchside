import { describe, it, expect } from 'vitest';
import { computeCareerSummary } from './careerSummary';
import type { SeasonSummary } from '../storage/cache';

function season(id: string, position: number, points: number, stats?: Partial<{ won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; players: { name: string; goals: number; assists: number }[] }>): SeasonSummary {
  return {
    id, teamId: 't', competition: 'League', position, played: 38, points,
    summary: stats ? { stats: { won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, players: [], ...stats } } as unknown as Record<string, unknown> : null,
    createdAt: 0,
  };
}

describe('computeCareerSummary', () => {
  it('aggregates titles, best finish, points, record and all-time scorers', () => {
    const seasons: SeasonSummary[] = [
      season('s1', 1, 90, { won: 28, drawn: 6, lost: 4, goalsFor: 80, goalsAgainst: 30, players: [{ name: 'Haaland', goals: 30, assists: 5 }, { name: 'Foden', goals: 10, assists: 12 }] }),
      season('s2', 3, 78, { won: 23, drawn: 9, lost: 6, goalsFor: 70, goalsAgainst: 40, players: [{ name: 'Haaland', goals: 25, assists: 3 }] }),
      season('s3', 1, 88, { won: 27, drawn: 7, lost: 4, goalsFor: 75, goalsAgainst: 32, players: [{ name: 'Foden', goals: 18, assists: 8 }] }),
    ];
    const c = computeCareerSummary(seasons);
    expect(c.seasonsPlayed).toBe(3);
    expect(c.titles).toBe(2);
    expect(c.bestFinish).toBe(1);
    expect(c.totalPoints).toBe(256);
    expect(c.wins).toBe(78);
    expect(c.goalsFor).toBe(225);
    // Haaland aggregates 30+25=55 across seasons and leads.
    expect(c.topScorers[0]).toEqual({ name: 'Haaland', goals: 55, assists: 8 });
    expect(c.topScorers[1].name).toBe('Foden'); // 10+18=28
  });

  it('handles seasons with no stored stats', () => {
    const c = computeCareerSummary([season('s1', 5, 60)]);
    expect(c.seasonsPlayed).toBe(1);
    expect(c.bestFinish).toBe(5);
    expect(c.totalPoints).toBe(60);
    expect(c.topScorers).toEqual([]);
  });
});
