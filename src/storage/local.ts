import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Player, Team, Season } from '../types';
import type { TeamSummary, SeasonSummary, SeasonMeta } from './cache';

// Guest storage: the same account-shaped records the API returns, kept in IndexedDB on this device so
// a signed-out player can still draft, play, and keep a history — just locally, not synced.
interface TeamRecord { id: string; name: string; createdAt: number; team: Team; players: Player[] }
interface SeasonRecord {
  id: string; teamId: string | null; competition: string | null; position: number | null;
  played: number | null; points: number | null; summary: Record<string, unknown> | null;
  createdAt: number; season: Season;
}

interface GuestDB extends DBSchema {
  teamRecords: { key: string; value: TeamRecord };
  seasonRecords: { key: string; value: SeasonRecord };
}

let dbPromise: Promise<IDBPDatabase<GuestDB>> | null = null;
function getDB(): Promise<IDBPDatabase<GuestDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GuestDB>('pitchside-guest', 1, {
      upgrade(db) {
        db.createObjectStore('teamRecords', { keyPath: 'id' });
        db.createObjectStore('seasonRecords', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export const local = {
  async putTeam(team: Team, players: Player[]): Promise<void> {
    const db = await getDB();
    const existing = await db.get('teamRecords', team.id);
    await db.put('teamRecords', { id: team.id, name: team.name, createdAt: existing?.createdAt ?? Date.now(), team, players });
  },
  async getTeam(id: string): Promise<{ team: Team; players: Player[] } | undefined> {
    const r = await (await getDB()).get('teamRecords', id);
    return r ? { team: r.team, players: r.players } : undefined;
  },
  async getAllTeams(): Promise<TeamSummary[]> {
    const all = await (await getDB()).getAll('teamRecords');
    return all.sort((a, b) => b.createdAt - a.createdAt).map((r) => ({ id: r.id, name: r.name, createdAt: r.createdAt, team: r.team }));
  },
  async deleteTeam(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('teamRecords', id);
    const seasons = await db.getAll('seasonRecords');
    await Promise.all(seasons.filter((s) => s.teamId === id).map((s) => db.delete('seasonRecords', s.id)));
  },
  async putSeason(season: Season, meta: SeasonMeta): Promise<void> {
    const db = await getDB();
    const existing = await db.get('seasonRecords', season.id);
    await db.put('seasonRecords', {
      id: season.id, teamId: meta.teamId ?? null, competition: meta.competition ?? null,
      position: meta.position ?? null, played: meta.played ?? null, points: meta.points ?? null,
      summary: meta.summary ?? null, createdAt: existing?.createdAt ?? Date.now(), season,
    });
  },
  async getSeason(id: string): Promise<Season | undefined> {
    return (await (await getDB()).get('seasonRecords', id))?.season;
  },
  async getAllSeasons(): Promise<SeasonSummary[]> {
    const all = await (await getDB()).getAll('seasonRecords');
    return all.sort((a, b) => b.createdAt - a.createdAt).map((r) => ({
      id: r.id, teamId: r.teamId, competition: r.competition, position: r.position,
      played: r.played, points: r.points, summary: r.summary, createdAt: r.createdAt,
    }));
  },
  async deleteSeason(id: string): Promise<void> {
    await (await getDB()).delete('seasonRecords', id);
  },
};
