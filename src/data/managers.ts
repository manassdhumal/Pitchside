import type { Player } from '../types';
import { POSITION_TO_BROAD } from '../types';

/**
 * A gaffer (manager) applies a tactical shape to the drafted XI: small per-line rating deltas that
 * flow straight through the match engine (they touch the same shooting/passing/defending/overall
 * values `weightedAttackRating`/`weightedDefenceRating` and the OVR tilt already read). Each is a
 * deliberate trade-off, so picking a gaffer is a real decision rather than a flat buff.
 */
export interface Manager {
  id: string;
  name: string;
  style: string;
  blurb: string;
  /** Rating deltas applied to the defence line (GK+DF), midfield (MF) and attack (FW). */
  def: number;
  mid: number;
  atk: number;
}

export const MANAGERS: Manager[] = [
  { id: 'maestro', name: 'Il Maestro', style: 'Possession', blurb: 'Patient build-up; the midfield runs the game.', def: 0, mid: 3, atk: 1 },
  { id: 'sentinel', name: 'The Sentinel', style: 'Low block', blurb: 'Concede nothing; grind out 1–0s.', def: 4, mid: 1, atk: -1 },
  { id: 'throttle', name: 'Full Throttle', style: 'Gegenpress', blurb: 'Suffocating high press, chaos up top.', def: -2, mid: 1, atk: 4 },
  { id: 'equilibrium', name: 'The Equilibrium', style: 'Balanced', blurb: 'No weak link — solid in every third.', def: 1, mid: 2, atk: 1 },
  { id: 'alchemist', name: 'The Alchemist', style: 'Man-management', blurb: 'Gets a little more out of everyone.', def: 1, mid: 1, atk: 2 },
  { id: 'catenaccio', name: 'Catenaccio', style: 'Counter', blurb: 'Absorb, then strike on the break.', def: 3, mid: -1, atk: 2 },
];

export function getManager(id: string | null | undefined): Manager | undefined {
  return id ? MANAGERS.find((m) => m.id === id) : undefined;
}

const clamp = (v: number) => Math.min(99, Math.max(1, Math.round(v)));

/** Returns a copy of the XI with the manager's per-line deltas applied to each player's ratings. */
export function applyManagerToXI(xi: Player[], manager: Manager | undefined): Player[] {
  if (!manager) return xi;
  return xi.map((p) => {
    const broad = POSITION_TO_BROAD[p.position] ?? 'MF';
    const delta = broad === 'GK' || broad === 'DF' ? manager.def : broad === 'MF' ? manager.mid : manager.atk;
    if (!delta) return p;
    const r = p.ratings;
    return {
      ...p,
      ratings: {
        ...r,
        overall: clamp(r.overall + delta),
        shooting: clamp(r.shooting + (broad === 'FW' || broad === 'MF' ? delta : 0)),
        dribbling: clamp(r.dribbling + delta * 0.5),
        passing: clamp(r.passing + (broad === 'MF' ? delta : 0)),
        defending: clamp(r.defending + (broad === 'GK' || broad === 'DF' ? delta : 0)),
        goalkeeping: r.goalkeeping !== undefined ? clamp(r.goalkeeping + (broad === 'GK' ? delta : 0)) : undefined,
      },
    };
  });
}
