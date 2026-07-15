import type { ClubSeason, RealPlayerRecord, Player, Position, BroadPosition, EraTag } from '../types';
import { POSITION_TO_BROAD } from '../types';

export interface ClubSeasonIndexEntry {
  leagueId: string;
  clubId: string;
  season: string;
  playerCount: number;
  /** Highest appearance count in the squad — 0 for a stats-less roster, low for a partial/in-progress
   * season. Used to skip incomplete seasons when picking a club's opponent side. Optional for
   * backward compatibility with an older index. */
  maxApps?: number;
  /** Best-XI mean overall (4-3-3) precomputed at scrape time, so opponent selection can pick a club's
   * strongest complete season without loading every season file. Optional (older index). */
  strength?: number;
}

interface HistoricalIndex {
  entries: ClubSeasonIndexEntry[];
}

// Squad data is served as static files from public/data/historical (written by
// scripts/scrape/run.mjs) and fetched at runtime. Deliberately NOT bundler imports: the scraper
// appends files continuously in the background, and glob-imported JSON would invalidate the
// module graph and full-reload the dev server (wiping in-progress draft state) on every write.
let indexPromise: Promise<HistoricalIndex> | null = null;
const clubSeasonCache = new Map<string, ClubSeason>();

export function loadIndex(): Promise<ClubSeasonIndexEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch('/data/historical/index.json').then((res) => {
      if (!res.ok) throw new Error(`Failed to load squad index: HTTP ${res.status}`);
      return res.json() as Promise<HistoricalIndex>;
    });
  }
  return indexPromise.then((idx) => idx.entries);
}

export async function loadClubSeason(leagueId: string, clubId: string, season: string): Promise<ClubSeason | null> {
  const key = `${leagueId}/${clubId}/${season}`;
  const cached = clubSeasonCache.get(key);
  if (cached) return cached;
  const res = await fetch(`/data/historical/${key}.json`);
  if (!res.ok) return null;
  const doc = (await res.json()) as ClubSeason;
  clubSeasonCache.set(key, doc);
  return doc;
}

export interface SpinFilter {
  leagueIds: string[];
  seasonMin: string;
  seasonMax: string;
}

function seasonStartYear(season: string): number {
  return parseInt(season.slice(0, 4), 10);
}

export function filterEntries(entries: ClubSeasonIndexEntry[], filter: SpinFilter): ClubSeasonIndexEntry[] {
  const minYear = seasonStartYear(filter.seasonMin);
  const maxYear = seasonStartYear(filter.seasonMax);
  return entries.filter((e) => {
    if (!filter.leagueIds.includes(e.leagueId)) return false;
    const year = seasonStartYear(e.season);
    return year >= minYear && year <= maxYear;
  });
}

export function pickRandomEntry(entries: ClubSeasonIndexEntry[]): ClubSeasonIndexEntry | null {
  if (entries.length === 0) return null;
  return entries[Math.floor(Math.random() * entries.length)];
}

/** Broad-position compatibility for slotting a real player into a formation slot. */
export function isPositionCompatible(broad: BroadPosition, slot: Position): boolean {
  return POSITION_TO_BROAD[slot] === broad;
}

/**
 * Real squad sources only record a broad GK/DF/MF/FW bucket, so we refine it to a plausible
 * specific label (CB, RB, CDM, CAM, LW, …) for display using the player's shirt number — the
 * traditional positional numbering (2=RB, 3=LB, 6=CDM, 10=CAM, 9=ST, 7/11=wingers) is a weak but
 * reasonable signal. Purely cosmetic: a player still fills any formation slot in their broad
 * bucket, so this is an estimate in keeping with the rest of PitchSide's derived data.
 */
export function inferSpecificPosition(broad: BroadPosition, shirtNumber?: number): Position {
  const n = shirtNumber;
  switch (broad) {
    case 'GK':
      return 'GK';
    case 'DF':
      if (n === 2) return 'RB';
      if (n === 3) return 'LB';
      return 'CB';
    case 'MF':
      if (n === 4 || n === 6) return 'CDM';
      if (n === 10) return 'CAM';
      if (n === 7) return 'RM';
      if (n === 11) return 'LM';
      return 'CM';
    case 'FW':
    default:
      if (n === 7) return 'RW';
      if (n === 11) return 'LW';
      return 'ST';
  }
}

function seasonToEraTag(season: string): EraTag {
  const year = seasonStartYear(season);
  if (year < 1970) return 'pre-1970';
  if (year < 1980) return '1970s';
  if (year < 1990) return '1980s';
  if (year < 2000) return '1990s';
  if (year < 2010) return '2000s';
  if (year < 2016) return '2010s';
  return 'modern';
}

/** Converts a scraped real player into the engine's generic Player shape for a chosen formation slot. */
export function realPlayerToEnginePlayer(
  record: RealPlayerRecord,
  slotPosition: Position,
  ratingsMode: 'season' | 'prime',
  clubSeason: ClubSeason,
): Player {
  const nameParts = record.name.trim().split(/\s+/);
  const firstName = nameParts.length > 1 ? nameParts[0] : '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];
  const ratings = ratingsMode === 'prime' ? record.primeRatings : record.seasonRatings;

  return {
    id: `${record.id}-${clubSeason.clubId}-${clubSeason.season}`,
    firstName,
    lastName,
    nationality: record.nationality,
    retired: true,
    position: slotPosition,
    era: seasonToEraTag(clubSeason.season),
    ratings,
    ratingsHistory: [{ season: clubSeason.season, ratings: record.seasonRatings }],
    isLegend: false,
    isProcedural: false,
    sourceNote: `Real player who appeared for this club in the ${clubSeason.season} season. Ratings are PitchSide's independent estimate derived from public appearance/goal data, not sourced from any proprietary database.`,
  };
}
