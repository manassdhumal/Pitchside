import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import { AuthProvider, useAuth } from './state/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';

// Home and Login are first-paint, so they stay eager. The rest — including the Recharts-heavy stats
// panels and the sim-heavy Season/CL pages — are code-split so the initial bundle stays small.
const Setup = lazy(() => import('./pages/Setup'));
const Draft = lazy(() => import('./pages/Draft'));
const Season = lazy(() => import('./pages/Season'));
const ChampionsLeague = lazy(() => import('./pages/ChampionsLeague'));
const Career = lazy(() => import('./pages/Career'));

/** Centered brand spinner, reused for the auth check and lazy-route loading. */
function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center" style={{ background: 'var(--paper, #F6EFDF)' }}>
      <img src="/favicon.svg" width={40} height={40} alt="PitchSide" style={{ opacity: 0.7 }} />
    </div>
  );
}

/** Gates the game behind a signed-in account: a brief loading state while the session is checked,
 * the login screen when signed out, and the routed app once authenticated. */
function Gate() {
  const { user, isGuest, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user && !isGuest) return <Login />;
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/draft" element={<Draft />} />
            <Route path="/season" element={<Season />} />
            <Route path="/champions-league" element={<ChampionsLeague />} />
            <Route path="/career" element={<Career />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;
