import type { Player, Team, Season } from '../types';
import { api } from '../api/client';

// Session caches over the accounts API so repeated reads within a session don't re-fetch. Players are
// persisted embedded with their team on the server, so `putPlayers` just seeds this cache and `putTeam`
// gathers the team's players from it to save alongside the team; `getTeam` re-seeds it from the server.
const playerCache = new Map<string, Player>();
const teamCache = new Map<string, Team>();
const seasonCache = new Map<string, Season>();

export interface TeamSummary {
  id: string;
  name: string;
  createdAt: number;
  team: Team;
}

export interface SeasonSummary {
  id: string;
  teamId: string | null;
  competition: string | null;
  position: number | null;
  played: number | null;
  points: number | null;
  summary: Record<string, unknown> | null;
  createdAt: number;
}

/** Extra denormalized fields for the history list, sent alongside the full season blob. */
export interface SeasonMeta {
  teamId?: string;
  competition?: string;
  position?: number;
  played?: number;
  points?: number;
  summary?: Record<string, unknown>;
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  return playerCache.get(id);
}

export async function getPlayers(ids: string[]): Promise<Player[]> {
  return ids.map((id) => playerCache.get(id)).filter((p): p is Player => p !== undefined);
}

export async function putPlayers(players: Player[]): Promise<void> {
  for (const p of players) playerCache.set(p.id, p);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  const cached = teamCache.get(id);
  if (cached) return cached;
  try {
    const { team, players } = await api.get<{ team: Team; players: Player[] }>(`/api/teams/${id}`);
    for (const p of players) playerCache.set(p.id, p);
    teamCache.set(team.id, team);
    return team;
  } catch {
    return undefined;
  }
}

export async function putTeam(team: Team): Promise<void> {
  const players = team.squad.map((pid) => playerCache.get(pid)).filter((p): p is Player => p !== undefined);
  await api.post('/api/teams', { team, players });
  teamCache.set(team.id, team);
}

export async function deleteTeam(id: string): Promise<void> {
  await api.del(`/api/teams/${id}`);
  teamCache.delete(id);
}

export async function getAllTeams(): Promise<TeamSummary[]> {
  return api.get<TeamSummary[]>('/api/teams');
}

export async function getSeason(id: string): Promise<Season | undefined> {
  const cached = seasonCache.get(id);
  if (cached) return cached;
  try {
    const { season } = await api.get<{ season: Season }>(`/api/seasons/${id}`);
    seasonCache.set(season.id, season);
    return season;
  } catch {
    return undefined;
  }
}

export async function putSeason(season: Season, meta: SeasonMeta = {}): Promise<void> {
  await api.post('/api/seasons', { season, ...meta });
  seasonCache.set(season.id, season);
}

export async function deleteSeason(id: string): Promise<void> {
  await api.del(`/api/seasons/${id}`);
  seasonCache.delete(id);
}

export async function getAllSeasons(): Promise<SeasonSummary[]> {
  return api.get<SeasonSummary[]>('/api/seasons');
}

export function clearCache(): void {
  playerCache.clear();
  teamCache.clear();
  seasonCache.clear();
}
