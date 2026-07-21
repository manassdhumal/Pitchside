import type { Match, StandingsRow, EraRuleConfig, Player, FormatConfig } from '../types';
import { generateRoundRobinFixtures, type FixturePair } from './fixtures';
import { simulateMatch, NEUTRAL_TACTICS, type TacticalShape } from './matchEngine';

let matchIdCounter = 0;
function nextMatchId(): string {
  matchIdCounter += 1;
  return `match-${Date.now().toString(36)}-${matchIdCounter}`;
}

// Form/momentum: a bounded, mean-reverting multiplier on a team's attacking output that evolves match
// to match — a winning run keeps a side sharp, a bad run dulls them — so results cluster into streaks
// like real football, rather than every game being independent. Centred on 1.0, so it's neutral on
// average (goals/spread are preserved); it just adds realistic autocorrelation.
const FORM_REVERT = 0.7; // pull toward 1.0 each match
const FORM_UP = 1.05;
const FORM_DOWN = 0.95;
const FORM_MIN = 0.9;
const FORM_MAX = 1.1;
function nextForm(current: number, won: boolean, lost: boolean): number {
  let f = 1 + (current - 1) * FORM_REVERT;
  if (won) f *= FORM_UP;
  else if (lost) f *= FORM_DOWN;
  return Math.min(FORM_MAX, Math.max(FORM_MIN, f));
}

export function simulateLeagueFixtures(
  fixtures: FixturePair[],
  startingXIByTeam: Map<string, Player[]>,
  competitionId: string,
  eraRules: EraRuleConfig,
  tacticsByTeam?: Map<string, TacticalShape>,
): Match[] {
  // Play in round order so form carries forward correctly.
  const ordered = [...fixtures].sort((a, b) => a.round - b.round);
  const form = new Map<string, number>();
  return ordered.map((fixture) => {
    const homeXI = startingXIByTeam.get(fixture.homeTeamId) ?? [];
    const awayXI = startingXIByTeam.get(fixture.awayTeamId) ?? [];
    const baseHome = tacticsByTeam?.get(fixture.homeTeamId) ?? NEUTRAL_TACTICS;
    const baseAway = tacticsByTeam?.get(fixture.awayTeamId) ?? NEUTRAL_TACTICS;
    const homeForm = form.get(fixture.homeTeamId) ?? 1;
    const awayForm = form.get(fixture.awayTeamId) ?? 1;
    const homeTactics: TacticalShape = { attack: baseHome.attack * homeForm, concede: baseHome.concede };
    const awayTactics: TacticalShape = { attack: baseAway.attack * awayForm, concede: baseAway.concede };
    const result = simulateMatch(homeXI, awayXI, eraRules, false, homeTactics, awayTactics);

    const homeWon = result.homeGoals > result.awayGoals;
    const awayWon = result.awayGoals > result.homeGoals;
    form.set(fixture.homeTeamId, nextForm(homeForm, homeWon, awayWon));
    form.set(fixture.awayTeamId, nextForm(awayForm, awayWon, homeWon));

    return {
      id: nextMatchId(),
      competitionId,
      round: `Matchday ${fixture.round + 1}`,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeScore: result.homeGoals,
      awayScore: result.awayGoals,
      homeXG: result.xgHome,
      awayXG: result.xgAway,
      homeWinProbability: result.homeWinProbability,
      drawProbability: result.drawProbability,
      awayWinProbability: result.awayWinProbability,
      simulated: true,
      goals: result.goals.map((g) => ({
        minute: g.minute,
        teamId: g.side === 'home' ? fixture.homeTeamId : fixture.awayTeamId,
        scorerId: g.scorerId, scorerName: g.scorerName, assistId: g.assistId, assistName: g.assistName,
      })),
    };
  });
}

export function buildStandingsTable(
  matches: Match[],
  teamIds: string[],
  pointsSystem: FormatConfig['pointsSystem'],
): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();
  for (const teamId of teamIds) {
    rows.set(teamId, { teamId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
  }

  for (const match of matches) {
    if (!match.simulated) continue;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += pointsSystem.win;
      away.lost += 1;
      away.points += pointsSystem.loss;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += pointsSystem.win;
      home.lost += 1;
      home.points += pointsSystem.loss;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += pointsSystem.draw;
      away.points += pointsSystem.draw;
    }
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

export { generateRoundRobinFixtures };
export type { FixturePair };
