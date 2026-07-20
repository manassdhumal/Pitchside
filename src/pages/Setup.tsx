import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DraftSettings, Difficulty, DraftMode, RatingsMode, Formation } from '../types';
import { FORMATIONS, FORMATION_SLOTS, FORMATION_DESCRIPTIONS } from '../data/formations';
import { LEAGUES } from '../data/leagues';
import { loadIndex, type ClubSeasonIndexEntry } from '../data/historicalData';
import { ProgrammeNav, ProgrammeFooter } from '../components/chrome/ProgrammeChrome';
import { LEAGUE_INKS } from '../components/chrome/RaffleDrum';

function seasonYear(season: string): number {
  return parseInt(season.slice(0, 4), 10);
}

const FORMATION_TAGS: Record<Formation, string> = {
  '4-3-3': 'BALANCED',
  '4-4-2': 'CLASSIC',
  '4-2-3-1': 'MODERN',
  '4-5-1': 'MIDFIELD WALL',
  '3-4-3': 'BRAVE',
  '3-5-2': 'WING-BACKS',
  '5-4-1': 'BUS PARKED',
  '4-1-2-1-2': 'DIAMOND',
  '4-4-1-1': 'SHADOW 10',
  '5-3-2': 'SOLID',
  '3-4-1-2': 'TEN BEHIND TWO',
  '4-2-2-2': 'DOUBLE PIVOT',
};

const DIFFICULTIES: { value: Difficulty; name: string; desc: string }[] = [
  { value: 'easy', name: 'EASY', desc: '3 re-rolls of the drum' },
  { value: 'normal', name: 'NORMAL', desc: '1 re-roll' },
  { value: 'hard', name: 'HARD', desc: 'No re-rolls · ratings hidden' },
];

function CardSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border p-6" style={{ background: '#FDFAF1', borderColor: '#D8CBAD' }}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="font-display m-0 text-[22px] font-bold" style={{ color: '#1D2B45' }}>{title}</h2>
        {hint && <span className="text-[11.5px]" style={{ color: '#6B5F4A' }}>{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Knob({ on, onClick, disabled, label }: { on: boolean; onClick?: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="relative h-7 w-[52px] cursor-pointer border-[1.5px] p-0 disabled:cursor-not-allowed"
      style={{
        borderColor: disabled ? '#A99A78' : on ? '#1D2B45' : '#A99A78',
        background: disabled ? '#EDE3CB' : on ? '#1D2B45' : '#EDE3CB',
      }}
    >
      <span
        aria-hidden="true"
        className="font-stamp absolute top-0.5 grid h-5 w-5 place-items-center text-[8px] transition-[left] duration-150"
        style={{
          left: on ? 26 : 2,
          background: on ? '#F6EFDF' : '#6B5F4A',
          color: on ? '#1D2B45' : '#F6EFDF',
        }}
      >
        {on ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex border-[1.5px]" style={{ borderColor: '#1D2B45' }}>
      {options.map((opt, i) => (
        <button
          key={opt.v}
          type="button"
          onClick={() => onChange(opt.v)}
          className="cursor-pointer border-0 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.05em]"
          style={{
            borderLeft: i > 0 ? '1.5px solid #1D2B45' : undefined,
            background: value === opt.v ? '#1D2B45' : 'transparent',
            color: value === opt.v ? '#F6EFDF' : '#1D2B45',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Setup() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ClubSeasonIndexEntry[] | null>(null);

  const [leagueIds, setLeagueIds] = useState<string[]>(LEAGUES.map((l) => l.id));
  const [formation, setFormation] = useState<Formation>('4-3-3');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [showRatings, setShowRatings] = useState(true);
  const [ratingsMode, setRatingsMode] = useState<RatingsMode>('season');
  const [draftMode, setDraftMode] = useState<DraftMode>('squad-first');
  const [seasonMin, setSeasonMin] = useState<string | null>(null);
  const [seasonMax, setSeasonMax] = useState<string | null>(null);
  const [managersEnabled, setManagersEnabled] = useState(true);
  const [transferWindowEnabled, setTransferWindowEnabled] = useState(false);

  useEffect(() => {
    loadIndex().then(setEntries);
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
    if (!seasonMin || !seasonMax || leagueIds.length === 0 || eligibleCount === 0) return;
    const settings: DraftSettings = {
      leagueIds, formation, difficulty,
      showRatings: difficulty === 'hard' ? false : showRatings,
      ratingsMode, seasonMin, seasonMax, draftMode,
      managersEnabled, transferWindowEnabled,
    };
    navigate('/draft', { state: settings });
  };

  const slots = FORMATION_SLOTS[formation];
  const summaryLeagues = leagueIds.length === LEAGUES.length ? 'All five leagues' : `${leagueIds.length} league${leagueIds.length === 1 ? '' : 's'}`;

  return (
    <div className="flex min-h-svh flex-col">
      <ProgrammeNav
        left={
          <Link to="/" className="no-underline hover:text-[var(--brick)]" style={{ color: 'var(--soft)' }}>
            ← Cover
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-[1220px] flex-1 px-5 pb-14 pt-10 sm:px-10">
        <div className="flex flex-wrap items-baseline gap-4">
          <span
            className="font-stamp -rotate-[1.5deg] border-[1.5px] px-2.5 py-1 text-sm"
            style={{ borderColor: 'var(--brick)', color: 'var(--brick)' }}
          >
            ACT I
          </span>
          <h1 className="font-display m-0 text-[42px] font-extrabold sm:text-[52px]" style={{ color: 'var(--ink)' }}>
            Set the fixture
          </h1>
          <span className="text-sm" style={{ color: 'var(--soft)' }}>Choose your leagues, shape and stakes.</span>
        </div>

        <div className="mt-9 grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-7">
            <CardSection title="Leagues in the drum" hint="pick at least one">
              <div className="flex flex-wrap gap-2.5">
                {LEAGUES.map((league) => {
                  const on = leagueIds.includes(league.id);
                  return (
                    <button
                      key={league.id}
                      type="button"
                      onClick={() => toggleLeague(league.id)}
                      className="flex cursor-pointer items-center gap-2.5 border-[1.5px] px-3.5 py-2.5 text-[13px] font-bold tracking-[0.03em] hover:border-[#1D2B45]"
                      style={{
                        borderColor: on ? '#1D2B45' : '#A99A78',
                        background: on ? '#1D2B45' : 'transparent',
                        color: on ? '#F6EFDF' : '#3C3325',
                      }}
                    >
                      <span
                        className="inline-block h-5 w-[17px]"
                        style={{
                          background: LEAGUE_INKS[league.id],
                          clipPath: 'polygon(0 0,100% 0,100% 68%,50% 100%,0 68%)',
                        }}
                      />
                      {league.name}
                      <span className="font-stamp text-[10px]">{on ? '✓' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </CardSection>

            <CardSection title="Formation" hint="live preview on the team sheet →">
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))' }}>
                {FORMATIONS.map((f) => {
                  const on = formation === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormation(f)}
                      className="font-stamp cursor-pointer border-[1.5px] px-1.5 pb-2.5 pt-3 text-center text-[15px] hover:border-[#1D2B45]"
                      style={{
                        borderColor: on ? '#1D2B45' : '#A99A78',
                        background: on ? '#1D2B45' : 'transparent',
                        color: on ? '#F6EFDF' : '#1D2B45',
                      }}
                    >
                      {f}
                      <span
                        className="mt-1 block font-sans text-[9px] tracking-[0.1em]"
                        style={{ color: on ? 'rgba(246,239,223,.75)' : '#6B5F4A' }}
                      >
                        {FORMATION_TAGS[f]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[12.5px]" style={{ color: '#6B5F4A' }}>{FORMATION_DESCRIPTIONS[formation]}</p>
            </CardSection>

            <div className="grid gap-7 md:grid-cols-2">
              <CardSection title="Difficulty">
                <div className="flex flex-col gap-2">
                  {DIFFICULTIES.map((d) => {
                    const on = difficulty === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDifficulty(d.value)}
                        className="flex cursor-pointer items-center justify-between gap-3 border-[1.5px] px-3.5 py-3 text-left hover:border-[#1D2B45]"
                        style={{ borderColor: on ? '#1D2B45' : '#A99A78', background: on ? '#F5E9C8' : 'transparent' }}
                      >
                        <span>
                          <span className="font-stamp text-[13px]" style={{ color: '#1D2B45' }}>{d.name}</span>
                          <span className="mt-0.5 block text-[11.5px]" style={{ color: '#6B5F4A' }}>{d.desc}</span>
                        </span>
                        <span className="font-stamp text-[11px]" style={{ color: '#1D2B45' }}>{on ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-dashed pt-3.5" style={{ borderColor: '#C9B98F' }}>
                  <span className="text-[13px] font-bold" style={{ color: '#3C3325' }}>Show ratings</span>
                  <Knob
                    label="Show player ratings"
                    on={difficulty === 'hard' ? false : showRatings}
                    onClick={() => setShowRatings((r) => !r)}
                    disabled={difficulty === 'hard'}
                  />
                </div>
                <p className="mt-2.5 text-[11.5px] leading-relaxed" style={{ color: '#6B5F4A' }}>
                  {difficulty === 'hard'
                    ? 'Hard mode plays blind — ratings stay hidden.'
                    : showRatings
                      ? 'Overall ratings print on every sticker.'
                      : 'Blind mode: only appearances and goals guide your picks.'}
                </p>
              </CardSection>

              <CardSection title="Draft mode">
                <Segmented
                  value={draftMode}
                  options={[
                    { v: 'squad-first' as DraftMode, label: 'Squad first' },
                    { v: 'position-first' as DraftMode, label: 'Position first' },
                  ]}
                  onChange={setDraftMode}
                />
                <p className="mb-5 mt-2.5 text-[11.5px] leading-relaxed" style={{ color: '#6B5F4A' }}>
                  {draftMode === 'squad-first'
                    ? 'Spin, then pick any player from the drawn squad — his slot options light up.'
                    : 'Lock a slot first, then spin — only players for that position show.'}
                </p>
                <h2 className="font-display m-0 mb-3 text-[22px] font-bold" style={{ color: '#1D2B45' }}>Ratings mode</h2>
                <Segmented
                  value={ratingsMode}
                  options={[
                    { v: 'season' as RatingsMode, label: 'That season' },
                    { v: 'prime' as RatingsMode, label: 'Career prime' },
                  ]}
                  onChange={setRatingsMode}
                />
                <p className="mt-2.5 text-[11.5px] leading-relaxed" style={{ color: '#6B5F4A' }}>
                  {ratingsMode === 'season'
                    ? 'Players rated exactly as they were in the drawn season.'
                    : 'Every player arrives at their career-best level.'}
                </p>
                <div className="mt-4 border-t border-dashed pt-4" style={{ borderColor: '#C9B98F' }}>
                  <div className="mb-2.5 text-[11px] uppercase tracking-[0.14em]" style={{ color: '#A83E2C' }}>Advanced</div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[13px] font-semibold" style={{ color: '#3C3325' }}>Managers</span>
                    <Knob label="Managers" on={managersEnabled} onClick={() => setManagersEnabled((m) => !m)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold" style={{ color: '#3C3325' }}>
                      January transfer window
                    </span>
                    <Knob label="January transfer window" on={transferWindowEnabled} onClick={() => setTransferWindowEnabled((t) => !t)} />
                  </div>
                </div>
              </CardSection>
            </div>

            <CardSection
              title="Era range"
              hint={seasonMin && seasonMax ? `${seasonMin} — ${seasonMax}` : 'loading…'}
            >
              {availableSeasons.length > 0 && seasonMin && seasonMax ? (
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-[11.5px]" style={{ color: '#6B5F4A' }}>
                    FROM
                    <select
                      value={seasonMin}
                      onChange={(e) => setSeasonMin(e.target.value)}
                      className="border px-2 py-2 text-sm"
                      style={{ borderColor: '#A99A78', background: '#F6EFDF', color: '#1D2B45' }}
                    >
                      {availableSeasons.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-[11.5px]" style={{ color: '#6B5F4A' }}>
                    TO
                    <select
                      value={seasonMax}
                      onChange={(e) => setSeasonMax(e.target.value)}
                      className="border px-2 py-2 text-sm"
                      style={{ borderColor: '#A99A78', background: '#F6EFDF', color: '#1D2B45' }}
                    >
                      {availableSeasons.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#6B5F4A' }}>Loading available seasons…</p>
              )}
              <div
                className="mt-3.5 flex items-baseline gap-2.5 border border-dashed px-4 py-3"
                style={{ borderColor: '#C9B98F', background: '#F6EFDF' }}
              >
                <span className="font-stamp text-2xl" style={{ color: '#1D2B45' }}>{eligibleCount}</span>
                <span className="text-[13px]" style={{ color: '#3C3325' }}>club-seasons in the drum with this setup</span>
              </div>
            </CardSection>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <div
              className="border p-5"
              style={{ background: '#FDFAF1', borderColor: '#D8CBAD', boxShadow: '5px 5px 0 var(--card-shadow)' }}
            >
              <div
                className="mb-4 flex items-baseline justify-between border-b-[3px] pb-2.5"
                style={{ borderColor: '#1D2B45', borderBottomStyle: 'double' }}
              >
                <span className="font-display text-[19px] font-bold" style={{ color: '#1D2B45' }}>Team sheet</span>
                <span className="font-stamp text-sm" style={{ color: '#A83E2C' }}>{formation}</span>
              </div>
              <div
                className="relative w-full"
                style={{
                  aspectRatio: '3/4',
                  background: 'repeating-linear-gradient(0deg,#5E9468 0 12.5%,#548A5E 12.5% 25%)',
                  border: '5px solid #EDE3CB',
                  boxSizing: 'border-box',
                }}
              >
                <div className="absolute" style={{ inset: 10, border: '1.5px solid rgba(253,250,241,.7)' }} />
                <div className="absolute left-2.5 right-2.5 top-1/2" style={{ borderTop: '1.5px solid rgba(253,250,241,.7)' }} />
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ width: '26%', aspectRatio: '1', border: '1.5px solid rgba(253,250,241,.7)' }}
                />
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className="font-stamp absolute grid h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[10px] transition-all duration-300"
                    style={{
                      left: `${slot.x}%`,
                      top: `${(slot.y * 0.82) + 6}%`,
                      background: '#FDFAF1',
                      border: '2px solid #1D2B45',
                      color: '#1D2B45',
                      boxShadow: '0 2px 0 rgba(29,43,69,.35)',
                    }}
                  >
                    {slot.position}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[11.5px]" style={{ color: '#6B5F4A' }}>
                <span>{summaryLeagues}</span>
                <span>{DIFFICULTIES.find((d) => d.value === difficulty)?.name}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStart}
              disabled={!seasonMin || eligibleCount === 0}
              className="flex cursor-pointer items-center justify-between gap-4 border-0 px-5 py-4 text-base font-bold uppercase tracking-[0.06em] transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)', boxShadow: '5px 5px 0 var(--btn-shadow)' }}
            >
              Start the draft
              <span className="font-stamp border-l-[1.5px] border-dashed pl-4 text-sm" style={{ borderColor: 'var(--btn-divider)' }}>
                →
              </span>
            </button>
          </div>
        </div>
      </main>
      <ProgrammeFooter />
    </div>
  );
}
