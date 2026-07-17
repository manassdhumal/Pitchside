import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

interface AppState {
  currentTeamId: string | null;
  currentSeasonId: string | null;
  /** The gaffer appointed for this drafted team — shared by every competition (league, cup, UCL) so
   * the same manager applies everywhere and survives navigating between them. Lives here, alongside
   * the team it belongs to: a fresh draft clears it, just like the team. */
  managerId: string | null;
}

type AppAction =
  | { type: 'SET_CURRENT_TEAM'; teamId: string }
  | { type: 'SET_CURRENT_SEASON'; seasonId: string }
  | { type: 'SET_MANAGER'; managerId: string | null };

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_TEAM':
      // A newly drafted team starts without a gaffer.
      return { ...state, currentTeamId: action.teamId, currentSeasonId: null, managerId: null };
    case 'SET_CURRENT_SEASON':
      return { ...state, currentSeasonId: action.seasonId };
    case 'SET_MANAGER':
      return { ...state, managerId: action.managerId };
    default:
      return state;
  }
}

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { currentTeamId: null, currentSeasonId: null, managerId: null });
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
