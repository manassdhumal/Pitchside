import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

interface AppState {
  currentTeamId: string | null;
  currentSeasonId: string | null;
}

type AppAction =
  | { type: 'SET_CURRENT_TEAM'; teamId: string }
  | { type: 'SET_CURRENT_SEASON'; seasonId: string };

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_TEAM':
      return { ...state, currentTeamId: action.teamId, currentSeasonId: null };
    case 'SET_CURRENT_SEASON':
      return { ...state, currentSeasonId: action.seasonId };
    default:
      return state;
  }
}

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { currentTeamId: null, currentSeasonId: null });
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
