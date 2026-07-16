import type { Player } from '../types';
import { POSITION_TO_BROAD } from '../types';
import { NEUTRAL_TACTICS, type TacticalShape } from '../engine/matchEngine';

/**
 * A gaffer (manager) shapes the drafted XI two ways, so picking one is a real, trade-off decision:
 *  1. per-line rating deltas (def/mid/atk) baked into the XI via `applyManagerToXI` — these flow
 *     through the same shooting/passing/defending/overall values the OVR tilt already reads; and
 *  2. a tactical `shape` (attack/concede match-model multipliers, see `TacticalShape`) that bends the
 *     match tempo itself — a low block grinds out 1-0s, a gegenpress makes every game a shoot-out —
 *     applied to the user's matches (league + cup) in the simulator.
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
  /** Match-model multipliers (own goals / goals conceded) — the tactical tempo of the side. */
  shape: TacticalShape;
  /** Short human-readable trade-off for the picker, e.g. "+ Goals / + Chaos at the back". */
  tradeoff: string;
}

export const MANAGERS: Manager[] = [
  { id: 'maestro', name: 'Il Maestro', style: 'Possession', blurb: 'Patient build-up; the midfield runs the game.', def: 0, mid: 3, atk: 1, shape: { attack: 1.05, concede: 0.95 }, tradeoff: 'Control both ends' },
  { id: 'sentinel', name: 'The Sentinel', style: 'Low block', blurb: 'Concede nothing; grind out 1–0s.', def: 4, mid: 1, atk: -1, shape: { attack: 0.85, concede: 0.78 }, tradeoff: 'Few conceded, few scored' },
  { id: 'throttle', name: 'Full Throttle', style: 'Gegenpress', blurb: 'Suffocating high press, chaos up top.', def: -2, mid: 1, atk: 4, shape: { attack: 1.16, concede: 1.14 }, tradeoff: 'High-scoring, leaky' },
  { id: 'equilibrium', name: 'The Equilibrium', style: 'Balanced', blurb: 'No weak link — solid in every third.', def: 1, mid: 2, atk: 1, shape: { attack: 1.0, concede: 1.0 }, tradeoff: 'Even, no tempo swing' },
  { id: 'alchemist', name: 'The Alchemist', style: 'Man-management', blurb: 'Gets a little more out of everyone.', def: 1, mid: 1, atk: 2, shape: { attack: 1.06, concede: 0.99 }, tradeoff: 'A lift all round' },
  { id: 'catenaccio', name: 'Catenaccio', style: 'Counter', blurb: 'Absorb, then strike on the break.', def: 3, mid: -1, atk: 2, shape: { attack: 1.04, concede: 0.82 }, tradeoff: 'Rock at the back, sharp counters' },
];

export function getManager(id: string | null | undefined): Manager | undefined {
  return id ? MANAGERS.find((m) => m.id === id) : undefined;
}

/** The tactical shape to apply in the simulator for a manager (neutral when there is none). */
export function managerTactics(manager: Manager | undefined): TacticalShape {
  return manager?.shape ?? NEUTRAL_TACTICS;
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
