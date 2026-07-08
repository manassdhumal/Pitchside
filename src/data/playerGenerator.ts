import type { Player, PlayerRatings, Position, EraTag } from '../types';
import { randomNationality } from './nationalities';

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];

// Roughly mirrors a real squad's positional distribution (more CB/CM/ST than CAM/LM).
const POSITION_WEIGHTS: Partial<Record<Position, number>> = {
  GK: 3, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 3, CAM: 2, LM: 1.5, RM: 1.5, LW: 1.5, RW: 1.5, ST: 3,
};

function weightedRandomPosition(): Position {
  const total = POSITIONS.reduce((sum, p) => sum + (POSITION_WEIGHTS[p] ?? 0), 0);
  let roll = Math.random() * total;
  for (const p of POSITIONS) {
    roll -= POSITION_WEIGHTS[p] ?? 0;
    if (roll <= 0) return p;
  }
  return 'CM';
}

function clamp(value: number, min = 1, max = 99): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function gaussianRandom(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/** Peak ~26-29, gentle rise from ~17, decline after ~32. Used to scale a base potential into a current overall. */
export function ageCurveMultiplier(age: number): number {
  if (age <= 29 && age >= 24) return 1;
  if (age < 24) return 0.7 + (age - 17) * (0.3 / 7);
  return Math.max(0.55, 1 - (age - 29) * 0.035);
}

function generateRatings(position: Position, overallTarget: number): PlayerRatings {
  const isGK = position === 'GK';
  const isDefender = position === 'CB' || position === 'LB' || position === 'RB' || position === 'CDM';
  const isAttacker = position === 'ST' || position === 'LW' || position === 'RW' || position === 'CAM';

  const base = (lean: number) => clamp(gaussianRandom(overallTarget + lean, 6));

  const ratings: PlayerRatings = {
    overall: overallTarget,
    pace: base(isDefender ? -5 : isAttacker ? 5 : 0),
    shooting: base(isAttacker ? 8 : isDefender ? -15 : -5),
    passing: base(isDefender ? -3 : 3),
    dribbling: base(isAttacker ? 6 : isDefender ? -8 : 0),
    defending: base(isDefender ? 10 : isAttacker ? -20 : -5),
    physical: base(isDefender ? 5 : 0),
  };

  if (isGK) {
    ratings.goalkeeping = clamp(gaussianRandom(overallTarget + 10, 5));
    ratings.defending = clamp(gaussianRandom(overallTarget - 25, 8));
    ratings.shooting = clamp(gaussianRandom(20, 5));
  }

  return ratings;
}

function eraFromBirthYear(birthYear: number, referenceYear: number): EraTag {
  const debutDecadeYear = birthYear + 20;
  if (debutDecadeYear < 1970) return 'pre-1970';
  if (debutDecadeYear < 1980) return '1970s';
  if (debutDecadeYear < 1990) return '1980s';
  if (debutDecadeYear < 2000) return '1990s';
  if (debutDecadeYear < 2010) return '2000s';
  if (debutDecadeYear < 2020) return '2010s';
  return referenceYear - birthYear <= 40 ? 'modern' : '2010s';
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `proc-${Date.now().toString(36)}-${idCounter}`;
}

export interface GeneratePlayerOptions {
  referenceYear?: number;
  position?: Position;
  minAge?: number;
  maxAge?: number;
  potentialRange?: [number, number];
}

export function generatePlayer(options: GeneratePlayerOptions = {}): Player {
  const referenceYear = options.referenceYear ?? new Date().getFullYear();
  const position = options.position ?? weightedRandomPosition();
  const minAge = options.minAge ?? 17;
  const maxAge = options.maxAge ?? 35;
  const age = Math.floor(minAge + Math.random() * (maxAge - minAge));
  const bornYear = referenceYear - age;

  const [potMin, potMax] = options.potentialRange ?? [55, 90];
  const potential = potMin + Math.random() * (potMax - potMin);
  const overall = clamp(potential * ageCurveMultiplier(age));

  const nationality = randomNationality();
  const firstName = nationality.firstNames[Math.floor(Math.random() * nationality.firstNames.length)];
  const lastName = nationality.lastNames[Math.floor(Math.random() * nationality.lastNames.length)];

  const ratings = generateRatings(position, overall);

  return {
    id: nextId(),
    firstName,
    lastName,
    nationality: nationality.code,
    born: { year: bornYear },
    retired: false,
    position,
    era: eraFromBirthYear(bornYear, referenceYear),
    ratings,
    ratingsHistory: [{ season: String(referenceYear), ratings }],
    isLegend: false,
    isProcedural: true,
    sourceNote: 'Procedurally generated; ratings are PitchSide-original, not derived from any proprietary database.',
  };
}

export function generatePlayerPool(count: number, options: GeneratePlayerOptions = {}): Player[] {
  return Array.from({ length: count }, () => generatePlayer(options));
}

/** Builds one balanced 18-player squad pool (11 starters + subs) covering every position. */
export function generateSquadPool(options: GeneratePlayerOptions = {}): Player[] {
  const template: Position[] = ['GK', 'GK', 'CB', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'ST', 'ST'];
  return template.map((position) => generatePlayer({ ...options, position }));
}
