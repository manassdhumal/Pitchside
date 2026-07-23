import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { LiveMatchSim, tieToLive } from './LiveMatchSim';
import type { CupTie } from '../engine/cup';
import type { MatchResult, SimGoal } from '../engine/matchEngine';

afterEach(cleanup);

function result(hg: number, ag: number, goals: SimGoal[], extra?: Partial<MatchResult>): MatchResult {
  return { homeGoals: hg, awayGoals: ag, xgHome: hg, xgAway: ag, homeWinProbability: 0.5, drawProbability: 0.25, awayWinProbability: 0.25, wentToExtraTime: false, goals, ...extra };
}

describe('LiveMatchSim', () => {
  it('starts at 0-0 kick-off with both teams and the round label', () => {
    const { container } = render(
      <LiveMatchSim roundLabel="Final" userName="My XI" oppName="Rivals" goals={[{ minute: 20, side: 'user', scorerName: 'Striker' }]} finalUser={1} finalOpp={0} won leagueInk="#1D2B45" onDone={() => {}} />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Final');
    expect(text).toContain('My XI');
    expect(text).toContain('Rivals');
    expect(text).toContain('0–0'); // score reveals as the clock runs, not immediately
    expect(text).toContain('KICK OFF');
  });
});

describe('tieToLive', () => {
  it('maps a tie to the user perspective (away side), flipping score/goals/pens', () => {
    const tie: CupTie = {
      round: 'Semi-final', homeId: 'opp', awayId: 'me', winnerId: 'me', userInvolved: true,
      result: result(1, 2, [
        { minute: 10, side: 'home', scorerId: 'o1', scorerName: 'Rival' },
        { minute: 40, side: 'away', scorerId: 's1', scorerName: 'Mine' },
        { minute: 85, side: 'away', scorerId: 's1', scorerName: 'Mine' },
      ], { penalties: { home: 3, away: 4 } }),
    };
    const live = tieToLive(tie, 'me', 'Rivals', 'My XI', 84, 80, '#000');
    expect(live.finalUser).toBe(2); // user is away
    expect(live.finalOpp).toBe(1);
    expect(live.won).toBe(true);
    expect(live.pens).toEqual({ user: 4, opp: 3 });
    // Goals mapped to user/opp sides, sorted by minute.
    expect(live.goals.map((g) => g.side)).toEqual(['opp', 'user', 'user']);
    expect(live.goals[0].minute).toBe(10);
  });
});
