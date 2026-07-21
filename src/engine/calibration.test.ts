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

  it('produces realistic outcome, clean-sheet and scoreline distributions', () => {
    const trials = 5000;
    let homeWins = 0, awayWins = 0, homeCleanSheets = 0, blowouts = 0, nilNil = 0;
    for (let i = 0; i < trials; i++) {
      const squad = generateSquadPool({ potentialRange: [65, 80] });
      const r = simulateMatch(squad, squad, NEUTRAL_ERA_RULES, false);
      if (r.homeGoals > r.awayGoals) homeWins++;
      else if (r.awayGoals > r.homeGoals) awayWins++;
      if (r.awayGoals === 0) homeCleanSheets++;
      if (r.homeGoals + r.awayGoals >= 6) blowouts++;
      if (r.homeGoals === 0 && r.awayGoals === 0) nilNil++;
    }
    // Home edge: real leagues sit ~45% home wins / ~28% away for balanced sides.
    expect(homeWins / trials).toBeGreaterThan(0.38);
    expect(homeWins / trials).toBeLessThan(0.52);
    expect(awayWins / trials).toBeGreaterThan(0.18);
    expect(awayWins / trials).toBeLessThan(0.32);
    expect(homeWins).toBeGreaterThan(awayWins);
    // Clean sheets happen in roughly a quarter to a third of games.
    expect(homeCleanSheets / trials).toBeGreaterThan(0.2);
    expect(homeCleanSheets / trials).toBeLessThan(0.4);
    // High-scoring games (6+ total) and 0-0s are both uncommon but not vanishing.
    expect(blowouts / trials).toBeLessThan(0.08);
    expect(nilNil / trials).toBeGreaterThan(0.03);
    expect(nilNil / trials).toBeLessThan(0.13);
  });
});
