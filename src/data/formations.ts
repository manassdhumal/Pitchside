import type { Formation, Position } from '../types';

export interface FormationSlot {
  position: Position;
  /** Pitch coordinates as percentages: x = left(0)-right(100), y = attack(0)-goal(100). */
  x: number;
  y: number;
}

export const FORMATION_DESCRIPTIONS: Record<Formation, string> = {
  '4-3-3': 'Four at the back, a midfield triangle, width from the wingers.',
  '4-4-2': 'The classic English shape: two banks of four and a strike pair.',
  '4-2-3-1': 'Two defensive midfielders shield the back four, three feed a lone striker.',
  '4-5-1': 'A packed midfield five protecting a back four, one out ball up top.',
  '3-4-3': 'Three centre-backs, a flat four, and three committed forward.',
  '3-5-2': 'Wing-backs provide the width behind a five-man midfield and strike pair.',
  '5-4-1': 'Five at the back with wing-backs, narrow midfield four, lone striker.',
  '4-1-2-1-2': 'A holding midfielder, a double pivot, a number 10, and a strike pair.',
  '4-4-1-1': 'A flat midfield four feeding a second striker who plays off the front man.',
  '5-3-2': 'Three centre-backs plus wing-backs, a narrow central three, two up top.',
  '3-4-1-2': 'Three at the back, wing-backs for width, a 10 feeding a strike pair.',
  '4-2-2-2': 'Two holding midfielders, two advanced wide players, a strike pair.',
};

const GK: FormationSlot = { position: 'GK', x: 50, y: 92 };

