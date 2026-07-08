import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Draft from './pages/Draft';
import Season from './pages/Season';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-neutral-950">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/draft" element={<Draft />} />
              <Route path="/season" element={<Season />} />
            </Routes>
          </div>
          <footer className="border-t border-neutral-800 px-4 py-4 text-center text-xs text-neutral-500">
            PitchSide is an independent fan-made football draft and season simulator. It is not affiliated with,
            endorsed by, licensed by, or otherwise associated with any football club, competition, league, player
            association, or governing body. All club names, player names, and season data are used for
            informational and editorial purposes only; ratings are PitchSide's own independent estimates, not
            sourced from any official or proprietary database. No official logos, crests, or player likenesses are
            used. Squad data is sourced from Wikipedia (CC BY-SA).
          </footer>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
