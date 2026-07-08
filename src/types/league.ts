export interface League {
  id: string;
  name: string;
  country: string;
  /** Earliest and latest season this league's data may eventually cover, e.g. '1990-91' to '2025-26'. */
  earliestSeason: string;
  latestSeason: string;
}

export interface RealClub {
  id: string;
  name: string;
  shortName: string;
  leagueId: string;
  /** Base Wikipedia article title used to build/resolve season-article searches, e.g. "Arsenal F.C." */
  wikiTitle: string;
  colors: { primary: string; secondary: string };
  crestIcon: string;
  /** Club-strength tier used by the ratings model: 1 = elite, 2 = strong, 3 = mid-table, 4 = smaller club. */
  tier: 1 | 2 | 3 | 4;
}
