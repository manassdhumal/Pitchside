import { describe, it, expect } from 'vitest';
import { generateSquadPool } from '../data/playerGenerator';
import { simulateMatch } from './matchEngine';
import type { EraRuleConfig } from '../types';

const NEUTRAL_ERA_RULES: EraRuleConfig = {
  awayGoalsRule: false,
  goldenGoal: false,
  extraTimeMinutes: 0,
  penaltyShootout: false,
};

describe('match engine calibration', () => {
  it('produces a realistic draw rate and goals-per-game average for evenly matched teams', () => {
    const trials = 4000;
    let draws = 0;
    let totalGoals = 0;

    for (let i = 0; i < trials; i++) {
      // Same underlying squad quality on both sides so any bias is purely from home advantage,
      // not random mismatched squads.
      const squad = generateSquadPool({ potentialRange: [65, 80] });
      const result = simulateMatch(squad, squad, NEUTRAL_ERA_RULES, false);
      if (result.homeGoals === result.awayGoals) draws++;
      totalGoals += result.homeGoals + result.awayGoals;
    }

    const drawRate = draws / trials;
    const avgGoals = totalGoals / trials;

    // Target ~25-27% draws, ~2.6-2.8 total goals/game per the Dixon-Coles calibration spec,
    // with tolerance for sampling noise across a 4000-match run.
    expect(drawRate).toBeGreaterThan(0.22);
    expect(drawRate).toBeLessThan(0.33);
    expect(avgGoals).toBeGreaterThan(2.4);
    expect(avgGoals).toBeLessThan(3.0);
  });

  it('gives the home team a higher win probability than the away team when squads are equal', () => {
    const squad = generateSquadPool({ potentialRange: [70, 80] });
    const result = simulateMatch(squad, squad, NEUTRAL_ERA_RULES, false);
    expect(result.homeWinProbability).toBeGreaterThan(result.awayWinProbability);
  });
});
