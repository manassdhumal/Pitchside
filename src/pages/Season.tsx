import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppContext';
import { getTeam, getPlayers, putSeason, putTeam, putPlayers } from '../storage/cache';
import { generateOpponentTeams } from '../data/teamGenerator';
import { ProgrammeNav, ProgrammeFooter } from '../components/chrome/ProgrammeChrome';
import type { Team, Player, Match, StandingsRow, EraRuleConfig } from '../types';
import type { SimulateLeagueRequest, SimulateLeagueResponse } from '../workers/simWorker';

const NEUTRAL_ERA_RULES: EraRuleConfig = {
  awayGoalsRule: false,
  goldenGoal: false,
  extraTimeMinutes: 0,
  penaltyShootout: false,
};
const POINTS_SYSTEM = { win: 3, draw: 1, loss: 0 };
const COMPETITION_ID = 'league-single-division';
const TICKER_MS = 150;

const PENNANT_INKS = ['#4A3070', '#A83E2C', '#B4691E', '#2F5D8A', '#3E7A4E', '#6B5F4A', '#7A2E3B'];

function ResultCardPanel({ team, row, position, totalTeams }: { team: Team; row: StandingsRow; position: number; totalTeams: number }) {
  const unbeaten = row.played > 0 && row.lost === 0;
  const perfect = row.played > 0 && row.won === row.played;
  const title = perfect ? '★ PERFECTION · 38-0 ★' : unbeaten ? '★ THE INVINCIBLES ★' : `№ ${position} OF ${totalTeams}`;

  const download = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = unbeaten ? '#1D2B45' : '#FDFAF1';
    ctx.fillRect(0, 0, 1200, 630);
    if (unbeaten) {
      ctx.strokeStyle = '#C7A63E';
      ctx.lineWidth = 10;
      ctx.strokeRect(18, 18, 1164, 594);
    } else {
      ctx.strokeStyle = '#1D2B45';
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, 1168, 598);
      ctx.strokeRect(30, 30, 1140, 570);
    }

    const ink = unbeaten ? '#F6EFDF' : '#1D2B45';
    const gold = unbeaten ? '#F0DE9A' : '#A83E2C';
    ctx.textAlign = 'center';
    ctx.fillStyle = unbeaten ? '#E5C96B' : '#6B5F4A';
    ctx.font = '600 24px Archivo, sans-serif';
    ctx.fillText('P I T C H S I D E   ·   S E A S O N   R E S U L T', 600, 96);

    ctx.fillStyle = ink;
    ctx.font = '800 76px "Bodoni Moda", serif';
    ctx.fillText(team.name, 600, 200);

    ctx.fillStyle = gold;
    ctx.font = '54px Graduate, serif';
    ctx.fillText(title, 600, 300);

    ctx.fillStyle = ink;
    ctx.font = '64px Graduate, serif';
    ctx.fillText(`${row.won}W · ${row.drawn}D · ${row.lost}L`, 600, 420);

    ctx.fillStyle = unbeaten ? 'rgba(246,239,223,.85)' : '#3C3325';
    ctx.font = '600 30px Archivo, sans-serif';
    ctx.fillText(
      `${row.played} played · ${row.points} points · finished ${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'}`,
      600,
      480,
    );

    ctx.fillStyle = unbeaten ? 'rgba(246,239,223,.5)' : '#6B5F4A';
    ctx.font = '18px Archivo, sans-serif';
    ctx.fillText('Fan-made game · not affiliated with any league, club or player', 600, 580);

    const link = document.createElement('a');
    link.download = `${team.name.replace(/\s+/g, '-').toLowerCase()}-season.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const inner = (
    <div className="relative flex items-center gap-5 px-6 py-6" style={{ background: '#1D2B45', color: '#F6EFDF' }}>
      <div className="flex-1">
        <div className="text-[10px] tracking-[0.2em]" style={{ color: '#E5C96B' }}>PITCHSIDE · SEASON RESULT</div>
        <div className="font-display my-2 text-[26px] font-extrabold leading-[1.05]">{team.name}</div>
        <div className={`font-stamp text-[13px] ${unbeaten ? 'foil-text' : ''}`} style={unbeaten ? undefined : { color: '#E5C96B' }}>
          {title}
        </div>
      </div>
      <div className="border-l border-dashed pl-5 text-center" style={{ borderColor: 'rgba(246,239,223,.35)' }}>
        <div className="font-stamp text-[38px] leading-none" style={{ color: '#F0DE9A' }}>
          {row.played}–{row.lost}
        </div>
        <div className="mt-1.5 text-[10.5px] tracking-[0.12em]" style={{ color: 'rgba(246,239,223,.8)' }}>
          {row.won}W · {row.drawn}D · {row.lost}L · {row.points} PTS
        </div>
        <div
          className="font-stamp mt-2 inline-block border px-2 py-1 text-[11px]"
          style={{ borderColor: '#E5C96B', color: '#E5C96B' }}
        >
          {position}{position === 1 ? 'ST' : position === 2 ? 'ND' : position === 3 ? 'RD' : 'TH'} PLACE
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ animation: 'stampInStatic .5s cubic-bezier(.2,1.2,.4,1)' }}>
      {unbeaten ? (
        <div className="foil-card-bg sticker-mask-lg relative overflow-hidden p-2.5">
          <div
            className="sheen-layer pointer-events-none absolute inset-0 z-[2] w-[55%]"
            style={{
              background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,.75) 50%,transparent 60%)',
              animation: 'foilCardSheen 4s ease-in-out infinite',
            }}
          />
          <div className="relative">{inner}</div>
        </div>
      ) : (
        <div className="sticker-mask-lg p-2.5" style={{ background: '#FDFAF1', border: '1px solid #D8CBAD' }}>{inner}</div>
      )}
      <div className="mt-3 flex gap-2.5">
        <button
          type="button"
          onClick={download}
          className="flex-1 cursor-pointer border-0 px-3 py-3 text-[13px] font-bold uppercase tracking-[0.06em]"
          style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)', boxShadow: '3px 3px 0 var(--btn-shadow)' }}
        >
          ↓ Download card
        </button>
        <Link
          to="/setup"
          className="border-[1.5px] px-4 py-3 text-center text-[13px] font-bold uppercase tracking-[0.06em] no-underline"
          style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}
        >
          Replay
        </Link>
      </div>
    </div>
  );
}

export default function Season() {
  const navigate = useNavigate();
  const { currentTeamId } = useAppState();

  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());
  const [startingXIByTeam, setStartingXIByTeam] = useState<Map<string, Player[]> | null>(null);
  const [phase, setPhase] = useState<'pre' | 'running' | 'done'>('pre');
  const [matches, setMatches] = useState<Match[]>([]);
  const [table, setTable] = useState<StandingsRow[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setupDone = useRef(false);

  useEffect(() => {
    if (!currentTeamId) {
      navigate('/draft');
      return;
    }
    if (setupDone.current) return;
    setupDone.current = true;

    (async () => {
      const team = await getTeam(currentTeamId);
      if (!team) {
        navigate('/draft');
        return;
      }
      const userPlayers = await getPlayers(team.squad);

      const opponents = generateOpponentTeams(19, [55, 85]);
      await Promise.all(
        opponents.map(async ({ team: t, players }) => {
          await putPlayers(players);
          await putTeam(t);
        }),
      );

      const names = new Map<string, string>();
      names.set(team.id, team.name);
      for (const { team: t } of opponents) names.set(t.id, t.name);

      const xiMap = new Map<string, Player[]>();
      xiMap.set(team.id, userPlayers.slice(0, 11));
      for (const { team: t, players } of opponents) {
        xiMap.set(t.id, players.slice(0, 11));
      }

      setUserTeam(team);
      setTeamNames(names);
      setStartingXIByTeam(xiMap);
    })();
  }, [currentTeamId, navigate]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    if (tickerRef.current) clearInterval(tickerRef.current);
  }, []);

  const userMatches = useMemo(
    () => (userTeam ? matches.filter((m) => m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id) : []),
    [matches, userTeam],
  );

  const handleSimulate = () => {
    if (!userTeam || !startingXIByTeam) return;
    setPhase('running');

    const worker = new Worker(new URL('../workers/simWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<SimulateLeagueResponse>) => {
      const { matches: resultMatches, table: resultTable } = event.data;
      setMatches(resultMatches);
      setTable(resultTable);
      worker.terminate();

      putSeason({
        id: `season-${Date.now()}`,
        year: new Date().getFullYear(),
        competitionInstances: [
          {
            templateId: COMPETITION_ID,
            teams: Array.from(startingXIByTeam.keys()),
            matches: resultMatches,
            table: resultTable,
          },
        ],
      });

      // The wire: print the user's results one by one.
      let count = 0;
      tickerRef.current = setInterval(() => {
        count += 1;
        setRevealedCount(count);
        if (count >= 38) {
          if (tickerRef.current) clearInterval(tickerRef.current);
          setPhase('done');
        }
      }, TICKER_MS);
    };

    const request: SimulateLeagueRequest = {
      type: 'SIMULATE_LEAGUE',
      competitionId: COMPETITION_ID,
      teams: Array.from(startingXIByTeam.entries()).map(([teamId, startingXI]) => ({ teamId, startingXI })),
      doubleRoundRobin: true,
      pointsSystem: POINTS_SYSTEM,
      eraRules: NEUTRAL_ERA_RULES,
    };
    worker.postMessage(request);
  };

  if (!userTeam) {
    return (
      <div className="flex min-h-svh flex-col">
        <ProgrammeNav />
        <div className="flex-1 px-4 py-10 text-center" style={{ color: 'var(--soft)' }}>Preparing the fixture list…</div>
        <ProgrammeFooter />
      </div>
    );
  }

  const userRow = table.find((r) => r.teamId === userTeam.id);
  const userPosition = table.findIndex((r) => r.teamId === userTeam.id) + 1;
  const revealed = userMatches.slice(0, revealedCount);

  return (
    <div className="flex min-h-svh flex-col">
      <ProgrammeNav
        left={
          <Link to="/" className="no-underline hover:text-[var(--brick)]" style={{ color: 'var(--soft)' }}>
            ← Cover
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 pb-14 pt-9 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-4">
            <span
              className="font-stamp -rotate-[1.5deg] border-[1.5px] px-2.5 py-1 text-sm"
              style={{ borderColor: 'var(--brick)', color: 'var(--brick)' }}
            >
              ACT IV
            </span>
            <h1 className="font-display m-0 text-[42px] font-extrabold sm:text-[52px]" style={{ color: 'var(--ink)' }}>
              The season
            </h1>
          </div>
          <div className="text-[13px]" style={{ color: 'var(--soft)' }}>
            {userTeam.name} · 38 fixtures · Division One
          </div>
        </div>

        {phase === 'pre' && (
          <div
            className="mt-10 border-[3px] px-6 py-14 text-center sm:px-10"
            style={{
              borderColor: '#1D2B45',
              borderStyle: 'double',
              background: '#FDFAF1',
              boxShadow: '6px 6px 0 var(--card-shadow)',
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6B5F4A' }}>
              The album is full · The whistle is in the referee's hand
            </div>
            <div className="font-display my-4 text-[34px] font-extrabold sm:text-[44px]" style={{ color: '#1D2B45' }}>
              Thirty-eight games.
              <br />
              <span className="font-medium italic" style={{ color: '#A83E2C' }}>Zero defeats?</span>
            </div>
            <p className="mx-auto mb-7 max-w-[52ch] text-[15px] leading-relaxed" style={{ color: '#3C3325' }}>
              Every result prints with its xG and win odds. Only one club a season keeps the page unbeaten.
            </p>
            <button
              type="button"
              onClick={handleSimulate}
              disabled={!startingXIByTeam}
              className="font-stamp foil-bg relative cursor-pointer overflow-hidden px-9 py-4 text-lg tracking-[0.1em] hover:brightness-105 disabled:opacity-60"
              style={{ color: '#3B2C08', border: '1.5px solid #8C6A1D' }}
            >
              <span
                className="sheen-layer pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(105deg,transparent 38%,rgba(255,255,255,.75) 50%,transparent 62%)',
                  backgroundSize: '220% 100%',
                  animation: 'foilSheen 3.2s ease-in-out infinite',
                }}
              />
              SIMULATE THE SEASON
            </button>
          </div>
        )}

        {phase !== 'pre' && (
          <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1.25fr_1fr]">
            {/* The wire */}
            <section style={{ background: '#FDFAF1', border: '1px solid #D8CBAD', boxShadow: '5px 5px 0 var(--card-shadow)' }}>
              <div
                className="flex items-center justify-between border-b-[3px] px-5 py-3.5"
                style={{ borderColor: '#1D2B45', borderBottomStyle: 'double' }}
              >
                <span className="font-display text-[19px] font-bold" style={{ color: '#1D2B45' }}>
                  The wire — results as they land
                </span>
                <span className="font-stamp text-[13px]" style={{ color: '#A83E2C' }}>{revealed.length} / 38</span>
              </div>
              <div className="flex max-h-[560px] flex-col-reverse overflow-y-auto">
                {revealed.map((m) => {
                  const home = m.homeTeamId === userTeam.id;
                  const gf = home ? m.homeScore : m.awayScore;
                  const ga = home ? m.awayScore : m.homeScore;
                  const oppName = teamNames.get(home ? m.awayTeamId : m.homeTeamId) ?? '—';
                  const pip = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
                  const pipBg = pip === 'W' ? '#3E7A4E' : pip === 'D' ? '#8A7D63' : '#A83E2C';
                  const w = Math.round((home ? m.homeWinProbability : m.awayWinProbability) * 100);
                  const l = Math.round((home ? m.awayWinProbability : m.homeWinProbability) * 100);
                  const d = Math.max(0, 100 - w - l);
                  const mw = m.round.replace(/\D+/g, '');
                  return (
                    <div
                      key={m.id}
                      className="grid items-center gap-2.5 border-b px-4 py-2.5"
                      style={{
                        gridTemplateColumns: '48px 24px minmax(0,1fr) 52px 86px 140px',
                        borderBottomColor: '#EDE3CB',
                        animation: 'printIn .25s ease-out',
                      }}
                    >
                      <span
                        className="font-stamp border px-1 py-0.5 text-center text-[10px]"
                        style={{ color: '#6B5F4A', borderColor: '#D8CBAD' }}
                      >
                        MW {mw}
                      </span>
                      <span
                        className="font-stamp inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px]"
                        style={{ background: pipBg, color: '#FDFAF1' }}
                      >
                        {pip}
                      </span>
                      <span className="truncate text-[13.5px] font-bold" style={{ color: '#1D2B45' }}>
                        {oppName}
                        <span
                          className="ml-1 border px-1 text-[10px] font-semibold"
                          style={{ color: '#6B5F4A', borderColor: '#D8CBAD' }}
                        >
                          {home ? 'HOME' : 'AWAY'}
                        </span>
                      </span>
                      <span className="font-stamp text-center text-[17px]" style={{ color: '#1D2B45' }}>
                        {gf}–{ga}
                      </span>
                      <span className="text-[11.5px]" style={{ color: '#3C3325' }}>
                        xG <b>{(home ? m.homeXG : m.awayXG).toFixed(1)}</b>–{(home ? m.awayXG : m.homeXG).toFixed(1)}
                      </span>
                      <span className="flex flex-col gap-[3px]">
                        <span className="flex h-2 border" style={{ borderColor: '#1D2B45' }}>
                          <span style={{ width: `${w}%`, background: '#3E7A4E' }} />
                          <span style={{ width: `${d}%`, background: '#D8CBAD' }} />
                          <span style={{ width: `${l}%`, background: '#A83E2C' }} />
                        </span>
                        <span className="flex justify-between text-[9.5px]" style={{ color: '#6B5F4A' }}>
                          <span>W {w}%</span>
                          <span>D {d}%</span>
                          <span>L {l}%</span>
                        </span>
                      </span>
                    </div>
                  );
                })}
                {revealed.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm italic" style={{ color: '#6B5F4A' }}>
                    The teleprinter is warming up…
                  </div>
                )}
              </div>
            </section>

            {/* right rail */}
            <div className="flex flex-col gap-5">
              {phase === 'done' && userRow && (
                <ResultCardPanel team={userTeam} row={userRow} position={userPosition} totalTeams={table.length} />
              )}

              {phase === 'done' && (
                <section style={{ background: '#FDFAF1', border: '1px solid #D8CBAD', boxShadow: '5px 5px 0 var(--card-shadow)' }}>
                  <div
                    className="flex items-center justify-between border-b-[3px] px-4 py-3.5"
                    style={{ borderColor: '#1D2B45', borderBottomStyle: 'double' }}
                  >
                    <span className="font-display text-[19px] font-bold" style={{ color: '#1D2B45' }}>Final table</span>
                    <span className="text-[11px] tracking-[0.12em]" style={{ color: '#6B5F4A' }}>DIVISION ONE</span>
                  </div>
                  <div
                    className="grid items-center gap-x-1.5 border-b-[1.5px] px-3.5 pb-1.5 pt-2 text-[10.5px] tracking-[0.08em]"
                    style={{
                      gridTemplateColumns: '26px 22px minmax(0,1fr) 30px 30px 30px 38px 42px',
                      color: '#6B5F4A',
                      borderColor: '#1D2B45',
                    }}
                  >
                    <span>#</span><span /><span>CLUB</span>
                    <span className="text-center">W</span><span className="text-center">D</span><span className="text-center">L</span>
                    <span className="text-center">GD</span><span className="text-right">PTS</span>
                  </div>
                  {table.map((row, index) => {
                    const you = row.teamId === userTeam.id;
                    return (
                      <div
                        key={row.teamId}
                        className="grid items-center gap-x-1.5 border-b px-3.5 py-2"
                        style={{
                          gridTemplateColumns: '26px 22px minmax(0,1fr) 30px 30px 30px 38px 42px',
                          borderBottomColor: '#EDE3CB',
                          background: you ? 'linear-gradient(90deg,#F5E9C8,#FDFAF1)' : 'transparent',
                          borderLeft: `4px solid ${you ? '#C7A63E' : 'transparent'}`,
                        }}
                      >
                        <span className="font-stamp text-[13px]" style={{ color: you ? '#1D2B45' : '#6B5F4A' }}>{index + 1}</span>
                        <span
                          className="inline-block h-[19px] w-4"
                          style={{
                            background: you ? '#1D2B45' : PENNANT_INKS[index % PENNANT_INKS.length],
                            clipPath: 'polygon(0 0,100% 0,100% 68%,50% 100%,0 68%)',
                          }}
                        />
                        <span className="truncate text-[13px]" style={{ fontWeight: you ? 800 : 400, color: '#1D2B45' }}>
                          {teamNames.get(row.teamId) ?? row.teamId}
                          {you && <span className="font-stamp ml-1 text-[10px]" style={{ color: '#8C6A1D' }}>★ YOU</span>}
                        </span>
                        <span className="text-center text-[12.5px]" style={{ color: '#3C3325' }}>{row.won}</span>
                        <span className="text-center text-[12.5px]" style={{ color: '#3C3325' }}>{row.drawn}</span>
                        <span className="text-center text-[12.5px]" style={{ color: '#3C3325' }}>{row.lost}</span>
                        <span className="text-center text-[12.5px]" style={{ color: '#3C3325' }}>
                          {row.goalsFor - row.goalsAgainst > 0 ? '+' : ''}{row.goalsFor - row.goalsAgainst}
                        </span>
                        <span className="font-stamp text-right text-sm" style={{ color: '#1D2B45' }}>{row.points}</span>
                      </div>
                    );
                  })}
                </section>
              )}

              {phase === 'running' && (
                <div
                  className="border border-dashed px-5 py-8 text-center text-sm italic"
                  style={{ borderColor: 'var(--line)', color: 'var(--soft)' }}
                >
                  The table settles when the final whistle goes…
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <ProgrammeFooter />
    </div>
  );
}
