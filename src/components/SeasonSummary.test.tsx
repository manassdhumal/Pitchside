import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SeasonSummary, tiesToMatches } from './SeasonSummary';
import type { Campaign } from '../state/AppContext';
import type { Match, Player, StandingsRow } from '../types';

afterEach(cleanup);

const goal = (teamId: string, name: string, minute = 10) => ({ minute, teamId, scorerId: name, scorerName: name });
function match(id: string, home: string, away: string, hs: number, as: number, goals: ReturnType<typeof goal>[]): Match {
  return { id, competitionId: 'c', round: 'r', homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as, homeXG: hs, awayXG: as, homeWinProbability: 0.4, drawProbability: 0.3, awayWinProbability: 0.3, simulated: true, goals };
}
const std = (teamId: string, won: number, drawn: number, lost: number, gf: number, ga: number, points: number): StandingsRow => ({ teamId, played: won + drawn + lost, won, drawn, lost, goalsFor: gf, goalsAgainst: ga, points });
const pl = (id: string): Player => ({ id, firstName: 'P', lastName: id, nationality: 'X', retired: false, position: 'ST', era: 'modern', ratings: { overall: 80, pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 60, physical: 75 }, ratingsHistory: [], isLegend: false, isProcedural: false });

const campaign: Campaign = {
  teamId: 'me', teamName: 'My XI', leagueId: 'premier-league', leagueName: 'Premier League', leaguePosition: 1,
  table: [std('me', 2, 0, 0, 5, 1, 6), std('opp', 0, 0, 2, 1, 5, 0)],
  teamNames: [['me', 'My XI'], ['opp', 'Rivals']],
  ovrs: [['me', 84], ['opp', 78]],
  xi: [pl('striker')],
  league: [match('l1', 'me', 'opp', 3, 0, [goal('me', 'striker'), goal('me', 'striker'), goal('me', 'striker')]), match('l2', 'opp', 'me', 1, 2, [goal('me', 'striker'), goal('me', 'striker'), goal('opp', 'rival')])],
  cup: { matches: [match('c1', 'me', 'opp', 2, 1, [goal('me', 'striker'), goal('me', 'striker'), goal('opp', 'rival')])], exit: 'Winners', champion: 'me' },
};

describe('SeasonSummary', () => {
  it('shows competition results, a stats matrix with a column per competition, and the league table', () => {
    const { container } = render(<SeasonSummary campaign={campaign} />);
    const text = container.textContent ?? '';
    // competitions played
    expect(text).toContain('Premier League');
    expect(text).toContain('🏆 Winners');
    // matrix columns: Overall + League + Cup, all present without any toggle
    expect(text).toContain('Overall');
    expect(text).toContain('League');
    expect(text).toContain('Cup');
    // combined scorers across league + cup (striker scored 4 league + 2 cup = 6)
    expect(text).toContain('striker');
    // final table + a verdict (champions / unbeaten)
    expect(text).toContain('final table');
    expect(text.toLowerCase()).toMatch(/invincible|champion/);
  });
});

describe('tiesToMatches', () => {
  it('turns cup ties into matches with team-tagged goal events', () => {
    const ms = tiesToMatches([
      { round: 'Final', homeId: 'me', awayId: 'opp', result: { homeGoals: 1, awayGoals: 0, xgHome: 1, xgAway: 0, homeWinProbability: 0.5, drawProbability: 0.3, awayWinProbability: 0.2, goals: [{ minute: 5, side: 'home', scorerId: 's', scorerName: 'S' }] } },
    ], 'cl');
    expect(ms).toHaveLength(1);
    expect(ms[0].homeScore).toBe(1);
    expect(ms[0].goals?.[0].teamId).toBe('me');
    expect(ms[0].competitionId).toBe('cl');
  });
});
