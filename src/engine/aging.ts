import type { Player, PlayerRatings } from '../types';
import { hashString } from './rng';

// Career-mode aging. The scraped data has no real dates of birth, so each player gets a deterministic
// pseudo-age (seeded from their id) the first time they're aged, then advances one year per season.
// Ratings drift up while young, hold through the prime, and decline afterwards — with pace/dribbling
// falling off fastest and physicality holding longest, the usual shape of a real career.

/** Seeded starting age in [20, 32] so a squad has a believable spread of youth and veterans. */
function pseudoAge(id: string): number {
  return 20 + (hashString(`${id}:age`) % 13);
}

/** Overall rating delta for a given age — the career arc. */
export function ageDelta(age: number): number {
  if (age <= 21) return 2;
  if (age <= 23) return 1;
  if (age <= 27) return 0;
  if (age <= 29) return -1;
  if (age <= 31) return -2;
  if (age <= 33) return -3;
  return -4;
}

const clamp = (v: number) => Math.max(40, Math.min(99, Math.round(v)));

/** Age a single player one season: assign/advance the working age and shift ratings along the curve. */
export function agePlayer(p: Player): Player {
  const age = p.careerAge ?? pseudoAge(p.id);
  const d = ageDelta(age);
  const physPenalty = age >= 30 ? 1 : 0; // athleticism erodes first
  const r = p.ratings;
  const ratings: PlayerRatings = {
    ...r,
    overall: clamp(r.overall + d),
    shooting: clamp(r.shooting + d),
    // Passing/vision hold up better than the rest — decline at most 1/season.
    passing: clamp(r.passing + Math.max(d, -1)),
    dribbling: clamp(r.dribbling + d - physPenalty),
    pace: clamp(r.pace + d - physPenalty),
    defending: clamp(r.defending + d),
    // Physicality/strength is the last to go and can even nudge up for a young pro.
    physical: clamp(r.physical + Math.max(d, age <= 27 ? 1 : -1)),
    goalkeeping: r.goalkeeping != null ? clamp(r.goalkeeping + d) : r.goalkeeping,
  };
  return { ...p, careerAge: age + 1, ratings };
}

/** Age a whole squad one season. */
export function ageSquad(players: Player[]): Player[] {
  return players.map(agePlayer);
}
