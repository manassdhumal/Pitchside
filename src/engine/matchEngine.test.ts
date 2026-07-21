import { describe, it, expect } from 'vitest';
import { generateSquadPool } from '../data/playerGenerator';
import { simulateMatch } from './matchEngine';
import type { EraRuleConfig } from '../types';

const ERA: EraRuleConfig = { awayGoalsRule: false, goldenGoal: false, extraTimeMinutes: 0, penaltyShootout: false };

describe('event-based simulateMatch', () => {
  it('emits goal events that exactly match the scoreline, from players on the pitch', () => {
    const home = generateSquadPool({ potentialRange: [70, 85] });
    const away = generateSquadPool({ potentialRange: [60, 78] });
    const homeIds = new Set(home.map((p) => p.id));
    const awayIds = new Set(away.map((p) => p.id));

    for (let i = 0; i < 500; i++) {
      const r = simulateMatch(home, away, ERA, false);
      const hg = r.goals.filter((g) => g.side === 'home');
      const ag = r.goals.filter((g) => g.side === 'away');
      expect(hg.length).toBe(r.homeGoals);
      expect(ag.length).toBe(r.awayGoals);
      // Scorers/assisters are real players from the correct side, and never the same person.
      for (const g of r.goals) {
        const ids = g.side === 'home' ? homeIds : awayIds;
        expect(ids.has(g.scorerId)).toBe(true);
        if (g.assistId) {
          expect(ids.has(g.assistId)).toBe(true);
          expect(g.assistId).not.toBe(g.scorerId);
        }
        expect(g.minute).toBeGreaterThan(0);
      }
    }
  });

  it('gives a much stronger side the majority of wins and goals over many games', () => {
    const strong = generateSquadPool({ potentialRange: [86, 92] });
    const weak = generateSquadPool({ potentialRange: [58, 66] });
    let strongWins = 0, strongGoals = 0, weakGoals = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const r = simulateMatch(strong, weak, ERA, false);
      if (r.homeGoals > r.awayGoals) strongWins++;
      strongGoals += r.homeGoals;
      weakGoals += r.awayGoals;
    }
    expect(strongWins / n).toBeGreaterThan(0.7); // dominant side wins most
    expect(strongGoals).toBeGreaterThan(weakGoals * 1.8);
  });
});
