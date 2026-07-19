import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SeasonStatsPanel } from './SeasonStats';
import type { SeasonStats } from '../engine/seasonStats';

afterEach(cleanup);

// A single cumulative-points entry keeps the Recharts block out of the render (it needs >1 point),
// so this stays a pure DOM assertion with no layout dependency.
const stats: SeasonStats = {
  played: 38, won: 28, drawn: 7, lost: 3, goalsFor: 89, goalsAgainst: 26, goalDifference: 63,
  points: 91, winRate: 74, cleanSheets: 18, failedToScore: 2, longestWinStreak: 9, longestUnbeatenRun: 21,
  home: { won: 16, drawn: 3, lost: 0 }, away: { won: 12, drawn: 4, lost: 3 },
  goalsForPerGame: 2.34, goalsAgainstPerGame: 0.68, biggestWin: null, heaviestDefeat: null,
  form: ['W'], cumulativePoints: [3], xgFor: 76.4, xgAgainst: 33.1,
  players: [{ playerId: 'p1', name: 'Erling Haaland', position: 'ST', goals: 31, assists: 5 }],
  playerOfSeason: { playerId: 'p1', name: 'Erling Haaland', position: 'ST', goals: 31, assists: 5 },
  goldenBoot: [{ playerId: 'p1', name: 'Erling Haaland', position: 'ST', teamId: 't', teamName: 'Your XI', goals: 31, assists: 5, isUser: true }],
  verdict: { tone: 'good', title: 'Champions', blurb: 'Top of the pile.' },
  insights: [{ tone: 'good', title: 'Sharpest attack in the division', detail: '89 goals.' }],
};

describe('SeasonStatsPanel', () => {
  it('renders the verdict, headline numbers, player-of-the-season, scorers and insights', () => {
    const { container } = render(<SeasonStatsPanel stats={stats} teamNames={new Map([['t', 'Your XI']])} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Champions');
    expect(text).toContain('28-7-3'); // record
    expect(text).toContain('Player of the season');
    expect(text).toContain('Erling Haaland');
    expect(text).toContain('The Golden Boot race');
    expect(text).toContain('Sharpest attack in the division');
  });

  it('gracefully omits player/insight sections when the data is absent (legacy seasons)', () => {
    const bare: SeasonStats = { ...stats, players: undefined, playerOfSeason: undefined, goldenBoot: undefined, verdict: undefined, insights: undefined, xgFor: undefined };
    const { container } = render(<SeasonStatsPanel stats={bare} teamNames={new Map()} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Season in numbers');
    expect(text).not.toContain('Player of the season');
    expect(text).not.toContain('The Golden Boot race');
  });
});
