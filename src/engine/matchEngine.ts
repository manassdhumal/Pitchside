import type { Player, EraRuleConfig } from '../types';
import { computeTeamOvr } from './teamRatings';

export const DIXON_COLES_RHO = -0.13;
export const LEAGUE_AVG_GOALS = 1.2;
export const HOME_ADVANTAGE = 1.35;
const MAX_GOALS = 10;

// Sensitivity of the OVR tilt: rating-point edge → goal-expectation multiplier. Bounded so
// evenly-matched sides (edge ≈ 0) stay calibration-neutral — the calibration test pits identical
// squads, so this value never affects it — while a clear quality gap separates the scoreline on top
// of the raw attack/defence ratio. Tuned so a full simulated season spreads realistically: strong
// sides ~1.9-2.1 ppg, relegation-level ~0.75-0.9 ppg (0.011 left the table too flat — champions on
// ~1.75 ppg, bottom on ~1.05). The champion ceiling is set by how clustered the top of the league is,
// which is a ratings/selection matter, not this constant.
const OVR_TILT_PER_POINT = 0.024;
const OVR_TILT_MIN = 0.6;
const OVR_TILT_MAX = 1.6;

// De-clustering the top of the table: opponent selection fields each club at its scraped peak, which
// bunches the elite sides within a couple of rating points (e.g. five 83-85 clubs), so no champion
// could pull away — the title race stayed a coin-flip and champions capped near ~1.9 ppg. This convex
// transform stretches the SPACING among elite lines only (values above the threshold), leaving mid and
// lower sides untouched, so a genuinely-best side gains a real edge over near-peers. Below the
// threshold it's the identity, so it never disturbs the evenly-matched calibration (edge still ≈ 0).
const TOP_SHARPEN_THRESHOLD = 78;
const TOP_SHARPEN_GAIN = 1.0;
function sharpenElite(v: number): number {
  return v > TOP_SHARPEN_THRESHOLD ? TOP_SHARPEN_THRESHOLD + (v - TOP_SHARPEN_THRESHOLD) * (1 + TOP_SHARPEN_GAIN) : v;
}

const ATTACK_WEIGHT: Partial<Record<Player['position'], number>> = {
  GK: 0.1, CB: 0.3, LB: 0.6, RB: 0.6, LWB: 0.7, RWB: 0.7, CDM: 0.6, CM: 1, CAM: 1.4,
  LM: 1.2, RM: 1.2, LW: 1.5, RW: 1.5, ST: 1.8,
};

const DEFENCE_WEIGHT: Partial<Record<Player['position'], number>> = {
  GK: 2, CB: 1.8, LB: 1.3, RB: 1.3, LWB: 1.1, RWB: 1.1, CDM: 1.4, CM: 0.9, CAM: 0.5,
  LM: 0.6, RM: 0.6, LW: 0.4, RW: 0.4, ST: 0.2,
};

// Creativity/chance-creation weight — heaviest for the players who make chances (a number 10, wide
// creators, deep playmakers) so a side full of creators generates more even if the finishers are
// modest. This is the model's stand-in for assists, which the source data doesn't provide.
const CREATIVITY_WEIGHT: Partial<Record<Player['position'], number>> = {
  GK: 0, CB: 0.2, LB: 0.6, RB: 0.6, LWB: 0.8, RWB: 0.8, CDM: 0.7, CM: 1.2, CAM: 1.7,
  LM: 1.3, RM: 1.3, LW: 1.4, RW: 1.4, ST: 0.8,
};
// A team of average creators sits near this; the multiplier is centred here so it's
// calibration-neutral for typical sides and only rewards a genuinely creative XI.
const REF_CREATIVITY = 68;
const CREATIVITY_PER_POINT = 0.006;
const CREATIVITY_MIN = 0.82;
const CREATIVITY_MAX = 1.25;

/** Creativity rating of an XI: passing-led, dribbling-supported, weighted toward creative roles. */
export function weightedCreativityRating(startingXI: Player[]): number {
  return weightedAverage(startingXI, CREATIVITY_WEIGHT, (p) => 0.62 * p.ratings.passing + 0.38 * p.ratings.dribbling);
}

