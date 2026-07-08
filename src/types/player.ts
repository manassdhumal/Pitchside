export type Position =
  | 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST';

/** Coarse position bucket, the granularity real-world squad-list sources actually provide. */
export type BroadPosition = 'GK' | 'DF' | 'MF' | 'FW';

export const POSITION_TO_BROAD: Record<Position, BroadPosition> = {
  GK: 'GK',
  CB: 'DF', LB: 'DF', RB: 'DF', LWB: 'DF', RWB: 'DF',
  CDM: 'MF', CM: 'MF', CAM: 'MF', LM: 'MF', RM: 'MF',
  LW: 'FW', RW: 'FW', ST: 'FW',
};

export type EraTag =
  | 'pre-1970' | '1970s' | '1980s' | '1990s' | '2000s' | '2010s' | 'modern';

export interface PlayerRatings {
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping?: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  /** Unknown for most real scraped players (source data doesn't include DOB). */
  born?: { year: number };
  retired: boolean;
  position: Position;
  era: EraTag;
  ratings: PlayerRatings;
  ratingsHistory: { season: string; ratings: PlayerRatings }[];
  isLegend: boolean;
  isProcedural: boolean;
  sourceNote?: string;
}
