import type { Team, Player, Formation, RealPlayerRecord, ClubSeason, RatingsMode } from '../types';
import { getClub } from './leagues';
import { FORMATION_SLOTS } from './formations';
import { computeTeamOvr, type TeamOvr } from '../engine/teamRatings';
import {
  loadClubSeason, isPositionCompatible, realPlayerToEnginePlayer,
  type ClubSeasonIndexEntry,
} from './historicalData';

/** Opponents are fielded in a stable, sensible shape regardless of the user's own formation. */
const OPPONENT_FORMATION: Formation = '4-3-3';

// Real top-flight sizes, so the user + opponents form a correctly-sized league (and the classic
// 38-game unbeaten run in a 20-team division). If we lack data for enough clubs we simply use
// however many we have; if we have more than needed, the weakest surplus club is dropped.
const LEAGUE_SIZE: Record<string, number> = {
  'premier-league': 20,
  'la-liga': 20,
  'serie-a': 20,
  'bundesliga': 18,
  'ligue-1': 18,
};

export interface LeagueOpponent {
  team: Team;
  players: Player[];
  ovr: TeamOvr;
}

function ratingOf(record: RealPlayerRecord, mode: RatingsMode): number {
  return (mode === 'prime' ? record.primeRatings : record.seasonRatings).overall;
}

/**
 * Picks the strongest realistic XI from a scraped squad: each formation slot is filled by the
 * highest-rated unused player whose broad position fits, falling back to the best remaining player
 * of any position if the squad is short in that line (small/incomplete scrapes).
 */
export function buildBestXI(clubSeason: ClubSeason, mode: RatingsMode): Player[] {
  const slots = FORMATION_SLOTS[OPPONENT_FORMATION];
  const used = new Set<string>();
  const xi: Player[] = [];

  for (const slot of slots) {
    const compatible = clubSeason.squad
      .filter((r) => !used.has(r.id) && isPositionCompatible(r.broadPosition, slot.position))
      .sort((a, b) => ratingOf(b, mode) - ratingOf(a, mode));
    const fallback = clubSeason.squad
      .filter((r) => !used.has(r.id))
      .sort((a, b) => ratingOf(b, mode) - ratingOf(a, mode));
    const pick = compatible[0] ?? fallback[0];
    if (!pick) continue;
    used.add(pick.id);
    xi.push(realPlayerToEnginePlayer(pick, slot.position, mode, clubSeason));
  }
  return xi;
}

/** Most recent available season for a club at or before `seasonMax`, from the loaded index. */
function latestSeasonForClub(entries: ClubSeasonIndexEntry[], clubId: string, seasonMax: string): string | null {
  const maxYear = parseInt(seasonMax.slice(0, 4), 10);
  const seasons = entries
    .filter((e) => e.clubId === clubId && parseInt(e.season.slice(0, 4), 10) <= maxYear)
    .map((e) => e.season)
    .sort();
  return seasons.length ? seasons[seasons.length - 1] : null;
}

/**
 * Builds the pool of real opponent clubs for a league: every club in that league that has scraped
 * data at or before `seasonMax`, fielded from its most recent available season. Excludes the
 * user's own drafted team (they take the extra slot). This is what makes the season a real
 * head-to-head against the league's actual current sides rather than procedural filler.
 */
export async function loadLeagueOpponents(
  leagueId: string,
  seasonMax: string,
  entries: ClubSeasonIndexEntry[],
  mode: RatingsMode,
): Promise<LeagueOpponent[]> {
  const clubIds = Array.from(
    new Set(entries.filter((e) => e.leagueId === leagueId).map((e) => e.clubId)),
  );

  const opponents: LeagueOpponent[] = [];
  for (const clubId of clubIds) {
    const season = latestSeasonForClub(entries, clubId, seasonMax);
    if (!season) continue;
    const clubSeason = await loadClubSeason(leagueId, clubId, season);
    if (!clubSeason) continue;
    const players = buildBestXI(clubSeason, mode);
    if (players.length < 11) continue;

    const club = getClub(clubId);
    const team: Team = {
      id: `opp-${clubId}`,
      name: club?.name ?? clubId,
      shortName: club?.shortName ?? clubId.slice(0, 3).toUpperCase(),
      country: 'INT',
      crest: {
        shape: 'shield',
        primaryColor: club?.colors.primary ?? '#1D2B45',
        secondaryColor: club?.colors.secondary ?? '#FDFAF1',
        icon: club?.crestIcon ?? 'shield',
      },
      colors: { primary: club?.colors.primary ?? '#1D2B45', secondary: club?.colors.secondary ?? '#FDFAF1' },
      squad: players.map((p) => p.id),
      formation: OPPONENT_FORMATION,
      isUserCreated: false,
      isProcedural: false,
    };
    opponents.push({ team, players, ovr: computeTeamOvr(players) });
  }

  // Strongest first, then cap to (real league size − 1) so the user completes the field — a
  // 20-team / 38-game division for the big leagues. Surplus clubs dropped are the weakest.
  opponents.sort((a, b) => b.ovr.overall - a.ovr.overall);
  const cap = (LEAGUE_SIZE[leagueId] ?? 20) - 1;
  return opponents.slice(0, cap);
}
