export interface Match {
  id: string;
  competitionId: string;
  round: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  homeXG: number;
  awayXG: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  simulated: boolean;
  extraTime?: boolean;
  penalties?: { home: number; away: number };
}

export interface StandingsRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface BracketNode {
  id: string;
  round: string;
  homeTeamId?: string;
  awayTeamId?: string;
  winnerId?: string;
  matchIds: string[];
}

export interface CompetitionInstance {
  templateId: string;
  teams: string[];
  matches: Match[];
  table?: StandingsRow[];
  bracket?: BracketNode[];
  winner?: string;
}

export interface Season {
  id: string;
  year: number;
  competitionInstances: CompetitionInstance[];
}
