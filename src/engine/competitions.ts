import type { Match, StandingsRow, EraRuleConfig, Player, FormatConfig } from '../types';
import { generateRoundRobinFixtures, type FixturePair } from './fixtures';
import { simulateMatch } from './matchEngine';

let matchIdCounter = 0;
function nextMatchId(): string {
  matchIdCounter += 1;
  return `match-${Date.now().toString(36)}-${matchIdCounter}`;
}

export function simulateLeagueFixtures(
  fixtures: FixturePair[],
  startingXIByTeam: Map<string, Player[]>,
  competitionId: string,
  eraRules: EraRuleConfig,
): Match[] {
  return fixtures.map((fixture) => {
    const homeXI = startingXIByTeam.get(fixture.homeTeamId) ?? [];
    const awayXI = startingXIByTeam.get(fixture.awayTeamId) ?? [];
    const result = simulateMatch(homeXI, awayXI, eraRules, false);

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
