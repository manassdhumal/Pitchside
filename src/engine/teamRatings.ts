import type { Player, BroadPosition } from '../types';
import { POSITION_TO_BROAD } from '../types';

export interface TeamOvr {
  /** Whole-team overall (mean of every filled slot). */
  overall: number;
  /** Defensive line: goalkeeper + defenders. */
  def: number;
  /** Midfield line. */
  mid: number;
  /** Attacking line: forwards. */
  atk: number;
  /** How many of the 11 slots are actually filled (0 when empty). */
  filled: number;
}

const EMPTY: TeamOvr = { overall: 0, def: 0, mid: 0, atk: 0, filled: 0 };

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Team strength summary from a set of players, split into the three lines the simulator and the
 * Draft OVR panel both reason about. `def` folds the keeper in with the defenders (they defend
 * together); `mid` and `atk` are the midfield and forward lines. `overall` is the mean of every
 * filled slot, so a half-built XI still shows a meaningful number.
 */
export function computeTeamOvr(players: Player[]): TeamOvr {
  if (players.length === 0) return EMPTY;

  const byLine: Record<BroadPosition, number[]> = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of players) {
    const broad = POSITION_TO_BROAD[p.position] ?? 'MF';
    byLine[broad].push(p.ratings.overall);
  }

  return {
    overall: Math.round(avg(players.map((p) => p.ratings.overall))),
    def: Math.round(avg([...byLine.GK, ...byLine.DF])),
    mid: Math.round(avg(byLine.MF)),
    atk: Math.round(avg(byLine.FW)),
    filled: players.length,
  };
}