function weightedAverage(players: Player[], weights: Partial<Record<Player['position'], number>>, pick: (p: Player) => number): number {
  let totalWeight = 0;
  let sum = 0;
  for (const player of players) {
    const weight = weights[player.position] ?? 1;
    sum += pick(player) * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? sum / totalWeight : 50;
}

export function weightedAttackRating(startingXI: Player[]): number {
  return weightedAverage(startingXI, ATTACK_WEIGHT, (p) => (p.ratings.shooting + p.ratings.dribbling + p.ratings.passing) / 3);
}

export function weightedDefenceRating(startingXI: Player[]): number {
  return weightedAverage(startingXI, DEFENCE_WEIGHT, (p) => p.ratings.goalkeeping ?? p.ratings.defending);
}

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function poissonPmf(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

export function dixonColesTau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

/** Joint scoreline probability matrix, rows = home goals, cols = away goals, normalized to sum to 1. */
export function scorelineDistribution(lambdaHome: number, lambdaAway: number, rho = DIXON_COLES_RHO): number[][] {
  const matrix: number[][] = [];
  let total = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    const row: number[] = [];
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = poissonPmf(x, lambdaHome) * poissonPmf(y, lambdaAway) * dixonColesTau(x, y, lambdaHome, lambdaAway, rho);
      row.push(Math.max(p, 0));
      total += Math.max(p, 0);
    }
    matrix.push(row);
  }
  if (total > 0) {
    for (let x = 0; x <= MAX_GOALS; x++) {
      for (let y = 0; y <= MAX_GOALS; y++) {
        matrix[x][y] /= total;
      }
    }
  }
  return matrix;
}

export function sampleDixonColesScoreline(lambdaHome: number, lambdaAway: number, rho = DIXON_COLES_RHO): { homeGoals: number; awayGoals: number } {
  const matrix = scorelineDistribution(lambdaHome, lambdaAway, rho);
  let roll = Math.random();
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      roll -= matrix[x][y];
      if (roll <= 0) return { homeGoals: x, awayGoals: y };
    }
  }
  return { homeGoals: MAX_GOALS, awayGoals: MAX_GOALS };
}

export interface MatchOutcomeProbabilities {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
}

export function computeOutcomeProbabilities(lambdaHome: number, lambdaAway: number, rho = DIXON_COLES_RHO): MatchOutcomeProbabilities {
  const matrix = scorelineDistribution(lambdaHome, lambdaAway, rho);
  let homeWin = 0, draw = 0, awayWin = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      if (x > y) homeWin += matrix[x][y];
      else if (x === y) draw += matrix[x][y];
      else awayWin += matrix[x][y];
    }
  }
  return { homeWinProbability: homeWin, drawProbability: draw, awayWinProbability: awayWin };
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  xgHome: number;
  xgAway: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  wentToExtraTime: boolean;
  penalties?: { home: number; away: number };
}

/**
 * Bounded multiplier from a rating-point "edge". Zero edge → 1.0 (calibration-neutral); a large
 * edge is clamped so no single match runs away to an implausible scoreline.
 */
function ovrTiltFactor(edge: number): number {
  return Math.min(OVR_TILT_MAX, Math.max(OVR_TILT_MIN, 1 + edge * OVR_TILT_PER_POINT));
}

/** Bounded chance-creation multiplier from a side's creativity, centred on the league reference. */
function creativityFactor(creativity: number): number {
  return Math.min(CREATIVITY_MAX, Math.max(CREATIVITY_MIN, 1 + (creativity - REF_CREATIVITY) * CREATIVITY_PER_POINT));
}

/**
 * A manager's tactical shape as direct match-model multipliers, layered on top of the rating-based
 * expected goals: `attack` scales this side's own goals (attacking intent), `concede` scales the goals
 * the OPPONENT is expected to score against them (defensive risk). A low block is low/low (grind out
 * 1-0s), a gegenpress is high/high (chaos both ends), a counter is high-attack/low-concede.
 */
export interface TacticalShape {
  attack: number;
  concede: number;
}
export const NEUTRAL_TACTICS: TacticalShape = { attack: 1, concede: 1 };

