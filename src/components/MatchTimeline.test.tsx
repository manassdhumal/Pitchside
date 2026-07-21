import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MatchTimeline } from './MatchTimeline';
import type { GoalEvent } from '../types';

afterEach(cleanup);

const g = (minute: number, teamId: string, scorerName: string, assistName?: string): GoalEvent =>
  ({ minute, teamId, scorerId: scorerName, scorerName, assistName });

describe('MatchTimeline', () => {
  it('renders a marker per goal, split above/below by side, at the right position', () => {
    const goals = [g(23, 'me', 'Haaland', 'De Bruyne'), g(67, 'me', 'Foden'), g(80, 'opp', 'Rival')];
    const { container } = render(<MatchTimeline goals={goals} userTeamId="me" />);

    const markers = container.querySelectorAll('[data-goal]');
    expect(markers).toHaveLength(3);
    // Two user goals (above the line), one opponent (below).
    expect(container.querySelectorAll('[data-goal="user"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-goal="opp"]')).toHaveLength(1);

    // The 23' goal sits near a quarter of the way across; the 80' one near the end.
    const first = markers[0] as HTMLElement;
    expect(first.style.left).toBe(`${(23 / 95) * 100}%`);
    // Scorer + assist surface in the tooltip.
    expect(first.getAttribute('title')).toBe("23' Haaland (De Bruyne)");
    expect(container.textContent).toContain("23'");
    expect(container.textContent).toContain("67'");
  });

  it('handles a goalless match (no markers, still shows the clock ticks)', () => {
    const { container } = render(<MatchTimeline goals={[]} userTeamId="me" />);
    expect(container.querySelectorAll('[data-goal]')).toHaveLength(0);
    expect(container.textContent).toContain('HT');
    expect(container.textContent).toContain('FT');
  });
});
