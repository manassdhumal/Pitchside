import type { BroadPosition, PlayerRatings } from './player';

export interface RealPlayerSeasonStats {
  appearances: number;
  goals: number;
}

export interface RealPlayerRecord {
  id: string;
  name: string;
  nationality: string;
  broadPosition: BroadPosition;
  shirtNumber?: number;
  stats: RealPlayerSeasonStats;
  /** Ratings derived for this specific club-season. */
  seasonRatings: PlayerRatings;
  /** PitchSide's own estimate of the player's career-peak form (see ratings.mjs for the formula). */
  primeRatings: PlayerRatings;
}

export interface ClubSeason {
  leagueId: string;
  clubId: string;
  /** e.g. '2003-04' */
  season: string;
  squad: RealPlayerRecord[];
  sourceUrl: string;
  scrapedAt: string;
}
