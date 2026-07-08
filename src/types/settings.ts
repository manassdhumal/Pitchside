import type { Formation } from './team';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type DraftMode = 'squad-first' | 'position-first';
export type RatingsMode = 'season' | 'prime';

export interface DraftSettings {
  leagueIds: string[];
  formation: Formation;
  difficulty: Difficulty;
  showRatings: boolean;
  ratingsMode: RatingsMode;
  seasonMin: string;
  seasonMax: string;
  draftMode: DraftMode;
  managersEnabled: boolean;
  transferWindowEnabled: boolean;
}

export const REROLLS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 3,
  normal: 1,
  hard: 0,
};
