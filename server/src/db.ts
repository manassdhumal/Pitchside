import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// A single file DB next to the server. Override with DB_PATH (e.g. a mounted volume in production).
const DB_PATH = process.env.DB_PATH ?? join(here, '..', 'pitchside.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

type Param = string | number | bigint | null | Uint8Array;

// Thin typed helpers so callers get their row shape back without repeating `as unknown as T`, and so
// bound params are typed (node:sqlite rejects `undefined` — pass `null` for absent values).
export const q = {
  get<T>(sql: string, ...params: Param[]): T | undefined {
    return db.prepare(sql).get(...params) as unknown as T | undefined;
  },
  all<T>(sql: string, ...params: Param[]): T[] {
    return db.prepare(sql).all(...params) as unknown as T[];
  },
  run(sql: string, ...params: Param[]): void {
    db.prepare(sql).run(...params);
  },
};

// `username` is COLLATE NOCASE so uniqueness + lookups are case-insensitive while the original case
// is preserved for display. `data` columns hold the full JSON payloads; the extra season columns are
// denormalized so the history list is cheap to fetch without parsing every blob.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS teams (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    name       TEXT NOT NULL,
    data       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_teams_user ON teams(user_id);
  CREATE TABLE IF NOT EXISTS seasons (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    team_id     TEXT,
    competition TEXT,
    position    INTEGER,
    played      INTEGER,
    points      INTEGER,
    summary     TEXT,
    data        TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_seasons_user ON seasons(user_id);
`);