export const FORMATION_SLOTS: Record<Formation, FormationSlot[]> = {
  '4-3-3': [
    GK,
    { position: 'LB', x: 14, y: 68 }, { position: 'CB', x: 38, y: 72 }, { position: 'CB', x: 62, y: 72 }, { position: 'RB', x: 86, y: 68 },
    { position: 'CM', x: 30, y: 46 }, { position: 'CM', x: 50, y: 50 }, { position: 'CM', x: 70, y: 46 },
    { position: 'LW', x: 18, y: 16 }, { position: 'ST', x: 50, y: 10 }, { position: 'RW', x: 82, y: 16 },
  ],
  '4-4-2': [
    GK,
    { position: 'LB', x: 14, y: 68 }, { position: 'CB', x: 38, y: 72 }, { position: 'CB', x: 62, y: 72 }, { position: 'RB', x: 86, y: 68 },
    { position: 'LM', x: 14, y: 44 }, { position: 'CM', x: 38, y: 46 }, { position: 'CM', x: 62, y: 46 }, { position: 'RM', x: 86, y: 44 },
    { position: 'ST', x: 38, y: 12 }, { position: 'ST', x: 62, y: 12 },
  ],
  '4-2-3-1': [
    GK,
    { position: 'LB', x: 14, y: 70 }, { position: 'CB', x: 38, y: 74 }, { position: 'CB', x: 62, y: 74 }, { position: 'RB', x: 86, y: 70 },
    { position: 'CDM', x: 38, y: 52 }, { position: 'CDM', x: 62, y: 52 },
    { position: 'LW', x: 18, y: 28 }, { position: 'CAM', x: 50, y: 26 }, { position: 'RW', x: 82, y: 28 },
    { position: 'ST', x: 50, y: 10 },
  ],
  '4-5-1': [
    GK,
    { position: 'LB', x: 12, y: 70 }, { position: 'CB', x: 38, y: 74 }, { position: 'CB', x: 62, y: 74 }, { position: 'RB', x: 88, y: 70 },
    { position: 'LM', x: 10, y: 46 }, { position: 'CM', x: 32, y: 48 }, { position: 'CM', x: 50, y: 50 }, { position: 'CM', x: 68, y: 48 }, { position: 'RM', x: 90, y: 46 },
    { position: 'ST', x: 50, y: 10 },
  ],
  '3-4-3': [
    GK,
    { position: 'CB', x: 30, y: 74 }, { position: 'CB', x: 50, y: 76 }, { position: 'CB', x: 70, y: 74 },
    { position: 'LM', x: 12, y: 48 }, { position: 'CM', x: 38, y: 50 }, { position: 'CM', x: 62, y: 50 }, { position: 'RM', x: 88, y: 48 },
    { position: 'LW', x: 18, y: 14 }, { position: 'ST', x: 50, y: 10 }, { position: 'RW', x: 82, y: 14 },
  ],
  '3-5-2': [
    GK,
    { position: 'CB', x: 30, y: 74 }, { position: 'CB', x: 50, y: 76 }, { position: 'CB', x: 70, y: 74 },
    { position: 'LWB', x: 8, y: 46 }, { position: 'CM', x: 32, y: 50 }, { position: 'CDM', x: 50, y: 54 }, { position: 'CM', x: 68, y: 50 }, { position: 'RWB', x: 92, y: 46 },
    { position: 'ST', x: 38, y: 12 }, { position: 'ST', x: 62, y: 12 },
  ],
  '5-4-1': [
    GK,
    { position: 'LWB', x: 12, y: 64 }, { position: 'CB', x: 38, y: 76 }, { position: 'CB', x: 50, y: 78 }, { position: 'CB', x: 62, y: 76 }, { position: 'RWB', x: 88, y: 64 },
    { position: 'LM', x: 14, y: 44 }, { position: 'CM', x: 38, y: 46 }, { position: 'CM', x: 62, y: 46 }, { position: 'RM', x: 86, y: 44 },
    { position: 'ST', x: 50, y: 10 },
  ],
  '4-1-2-1-2': [
    GK,
    { position: 'LB', x: 14, y: 70 }, { position: 'CB', x: 38, y: 74 }, { position: 'CB', x: 62, y: 74 }, { position: 'RB', x: 86, y: 70 },
    { position: 'CDM', x: 50, y: 56 },
    { position: 'CM', x: 32, y: 40 }, { position: 'CM', x: 68, y: 40 },
    { position: 'CAM', x: 50, y: 24 },
    { position: 'ST', x: 38, y: 10 }, { position: 'ST', x: 62, y: 10 },
  ],
  '4-4-1-1': [
    GK,
    { position: 'LB', x: 14, y: 70 }, { position: 'CB', x: 38, y: 74 }, { position: 'CB', x: 62, y: 74 }, { position: 'RB', x: 86, y: 70 },
    { position: 'LM', x: 14, y: 46 }, { position: 'CM', x: 38, y: 48 }, { position: 'CM', x: 62, y: 48 }, { position: 'RM', x: 86, y: 46 },
    { position: 'CAM', x: 50, y: 26 },
    { position: 'ST', x: 50, y: 10 },
  ],
  '5-3-2': [
    GK,
    { position: 'LWB', x: 12, y: 62 }, { position: 'CB', x: 38, y: 76 }, { position: 'CB', x: 50, y: 78 }, { position: 'CB', x: 62, y: 76 }, { position: 'RWB', x: 88, y: 62 },
    { position: 'CM', x: 30, y: 46 }, { position: 'CM', x: 50, y: 48 }, { position: 'CM', x: 70, y: 46 },
    { position: 'ST', x: 38, y: 12 }, { position: 'ST', x: 62, y: 12 },
  ],
  '3-4-1-2': [
    GK,
    { position: 'CB', x: 30, y: 72 }, { position: 'CB', x: 50, y: 76 }, { position: 'CB', x: 70, y: 72 },
    { position: 'LWB', x: 10, y: 50 }, { position: 'CM', x: 38, y: 48 }, { position: 'CM', x: 62, y: 48 }, { position: 'RWB', x: 90, y: 50 },
    { position: 'CAM', x: 50, y: 28 },
    { position: 'ST', x: 38, y: 12 }, { position: 'ST', x: 62, y: 12 },
  ],
  '4-2-2-2': [
    GK,
    { position: 'LB', x: 14, y: 70 }, { position: 'CB', x: 38, y: 74 }, { position: 'CB', x: 62, y: 74 }, { position: 'RB', x: 86, y: 70 },
    { position: 'CDM', x: 38, y: 54 }, { position: 'CDM', x: 62, y: 54 },
    { position: 'LM', x: 18, y: 32 }, { position: 'RM', x: 82, y: 32 },
    { position: 'ST', x: 38, y: 12 }, { position: 'ST', x: 62, y: 12 },
  ],
};

export const FORMATIONS: Formation[] = [
  '4-3-3', '4-4-2', '4-2-3-1', '4-5-1', '3-4-3',
  '3-5-2', '5-4-1', '4-1-2-1-2', '4-4-1-1', '5-3-2', '3-4-1-2', '4-2-2-2',
];
