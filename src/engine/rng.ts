// Small deterministic PRNG utilities. Used by the Daily Challenge so every player on a given build
// gets the same sequence of club-seasons for the day (the squad data is bundled static JSON, so the
// eligible pool is identical across users), and by anything else that needs reproducible randomness.

/** FNV-1a string hash → uint32 seed. */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32: a seed → a `() => [0,1)` stream. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Local calendar day as YYYY-MM-DD — the Daily Challenge's identity. */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Deterministic seed for a given day, so the daily draw is stable within a day and differs between days. */
export function dailySeed(dayKey = todayKey()): number {
  return hashString(`pitchside-daily-${dayKey}`);
}