export function computeExpectedGoals(
  homeXI: Player[],
  awayXI: Player[],
  homeAdvantage = HOME_ADVANTAGE,
  homeTactics: TacticalShape = NEUTRAL_TACTICS,
  awayTactics: TacticalShape = NEUTRAL_TACTICS,
): { lambdaHome: number; lambdaAway: number } {
  const homeAttack = weightedAttackRating(homeXI);
  const homeDefence = weightedDefenceRating(homeXI);
  const awayAttack = weightedAttackRating(awayXI);
  const awayDefence = weightedDefenceRating(awayXI);

  let lambdaHome = (homeAttack / awayDefence) * LEAGUE_AVG_GOALS * homeAdvantage;
  let lambdaAway = (awayAttack / homeDefence) * LEAGUE_AVG_GOALS;

  // Explicit OVR head-to-head: each side's attacking line is measured against the other's
  // defensive line, plus a midfield battle and an overall-quality term. This is a factor on top
  // of (not a replacement for) the Dixon-Coles attack/defence ratio, so the drafted team's OVR —
  // the same number shown in the Draft panel — genuinely drives results.
  const homeRaw = computeTeamOvr(homeXI);
  const awayRaw = computeTeamOvr(awayXI);
  // Sharpen the elite end so the best sides separate from a cluster of near-peers (see sharpenElite).
  const home = { atk: sharpenElite(homeRaw.atk), def: sharpenElite(homeRaw.def), mid: sharpenElite(homeRaw.mid), overall: sharpenElite(homeRaw.overall) };
  const away = { atk: sharpenElite(awayRaw.atk), def: sharpenElite(awayRaw.def), mid: sharpenElite(awayRaw.mid), overall: sharpenElite(awayRaw.overall) };
  const homeEdge = 0.5 * (home.atk - away.def) + 0.3 * (home.mid - away.mid) + 0.2 * (home.overall - away.overall);
  const awayEdge = 0.5 * (away.atk - home.def) + 0.3 * (away.mid - home.mid) + 0.2 * (away.overall - home.overall);
  lambdaHome *= ovrTiltFactor(homeEdge);
  lambdaAway *= ovrTiltFactor(awayEdge);

  // Creativity: a side that makes more chances converts more of them into goals, so a great
  // playmaker/wing-creator raises expected goals even when the finishers are only average. Centred
  // on the league reference, so it's calibration-neutral for a typical XI.
  lambdaHome *= creativityFactor(weightedCreativityRating(homeXI));
  lambdaAway *= creativityFactor(weightedCreativityRating(awayXI));

  // Tactical shape (managers): each side's attacking intent lifts its own goals, and its defensive
  // risk scales what the opponent scores. Neutral (1,1) leaves the model untouched — so a manager-less
  // side, and the calibration test, are unaffected.
  lambdaHome *= homeTactics.attack * awayTactics.concede;
  lambdaAway *= awayTactics.attack * homeTactics.concede;

  return { lambdaHome, lambdaAway };
}

function simulatePenaltyShootout(): { home: number; away: number } {
  const takeKick = () => (Math.random() < 0.76 ? 1 : 0);
  let home = 0, away = 0;
  for (let round = 0; round < 5; round++) {
    home += takeKick();
    away += takeKick();
  }
  while (home === away) {
    home += takeKick();
    away += takeKick();
  }
  return { home, away };
}

/** Sudden-goals style extra time approximation: 30 extra minutes scaled from the 90-minute expected goals. */
function simulateExtraTime(lambdaHome: number, lambdaAway: number, rho: number): { homeGoals: number; awayGoals: number } {
  const etScale = 30 / 90;
  return sampleDixonColesScoreline(lambdaHome * etScale, lambdaAway * etScale, rho);
}

