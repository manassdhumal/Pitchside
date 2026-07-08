import type { Player, Position, EraTag } from '../types';
import { generatePlayer } from './playerGenerator';
import { legendsByPosition } from './legends';

export type EraFilter = EraTag | 'all';

const SQUAD_TEMPLATE: Position[] = ['GK', 'GK', 'CB', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'ST', 'ST'];

const LEGEND_PICK_CHANCE = 0.5;

/**
 * Builds a squad by blending curated real legends (filtered by era) with procedural fill,
 * so drafted teams can include historical greats from any decade/continent, not just
 * modern-era procedural players.
 */
export function buildBlendedSquad(eraFilter: EraFilter = 'all', potentialRange: [number, number] = [60, 88]): Player[] {
  const usedLegendIds = new Set<string>();

  return SQUAD_TEMPLATE.map((position) => {
    const candidates = legendsByPosition(position, eraFilter).filter((p) => !usedLegendIds.has(p.id));
    const shouldUseLegend = candidates.length > 0 && Math.random() < LEGEND_PICK_CHANCE;

    if (shouldUseLegend) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      usedLegendIds.add(pick.id);
      return pick;
    }

    return generatePlayer({ position, potentialRange });
  });
}
