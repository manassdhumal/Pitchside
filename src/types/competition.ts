export type CompetitionType =
  | 'league' | 'knockout-cup' | 'league-phase-knockout' | 'group-knockout' | 'two-leg-playoff';

export type Tiebreaker =
  | 'head-to-head' | 'goal-difference' | 'goals-scored' | 'wins' | 'away-goals';

export interface FormatConfig {
  numTeams: number;
  numLegs: 1 | 2;
  groupStage?: { numGroups: number; teamsPerGroup: number; advancePerGroup: number };
  knockoutRounds?: number;
  promotionRelegation?: { promoteCount: number; relegateCount: number; playoffSpots?: number };
  pointsSystem: { win: number; draw: number; loss: number };
}

export interface EraRuleConfig {
  awayGoalsRule: boolean;
  goldenGoal: boolean;
  extraTimeMinutes: number;
  penaltyShootout: boolean;
}

export interface CompetitionTemplate {
  id: string;
  name: string;
  type: CompetitionType;
  format: FormatConfig;
  tiebreakers: Tiebreaker[];
  eraRules: EraRuleConfig;
}
