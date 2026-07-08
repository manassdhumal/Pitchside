import type { Player, EraRuleConfig, FormatConfig } from '../types';
import { generateRoundRobinFixtures } from '../engine/fixtures';
import { simulateLeagueFixtures, buildStandingsTable } from '../engine/competitions';

export interface SimulateLeagueRequest {
  type: 'SIMULATE_LEAGUE';
  competitionId: string;
  teams: { teamId: string; startingXI: Player[] }[];
  doubleRoundRobin: boolean;
  pointsSystem: FormatConfig['pointsSystem'];
  eraRules: EraRuleConfig;
}

export interface SimulateLeagueResponse {
  type: 'LEAGUE_RESULT';
  competitionId: string;
  matches: ReturnType<typeof simulateLeagueFixtures>;
  table: ReturnType<typeof buildStandingsTable>;
}

self.onmessage = (event: MessageEvent<SimulateLeagueRequest>) => {
  const data = event.data;

  if (data.type === 'SIMULATE_LEAGUE') {
    const teamIds = data.teams.map((t) => t.teamId);
    const startingXIByTeam = new Map(data.teams.map((t) => [t.teamId, t.startingXI]));

    const fixtures = generateRoundRobinFixtures(teamIds, data.doubleRoundRobin);
    const matches = simulateLeagueFixtures(fixtures, startingXIByTeam, data.competitionId, data.eraRules);
    const table = buildStandingsTable(matches, teamIds, data.pointsSystem);

    const response: SimulateLeagueResponse = {
      type: 'LEAGUE_RESULT',
      competitionId: data.competitionId,
      matches,
      table,
    };
    self.postMessage(response);
  }
};
