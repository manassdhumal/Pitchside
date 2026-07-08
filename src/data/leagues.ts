import type { League, RealClub } from '../types';
import leaguesJson from './leagues.json';
import clubsJson from './clubs.json';

export const LEAGUES: League[] = leaguesJson;
// JSON imports widen the tier literal union (1|2|3|4) to number, so narrow at the boundary.
export const CLUBS: RealClub[] = clubsJson as RealClub[];

export function getLeague(id: string): League | undefined {
  return LEAGUES.find((l) => l.id === id);
}

export function getClub(id: string): RealClub | undefined {
  return CLUBS.find((c) => c.id === id);
}

export function clubsForLeague(leagueId: string): RealClub[] {
  return CLUBS.filter((c) => c.leagueId === leagueId);
}
