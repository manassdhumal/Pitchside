import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DraftSettings, Difficulty, DraftMode, RatingsMode, Formation } from '../types';
import { FORMATIONS, FORMATION_DESCRIPTIONS } from '../data/formations';
import { LEAGUES } from '../data/leagues';
import { loadIndex, type ClubSeasonIndexEntry } from '../data/historicalData';
import { PitchDiagram } from '../components/pitch/PitchDiagram';

function seasonYear(season: string): number {
  return parseInt(season.slice(0, 4), 10);
}

export default function Setup() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ClubSeasonIndexEntry[] | null>(null);

  const [leagueIds, setLeagueIds] = useState<string[]>(LEAGUES.map((l) => l.id));
  const [formation, setFormation] = useState<Formation>('4-4-2');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [showRatings, setShowRatings] = useState(true);
  const [ratingsMode, setRatingsMode] = useState<RatingsMode>('season');
  const [draftMode, setDraftMode] = useState<DraftMode>('squad-first');
  const [seasonMin, setSeasonMin] = useState<string | null>(null);
  const [seasonMax, setSeasonMax] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [managersEnabled, setManagersEnabled] = useState(true);
  const [transferWindowEnabled, setTransferWindowEnabled] = useState(false);

  useEffect(() => {
    loadIndex().then((e) => setEntries(e));
  }, []);

  const availableSeasons = useMemo(() => {
    if (!entries) return [];
    const set = new Set(entries.map((e) => e.season));
    return Array.from(set).sort((a, b) => seasonYear(a) - seasonYear(b));
  }, [entries]);

  useEffect(() => {
    if (availableSeasons.length > 0 && seasonMin === null) {
      setSeasonMin(availableSeasons[0]);
      setSeasonMax(availableSeasons[availableSeasons.length - 1]);
    }
  }, [availableSeasons, seasonMin]);

  const eligibleCount = useMemo(() => {
    if (!entries || !seasonMin || !seasonMax) return 0;
    const min = seasonYear(seasonMin);
    const max = seasonYear(seasonMax);
    return entries.filter(
      (e) => leagueIds.includes(e.leagueId) && seasonYear(e.season) >= min && seasonYear(e.season) <= max,
    ).length;
  }, [entries, leagueIds, seasonMin, seasonMax]);

  const toggleLeague = (id: string) => {
    setLeagueIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
  };

  const handleStart = () => {
    if (!seasonMin || !seasonMax || leagueIds.length === 0) return;
    const settings: DraftSettings = {
      leagueIds, formation, difficulty, showRatings, ratingsMode,
      seasonMin, seasonMax, draftMode, managersEnabled, transferWindowEnabled,
    };
    navigate('/draft', { state: settings });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-neutral-100">
      <h1 className="text-center text-4xl font-bold">PitchSide</h1>
      <p className="mt-2 text-center text-neutral-400">Draft your greatest all-time XI, from any league you like.</p>

      <section className="mt-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Leagues</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LEAGUES.map((league) => (
            <button
              key={league.id}
              type="button"
              onClick={() => toggleLeague(league.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
                leagueIds.includes(league.id)
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-400'
              }`}
            >
              {league.name}
              <div className="text-xs font-normal text-neutral-500">{league.country}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Formation</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {FORMATIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormation(f)}
              className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                formation === f
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-neutral-400">{FORMATION_DESCRIPTIONS[formation]}</p>
        <div className="mt-3">
          <PitchDiagram formation={formation} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Difficulty</h2>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'easy' as const, label: 'Easy', hint: '3 rerolls available' },
            { value: 'normal' as const, label: 'Normal', hint: '1 reroll available' },
            { value: 'hard' as const, label: 'Hard', hint: 'No rerolls · ratings hidden' },
          ]).map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                difficulty === d.value ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'
              }`}
            >
              <div className="font-semibold">{d.label}</div>
              <div className="text-xs text-neutral-500">{d.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Show Ratings</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setShowRatings(true)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${showRatings ? 'border-purple-500 bg-purple-500/10 text-purple-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}>
              On
            </button>
            <button type="button" onClick={() => setShowRatings(false)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${!showRatings ? 'border-purple-500 bg-purple-500/10 text-purple-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}>
              Off
            </button>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Draft Mode</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setDraftMode('squad-first')} className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${draftMode === 'squad-first' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}>
              Squad First
              <div className="text-xs font-normal text-neutral-500">Spin a club, pick any player</div>
            </button>
            <button type="button" onClick={() => setDraftMode('position-first')} className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${draftMode === 'position-first' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}>
              Position First
              <div className="text-xs font-normal text-neutral-500">Pick a slot, then spin</div>
            </button>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Player Ratings</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRatingsMode('season')} className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${ratingsMode === 'season' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}>
              Season
              <div className="text-xs font-normal text-neutral-500">As they were that season</div>
            </button>
            <button type="button" onClick={() => setRatingsMode('prime')} className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${ratingsMode === 'prime' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}>
              Prime
              <div className="text-xs font-normal text-neutral-500">Career-best estimate</div>
            </button>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Era</h2>
          {availableSeasons.length > 0 && seasonMin && seasonMax ? (
            <div className="flex items-center gap-2 text-sm">
              <select value={seasonMin} onChange={(e) => setSeasonMin(e.target.value)} className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">
                {availableSeasons.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-neutral-500">to</span>
              <select value={seasonMax} onChange={(e) => setSeasonMax(e.target.value)} className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">
                {availableSeasons.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Loading available seasons…</p>
          )}
          <p className="mt-2 text-xs text-neutral-500">{eligibleCount} club-seasons spinnable with the current settings.</p>
        </div>
      </section>

      <section className="mt-8">
        <button type="button" onClick={() => setAdvancedOpen((o) => !o)} className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Advanced {advancedOpen ? '▲' : '▼'}
        </button>
        {advancedOpen && (
          <div className="mt-3 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3">
              <input type="checkbox" checked={managersEnabled} onChange={(e) => setManagersEnabled(e.target.checked)} className="mt-1" />
              <span>
                <span className="font-semibold text-emerald-300">Managers (Gaffers)</span>
                <div className="text-xs text-neutral-400">After the draft, appoint a gaffer for the story. Off = no manager.</div>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-800 bg-amber-950/20 px-4 py-3 opacity-60">
              <input type="checkbox" checked={transferWindowEnabled} onChange={(e) => setTransferWindowEnabled(e.target.checked)} disabled className="mt-1" />
              <span>
                <span className="font-semibold text-amber-300">January Transfer Window</span>
                <div className="text-xs text-neutral-400">Coming soon: gamble on one January event at halfway.</div>
              </span>
            </label>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={handleStart}
        disabled={!seasonMin || eligibleCount === 0}
        className="mt-10 w-full rounded-lg bg-emerald-600 px-4 py-3 text-lg font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        Start Draft →
      </button>
    </div>
  );
}
