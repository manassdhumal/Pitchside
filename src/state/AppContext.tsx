import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Match, StandingsRow, Player } from '../types';

/** One competition's run from the user's side: their matches (with goal events) and how it ended. */
export interface CompetitionRun {
  matches: Match[];
  /** How the user's run ended, e.g. "Winners", "Semi-final", "9th (league phase)". */
  exit: string;
  champion?: string;
}

/**
 * The whole season campaign for the drafted team, held in app state so it survives navigating between
 * the Season page and the (separately-routed) Champions League — both write into it, and the Season
 * end page renders league + cup + CL together from it.
 */
export interface Campaign {
  teamId: string;
  teamName: string;
  leagueId: string;
  leagueName: string;
  leaguePosition: number;
  table: StandingsRow[];
  teamNames: [string, string][]; // serialisable id→name
  ovrs: [string, number][]; // serialisable id→ovr
  xi: Player[]; // the user's XI, for per-player stats
  league: Match[]; // the user's league matches
  cup?: CompetitionRun;
  cl?: CompetitionRun;
}

interface AppState {
  currentTeamId: string | null;
  currentSeasonId: string | null;
  /** The gaffer appointed for this drafted team — shared by every competition (league, cup, UCL) so
   * the same manager applies everywhere and survives navigating between them. Lives here, alongside
   * the team it belongs to: a fresh draft clears it, just like the team. */
  managerId: string | null;
  /** The current team's accumulating campaign (league + cup + CL), or null before a season is played. */
  campaign: Campaign | null;
}

type AppAction =
  | { type: 'SET_CURRENT_TEAM'; teamId: string }
  | { type: 'SET_CURRENT_SEASON'; seasonId: string }
  | { type: 'SET_MANAGER'; managerId: string | null }
  | { type: 'SET_CAMPAIGN'; campaign: Campaign }
  | { type: 'SET_CAMPAIGN_CUP'; cup: CompetitionRun }
  | { type: 'SET_CAMPAIGN_CL'; cl: CompetitionRun };

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_TEAM':
      // A newly drafted team starts without a gaffer or a campaign.
      return { ...state, currentTeamId: action.teamId, currentSeasonId: null, managerId: null, campaign: null };
    case 'SET_CURRENT_SEASON':
      return { ...state, currentSeasonId: action.seasonId };
    case 'SET_MANAGER':
      return { ...state, managerId: action.managerId };
    case 'SET_CAMPAIGN':
      return { ...state, campaign: action.campaign };
    case 'SET_CAMPAIGN_CUP':
      return state.campaign ? { ...state, campaign: { ...state.campaign, cup: action.cup } } : state;
    case 'SET_CAMPAIGN_CL':
      return state.campaign ? { ...state, campaign: { ...state.campaign, cl: action.cl } } : state;
    default:
      return state;
  }
}

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { currentTeamId: null, currentSeasonId: null, managerId: null, campaign: null });
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const ctx = useContext(AppDispatchContext);
  if (!ctx) throw new Error('useAppDispatch must be used within AppProvider');
  return ctx;
}
