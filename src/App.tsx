import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import { AuthProvider, useAuth } from './state/AuthContext';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Draft from './pages/Draft';
import Season from './pages/Season';
import ChampionsLeague from './pages/ChampionsLeague';
import Career from './pages/Career';
import Login from './pages/Login';

/** Gates the game behind a signed-in account: a brief loading state while the session is checked,
 * the login screen when signed out, and the routed app once authenticated. */
function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center" style={{ background: 'var(--paper, #F6EFDF)' }}>
        <img src="/favicon.svg" width={40} height={40} alt="PitchSide" style={{ opacity: 0.7 }} />
      </div>
    );
  }
  if (!user) return <Login />;
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/draft" element={<Draft />} />
          <Route path="/season" element={<Season />} />
          <Route path="/champions-league" element={<ChampionsLeague />} />
          <Route path="/career" element={<Career />} />
        </Routes>
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