export function simulateMatch(
  homeXI: Player[],
  awayXI: Player[],
  eraRules: EraRuleConfig,
  requiresDecisiveResult = false,
  homeTactics: TacticalShape = NEUTRAL_TACTICS,
  awayTactics: TacticalShape = NEUTRAL_TACTICS,
): MatchResult {
  const { lambdaHome, lambdaAway } = computeExpectedGoals(homeXI, awayXI, HOME_ADVANTAGE, homeTactics, awayTactics);
  const { homeGoals, awayGoals } = sampleDixonColesScoreline(lambdaHome, lambdaAway);
  const probabilities = computeOutcomeProbabilities(lambdaHome, lambdaAway);

  let finalHome = homeGoals;
  let finalAway = awayGoals;
  let wentToExtraTime = false;
  let penalties: { home: number; away: number } | undefined;

  if (requiresDecisiveResult && finalHome === finalAway) {
    if (eraRules.extraTimeMinutes > 0) {
      wentToExtraTime = true;
      const et = simulateExtraTime(lambdaHome, lambdaAway, DIXON_COLES_RHO);
      finalHome += et.homeGoals;
      finalAway += et.awayGoals;
    }
    if (finalHome === finalAway && eraRules.penaltyShootout) {
      penalties = simulatePenaltyShootout();
    }
  }

  return {
    homeGoals: finalHome,
    awayGoals: finalAway,
    xgHome: lambdaHome,
    xgAway: lambdaAway,
    ...probabilities,
    wentToExtraTime,
    penalties,
  };
}

export interface TwoLegTieResult extends MatchResult {
  aggregateHome: number;
  aggregateAway: number;
  winnerIsFirstLegHome: boolean;
}

export function simulateTwoLegTie(teamAXI: Player[], teamBXI: Player[], eraRules: EraRuleConfig): TwoLegTieResult {
  const leg1 = simulateMatch(teamAXI, teamBXI, eraRules, false);
  const leg2 = simulateMatch(teamBXI, teamAXI, eraRules, false);

  const aggregateA = leg1.homeGoals + leg2.awayGoals;
  const aggregateB = leg1.awayGoals + leg2.homeGoals;

  let winnerIsFirstLegHome = aggregateA > aggregateB;
  let wentToExtraTime = false;
  let penalties: { home: number; away: number } | undefined;

  if (aggregateA === aggregateB) {
    if (eraRules.awayGoalsRule) {
      const awayGoalsA = leg2.awayGoals;
      const awayGoalsB = leg1.awayGoals;
      if (awayGoalsA !== awayGoalsB) {
        winnerIsFirstLegHome = awayGoalsA > awayGoalsB;
      } else {
        ({ winnerIsFirstLegHome, wentToExtraTime, penalties } = resolveTiedAggregate(teamAXI, teamBXI, eraRules));
      }
    } else {
      ({ winnerIsFirstLegHome, wentToExtraTime, penalties } = resolveTiedAggregate(teamAXI, teamBXI, eraRules));
    }
  }

  return {
    ...leg2,
    aggregateHome: aggregateA,
    aggregateAway: aggregateB,
    winnerIsFirstLegHome,
    wentToExtraTime,
    penalties,
  };
}

function resolveTiedAggregate(teamAXI: Player[], teamBXI: Player[], eraRules: EraRuleConfig): { winnerIsFirstLegHome: boolean; wentToExtraTime: boolean; penalties?: { home: number; away: number } } {
  const { lambdaHome, lambdaAway } = computeExpectedGoals(teamBXI, teamAXI);
  let wentToExtraTime = false;
  let penalties: { home: number; away: number } | undefined;
  let aWins: boolean;

  if (eraRules.extraTimeMinutes > 0) {
    wentToExtraTime = true;
    const et = simulateExtraTime(lambdaHome, lambdaAway, DIXON_COLES_RHO);
    if (et.homeGoals !== et.awayGoals) {
      aWins = et.awayGoals > et.homeGoals;
    } else if (eraRules.penaltyShootout) {
      penalties = simulatePenaltyShootout();
      aWins = penalties.away > penalties.home;
    } else {
      aWins = Math.random() < 0.5;
    }
  } else if (eraRules.penaltyShootout) {
    penalties = simulatePenaltyShootout();
    aWins = penalties.away > penalties.home;
  } else {
    aWins = Math.random() < 0.5;
  }

  return { winnerIsFirstLegHome: aWins, wentToExtraTime, penalties };
}
