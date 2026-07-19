import { describe, it, expect } from 'vitest';
import { agePlayer, ageSquad, ageDelta } from './aging';
import type { Player } from '../types';

function pl(id: string, overall: number, careerAge?: number): Player {
  return {
    id, firstName: 'A', lastName: id, nationality: 'X', retired: false, position: 'CM', era: 'modern',
    ratings: { overall, pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall },
    ratingsHistory: [], isLegend: false, isProcedural: false, careerAge,
  };
}

describe('aging', () => {
  it('follows the career arc: young improve, prime holds, veterans decline', () => {
    expect(ageDelta(20)).toBeGreaterThan(0);
    expect(ageDelta(26)).toBe(0);
    expect(ageDelta(34)).toBeLessThan(0);
  });

  it('advances the working age by one each season', () => {
    const p = agePlayer(pl('p', 80, 24));
    expect(p.careerAge).toBe(25);
  });

  it('assigns a deterministic pseudo-age when none is set', () => {
    const a = agePlayer(pl('same-id', 80));
    const b = agePlayer(pl('same-id', 80));
    expect(a.careerAge).toBe(b.careerAge); // seeded from id → stable
    expect(a.careerAge).toBeGreaterThanOrEqual(21); // 20..32 then +1
  });

  it('declines an old player and keeps ratings in [40,99]', () => {
    const old = agePlayer(pl('vet', 99, 36));
    expect(old.ratings.overall).toBeLessThan(99);
    for (const v of Object.values(old.ratings)) if (typeof v === 'number') { expect(v).toBeGreaterThanOrEqual(40); expect(v).toBeLessThanOrEqual(99); }
  });

  it('ages a whole squad and preserves ids/count', () => {
    const squad = [pl('a', 70, 22), pl('b', 85, 30)];
    const aged = ageSquad(squad);
    expect(aged.map((p) => p.id)).toEqual(['a', 'b']);
    expect(aged[0].ratings.overall).toBeGreaterThanOrEqual(70); // 22yo improves or holds
    expect(aged[1].ratings.overall).toBeLessThan(85); // 30yo declines
  });
});
