import type { Player, Team, Season } from '../types';
import * as db from './db';

// In-memory cache over IndexedDB so repeated reads within a session (e.g. simulating
// many seasons back-to-back) don't round-trip to disk every time.
const playerCache = new Map<string, Player>();
const teamCache = new Map<string, Team>();
const seasonCache = new Map<string, Season>();

export async function getPlayer(id: string): Promise<Player | undefined> {
  if (playerCache.has(id)) return playerCache.get(id);
  const [player] = await db.getPlayersByIds([id]);
  if (player) playerCache.set(id, player);
  return player;
}

export async function getPlayers(ids: string[]): Promise<Player[]> {
  const cached: Player[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const hit = playerCache.get(id);
    if (hit) cached.push(hit);
    else missing.push(id);
  }
  if (missing.length > 0) {
    const fetched = await db.getPlayersByIds(missing);
    for (const p of fetched) playerCache.set(p.id, p);
    cached.push(...fetched);
  }
  const byId = new Map(cached.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is Player => p !== undefined);
}

export async function putPlayers(players: Player[]): Promise<void> {
  for (const p of players) playerCache.set(p.id, p);
  await db.savePlayers(players);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  if (teamCache.has(id)) return teamCache.get(id);
  const team = await db.getTeam(id);
  if (team) teamCache.set(id, team);
  return team;
}

export async function putTeam(team: Team): Promise<void> {
  teamCache.set(team.id, team);
  await db.saveTeam(team);
}

export async function getSeason(id: string): Promise<Season | undefined> {
  if (seasonCache.has(id)) return seasonCache.get(id);
  const season = await db.getSeason(id);
  if (season) seasonCache.set(id, season);
  return season;
}

export async function putSeason(season: Season): Promise<void> {
  seasonCache.set(season.id, season);
  await db.saveSeason(season);
}

export function clearCache(): void {
  playerCache.clear();
  teamCache.clear();
  seasonCache.clear();
}
