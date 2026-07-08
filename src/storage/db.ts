import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Player, Team, Season } from '../types';

interface PitchSideDB extends DBSchema {
  players: { key: string; value: Player };
  teams: { key: string; value: Team };
  seasons: { key: string; value: Season };
  meta: { key: string; value: unknown };
}

const DB_NAME = 'pitchside';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PitchSideDB>> | null = null;

function getDB(): Promise<IDBPDatabase<PitchSideDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PitchSideDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('players')) db.createObjectStore('players', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('teams')) db.createObjectStore('teams', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('seasons')) db.createObjectStore('seasons', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

export async function savePlayers(players: Player[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('players', 'readwrite');
  await Promise.all(players.map((p) => tx.store.put(p)));
  await tx.done;
}

export async function getPlayersByIds(ids: string[]): Promise<Player[]> {
  const db = await getDB();
  const players = await Promise.all(ids.map((id) => db.get('players', id)));
  return players.filter((p): p is Player => p !== undefined);
}

export async function getAllPlayers(): Promise<Player[]> {
  const db = await getDB();
  return db.getAll('players');
}

export async function saveTeam(team: Team): Promise<void> {
  const db = await getDB();
  await db.put('teams', team);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  const db = await getDB();
  return db.get('teams', id);
}

export async function getAllTeams(): Promise<Team[]> {
  const db = await getDB();
  return db.getAll('teams');
}

export async function saveSeason(season: Season): Promise<void> {
  const db = await getDB();
  await db.put('seasons', season);
}

export async function getSeason(id: string): Promise<Season | undefined> {
  const db = await getDB();
  return db.get('seasons', id);
}

export async function getAllSeasons(): Promise<Season[]> {
  const db = await getDB();
  return db.getAll('seasons');
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', value, key);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get('meta', key) as Promise<T | undefined>;
}
