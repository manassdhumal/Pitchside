import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { KnockoutTieCard } from './KnockoutReveal';
import type { CupTie } from '../engine/cup';
import type { MatchResult, SimGoal } from '../engine/matchEngine';

afterEach(cleanup);

function result(hg: number, ag: number, goals: SimGoal[], extra?: Partial<MatchResult>): MatchResult {
  return {
    homeGoals: hg, awayGoals: ag, xgHome: hg, xgAway: ag,
    homeWinProbability: 0.5, drawProbability: 0.25, awayWinProbability: 0.25,
    wentToExtraTime: false, goals, ...extra,
  };
}

const names = new Map([['me', 'My XI'], ['opp', 'Rivals']]);

describe('KnockoutTieCard', () => {
  it('shows a green THROUGH result with the goal timeline when the user advances', () => {
    const tie: CupTie = {
      round: 'Quarter-final', homeId: 'me', awayId: 'opp', winnerId: 'me', userInvolved: true,
      result: result(2, 1, [
        { minute: 12, side: 'home', scorerId: 's1', scorerName: 'Striker' },
        { minute: 55, side: 'away', scorerId: 'o1', scorerName: 'Rival' },
        { minute: 78, side: 'home', scorerId: 's1', scorerName: 'Striker' },
      ]),
    };
    const { container } = render(<KnockoutTieCard tie={tie} userId="me" userName="My XI" teamNames={names} roundIndex={3} totalRounds={4} leagueInk="#1D2B45" />);
    const text = container.textContent ?? '';
    expect(text).toContain('Quarter-final');
    expect(text).toContain('2–1');
    expect(text).toContain('THROUGH');
    expect(text).not.toContain('KNOCKED OUT');
    // The three goals appear on the timeline, split by side.
    expect(container.querySelectorAll('[data-goal]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-goal="user"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-goal="opp"]')).toHaveLength(1);
  });

  it('shows KNOCKED OUT and the penalty score when the user loses on pens', () => {
    const tie: CupTie = {
      round: 'Final', homeId: 'opp', awayId: 'me', winnerId: 'opp', userInvolved: true,
      result: result(1, 1, [
        { minute: 30, side: 'home', scorerId: 'o1', scorerName: 'Rival' },
        { minute: 88, side: 'away', scorerId: 's1', scorerName: 'Striker' },
      ], { wentToExtraTime: true, penalties: { home: 5, away: 4 } }),
    };
    const { container } = render(<KnockoutTieCard tie={tie} userId="me" userName="My XI" teamNames={names} roundIndex={4} totalRounds={4} leagueInk="#1D2B45" />);
    const text = container.textContent ?? '';
    expect(text).toContain('KNOCKED OUT');
    expect(text).toContain('ON PENALTIES');
    expect(text).toContain('AET');
    expect(text).toContain('pens 4–5'); // user (away) 4, opp (home) 5
  });
});
