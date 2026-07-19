import type { SeasonSummary } from '../storage/cache';
import type { SeasonStats } from './seasonStats';

export interface CareerScorer {
  name: string;
  goals: number;
  assists: number;
}

/** Whole-career aggregation across every saved season in My Career. */
export interface CareerSummary {
  seasonsPlayed: number;
  /** League titles (finished 1st). */
  titles: number;
  /** Best (lowest) league finish, or null if no finishes recorded. */
  bestFinish: number | null;
  totalPoints: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  /** All-time top scorers, aggregated by player name across seasons. */
  topScorers: CareerScorer[];
}

/** Pull the enriched stats out of a season's denormalized summary, if present. */
function statsOf(s: SeasonSummary): SeasonStats | null {
  const sum = s.summary as { stats?: SeasonStats } | null;
  return sum && typeof sum === 'object' && sum.stats ? sum.stats : null;
}

export function computeCareerSummary(seasons: SeasonSummary[]): CareerSummary {
  let titles = 0;
  let bestFinish: number | null = null;
  let totalPoints = 0;
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  const scorers = new Map<string, CareerScorer>();

  for (const s of seasons) {
    if (s.position === 1) titles += 1;
    if (s.position != null) bestFinish = bestFinish == null ? s.position : Math.min(bestFinish, s.position);
    if (s.points != null) totalPoints += s.points;

    const st = statsOf(s);
    if (st) {
      wins += st.won; draws += st.drawn; losses += st.lost;
      goalsFor += st.goalsFor; goalsAgainst += st.goalsAgainst;
      for (const p of st.players ?? []) {
        const cur = scorers.get(p.name) ?? { name: p.name, goals: 0, assists: 0 };
        cur.goals += p.goals; cur.assists += p.assists;
        scorers.set(p.name, cur);
      }
    }
  }

  const topScorers = [...scorers.values()]
    .filter((s) => s.goals > 0 || s.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name))
    .slice(0, 8);

  return { seasonsPlayed: seasons.length, titles, bestFinish, totalPoints, wins, draws, losses, goalsFor, goalsAgainst, topScorers };
}
