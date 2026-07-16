import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Draft from './pages/Draft';
import Season from './pages/Season';
import ChampionsLeague from './pages/ChampionsLeague';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/draft" element={<Draft />} />
          <Route path="/season" element={<Season />} />
          <Route path="/champions-league" element={<ChampionsLeague />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
