import type { DraftSettings } from '../types';
import { dailySeed, todayKey } from '../engine/rng';

/** All five leagues are in play for the daily draw. */
const LEAGUE_IDS = ['premier-league', 'bundesliga', 'la-liga', 'serie-a', 'ligue-1'];

/** Marker passed in the Draft navigation state to switch it into daily mode. */
export interface DailyState {
  seed: number;
  date: string;
}

/**
 * The fixed ruleset for the Daily Challenge: all leagues, 4-3-3, no rerolls (hard), squad-first, the
 * full era range. Everyone on the same build sees the same club-seasons because the seed is derived
 * from the date and the squad pool is identical bundled data.
 */
export function dailyDraftSettings(dayKey = todayKey()): DraftSettings & { daily: DailyState } {
  return {
    leagueIds: LEAGUE_IDS,
    formation: '4-3-3',
    difficulty: 'hard',
    showRatings: true,
    ratingsMode: 'season',
    seasonMin: '1900',
    seasonMax: '2100',
    draftMode: 'squad-first',
    managersEnabled: false,
    transferWindowEnabled: false,
    daily: { seed: dailySeed(dayKey), date: dayKey },
  };
}

/** A completed daily attempt, scored by the deterministic team OVR (no sim variance). */
export interface DailyResult {
  date: string;
  ovr: number;
  def: number;
  mid: number;
  atk: number;
  playedAt: number;
}

const storeKey = (date: string) => `ps_daily_${date}`;

export function getDailyResult(date = todayKey()): DailyResult | null {
  try {
    const raw = localStorage.getItem(storeKey(date));
    return raw ? (JSON.parse(raw) as DailyResult) : null;
  } catch {
    return null;
  }
}

export function saveDailyResult(r: DailyResult): void {
  try {
    localStorage.setItem(storeKey(r.date), JSON.stringify(r));
  } catch {
    /* storage disabled — daily just won't persist */
  }
}

export function getDailyHistory(): DailyResult[] {
  const out: DailyResult[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ps_daily_')) {
        const v = localStorage.getItem(k);
        if (v) out.push(JSON.parse(v) as DailyResult);
      }
    }
  } catch {
    /* ignore */
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** Consecutive completed days ending today (or yesterday if today isn't done yet). */
export function dailyStreak(today = todayKey()): number {
  const done = new Set(getDailyHistory().map((r) => r.date));
  const [y, m, d] = today.split('-').map(Number);
  const cur = new Date(y, m - 1, d);
  // If today isn't done yet, a streak can still stand from yesterday back.
  if (!done.has(today)) cur.setDate(cur.getDate() - 1);
  let streak = 0;
  for (;;) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    if (done.has(key)) {
      streak += 1;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }
  return streak;
}
