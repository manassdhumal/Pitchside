import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppContext';
import { getTeam, getPlayers, putSeason } from '../storage/cache';
import { loadIndex, type ClubSeasonIndexEntry } from '../data/historicalData';
import { loadLeagueOpponents } from '../data/leagueOpponents';
import { computeTeamOvr, type TeamOvr } from '../engine/teamRatings';
import { buildStandingsTable, generateRoundRobinFixtures, simulateLeagueFixtures } from '../engine/competitions';
import { getLeague } from '../data/leagues';
import { MANAGERS, getManager, applyManagerToXI } from '../data/managers';
import { ProgrammeNav, ProgrammeFooter } from '../components/chrome/ProgrammeChrome';
import { LEAGUE_INKS, POSITION_INKS } from '../components/chrome/RaffleDrum';
import { POSITION_TO_BROAD } from '../types';
import type { Team, Player, Match, StandingsRow, EraRuleConfig, RatingsMode } from '../types';
import type { LeagueOpponent } from '../data/leagueOpponents';

const NEUTRAL_ERA_RULES: EraRuleConfig = {
  awayGoalsRule: false,
  goldenGoal: false,
  extraTimeMinutes: 0,
  penaltyShootout: false,
};
const POINTS_SYSTEM = { win: 3, draw: 1, loss: 0 };
const COMPETITION_ID = 'league-single-division';
const REVEAL_MS = 950;

const PENNANT_INKS = ['#4A3070', '#A83E2C', '#B4691E', '#2F5D8A', '#3E7A4E', '#6B5F4A', '#7A2E3B'];

interface SeasonNavState {
  leagueIds?: string[];
  seasonMax?: string;
  ratingsMode?: RatingsMode;
  managersEnabled?: boolean;
  transferWindowEnabled?: boolean;
}

function matchdayNumber(round: string): number {
  const n = round.replace(/\D+/g, '');
  return n ? parseInt(n, 10) : 0;
}

function ResultCardPanel({ team, row, position, totalTeams, leagueName }: { team: Team; row: StandingsRow; position: number; totalTeams: number; leagueName: string }) {
  const unbeaten = row.played > 0 && row.lost === 0;
  const perfect = row.played > 0 && row.won === row.played;
  const title = perfect ? `★ PERFECTION · ${row.played}-0 ★` : unbeaten ? '★ THE INVINCIBLES ★' : `№ ${position} OF ${totalTeams}`;

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
    ctx.fillText(`P I T C H S I D E   ·   ${leagueName.toUpperCase()}`, 600, 96);

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
        <div className="text-[10px] tracking-[0.2em]" style={{ color: '#E5C96B' }}>PITCHSIDE · {leagueName.toUpperCase()}</div>
        <div className="font-display my-2 text-[26px] font-extrabold leading-[1.05]">{team.name}</div>
        <div className={`font-stamp text-[13px] ${unbeaten ? 'foil-text' : ''}`} style={unbeaten ? undefined : { color: '#E5C96B' }}>
          {title}
        </div>
      </div>
      <div className="border-l border-dashed pl-5 text-center" style={{ borderColor: 'rgba(246,239,223,.35)' }}>
        <div className="font-stamp text-[38px] leading-none" style={{ color: '#F0DE9A' }}>
          {row.won}–{row.lost}
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
        <div className="foil-card-bg relative overflow-hidden p-2.5">
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
        <div className="p-2.5" style={{ background: '#FDFAF1', border: '1px solid #D8CBAD' }}>{inner}</div>
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

/** Small OVR chip shown beside each club on the centred match card. */
function OvrChip({ ovr, ink }: { ovr: number; ink: string }) {
  return (
    <span
      className="font-stamp inline-block px-1.5 py-0.5 text-[12px] leading-none"
      style={{ background: ink, color: '#FDFAF1', borderRadius: 3 }}
    >
      {ovr}
    </span>
  );
}

export default function Season() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as SeasonNavState | null) ?? {};
  const { currentTeamId } = useAppState();

  const candidateLeagues = navState.leagueIds && navState.leagueIds.length > 0
    ? navState.leagueIds
    : ['premier-league', 'bundesliga', 'la-liga', 'serie-a', 'ligue-1'];
  const seasonMax = navState.seasonMax ?? '2025-26';
  const ratingsMode: RatingsMode = navState.ratingsMode ?? 'season';
  const managersEnabled = navState.managersEnabled ?? false;
  const transferWindowEnabled = navState.transferWindowEnabled ?? false;

  const [managerId, setManagerId] = useState<string | null>(null);

  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [userPlayers, setUserPlayers] = useState<Player[]>([]);
  const [entries, setEntries] = useState<ClubSeasonIndexEntry[] | null>(null);

  const [chosenLeague, setChosenLeague] = useState<string | null>(null);
  const [phase, setPhase] = useState<'league' | 'building' | 'ready' | 'revealing' | 'transfer' | 'done'>('league');
  const [buildError, setBuildError] = useState<string | null>(null);

  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());
  const [ovrByTeam, setOvrByTeam] = useState<Map<string, TeamOvr>>(new Map());
  const [xiByTeam, setXiByTeam] = useState<Map<string, Player[]> | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [table, setTable] = useState<StandingsRow[]>([]);
  const [revealCount, setRevealCount] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Mid-season (January) transfer window state.
  const [userXi, setUserXi] = useState<Player[]>([]); // the user's live XI (manager applied)
  const [market, setMarket] = useState<Player[]>([]); // available signings this window
  const [swapsLeft, setSwapsLeft] = useState(0);
  const opponentsRef = useRef<LeagueOpponent[]>([]);
  const fixturesRef = useRef<ReturnType<typeof generateRoundRobinFixtures>>([]);
  const teamIdsRef = useRef<string[]>([]);
  const halftimeRoundRef = useRef(0); // first fixture round of the second half
  const awaitingTransferRef = useRef(false);

  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setupDone = useRef(false);

  // Load the user's team + squad and the club-season index once.
  useEffect(() => {
    if (!currentTeamId) { navigate('/draft'); return; }
    if (setupDone.current) return;
    setupDone.current = true;
    (async () => {
      const team = await getTeam(currentTeamId);
      if (!team) { navigate('/draft'); return; }
      const players = await getPlayers(team.squad);
      setUserTeam(team);
      setUserPlayers(players.slice(0, 11));
      setEntries(await loadIndex());
    })();
  }, [currentTeamId, navigate]);

  useEffect(() => () => {
    if (tickerRef.current) clearInterval(tickerRef.current);
  }, []);

  const userOvr = useMemo(() => computeTeamOvr(userPlayers), [userPlayers]);
  const userMatches = useMemo(
    () => (userTeam ? matches.filter((m) => m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id) : []),
    [matches, userTeam],
  );

  // Build the chosen league's real opponents, then run the season in the worker.
  const startLeague = async (leagueId: string) => {
    if (!userTeam || !entries) return;
    setChosenLeague(leagueId);
    setPhase('building');
    setBuildError(null);

    const opponents = await loadLeagueOpponents(leagueId, seasonMax, entries, ratingsMode);
    if (opponents.length < 3) {
      setBuildError('Not enough real clubs with data in this league yet — try another league.');
      setPhase('league');
      return;
    }
    opponentsRef.current = opponents;

    const names = new Map<string, string>();
    const ovrs = new Map<string, TeamOvr>();
    const xis = new Map<string, Player[]>();
    names.set(userTeam.id, userTeam.name);
    ovrs.set(userTeam.id, userOvr);
    xis.set(userTeam.id, userPlayers);
    for (const opp of opponents) {
      names.set(opp.team.id, opp.team.name);
      ovrs.set(opp.team.id, opp.ovr);
      xis.set(opp.team.id, opp.players);
    }
    setTeamNames(names);
    setOvrByTeam(ovrs);
    setXiByTeam(xis);
    setPhase('ready');
  };

  // Full opponents-plus-user XI map for a given user XI. The sim runs on the main thread (fast for
  // a ~380-game season) so a mid-season transfer can re-simulate the second half.
  const buildSimXi = (uXi: Player[]): Map<string, Player[]> => {
    const m = new Map<string, Player[]>();
    if (xiByTeam) for (const [id, xi] of xiByTeam) m.set(id, id === userTeam?.id ? uXi : xi);
    return m;
  };
  const saveSeason = (allMatches: Match[], finalTable: StandingsRow[]) => {
    putSeason({
      id: `season-${Date.now()}`,
      year: new Date().getFullYear(),
      competitionInstances: [{ templateId: COMPETITION_ID, teams: teamIdsRef.current, matches: allMatches, table: finalTable }],
    });
  };

  const runSeason = () => {
    if (!userTeam || !xiByTeam) return;
    // The chosen gaffer's tactical shape is baked into the user's XI (only).
    const manager = managersEnabled ? getManager(managerId) : undefined;
    const startXi = applyManagerToXI(userPlayers, manager);
    setUserXi(startXi);
    setOvrByTeam((prev) => new Map(prev).set(userTeam.id, computeTeamOvr(startXi)));

    const teamIds = Array.from(xiByTeam.keys());
    teamIdsRef.current = teamIds;
    const fixtures = generateRoundRobinFixtures(teamIds, true);
    fixturesRef.current = fixtures;

    setPhase('revealing');
    setRevealCount(0);
    setPlaying(true);

    if (transferWindowEnabled) {
      const maxRound = Math.max(...fixtures.map((f) => f.round));
      const half = Math.ceil((maxRound + 1) / 2);
      halftimeRoundRef.current = half;
      const m1 = simulateLeagueFixtures(fixtures.filter((f) => f.round < half), buildSimXi(startXi), COMPETITION_ID, NEUTRAL_ERA_RULES);
      awaitingTransferRef.current = true;
      setMatches(m1);
      setTable(buildStandingsTable(m1, teamIds, POINTS_SYSTEM));
    } else {
      awaitingTransferRef.current = false;
      const all = simulateLeagueFixtures(fixtures, buildSimXi(startXi), COMPETITION_ID, NEUTRAL_ERA_RULES);
      setMatches(all);
      const t = buildStandingsTable(all, teamIds, POINTS_SYSTEM);
      setTable(t);
      saveSeason(all, t);
    }
  };

  // Halftime: open the January window with the strongest league players not already in the XI.
  const openTransferWindow = () => {
    const owned = new Set(userXi.map((p) => p.id));
    const pool = opponentsRef.current
      .flatMap((o) => o.players)
      .filter((p) => !owned.has(p.id))
      .sort((a, b) => b.ratings.overall - a.ratings.overall);
    const seen = new Set<string>();
    const uniquePool = pool.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    setMarket(uniquePool.slice(0, 16));
    setSwapsLeft(2);
    setPlaying(false);
    setPhase('transfer');
  };

  // Swap a market signing in for the user's weakest starter in the same line, keeping the slot.
  const signPlayer = (signing: Player) => {
    if (swapsLeft <= 0) return;
    const broad = POSITION_TO_BROAD[signing.position];
    const candidates = userXi
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => POSITION_TO_BROAD[p.position] === broad)
      .sort((a, b) => a.p.ratings.overall - b.p.ratings.overall);
    if (candidates.length === 0) return;
    const outIdx = candidates[0].i;
    const slot = userXi[outIdx].position;
    setUserXi((prev) => prev.map((p, i) => (i === outIdx ? { ...signing, position: slot } : p)));
    setMarket((prev) => prev.filter((p) => p.id !== signing.id));
    setSwapsLeft((s) => s - 1);
  };

  const resumeAfterTransfer = () => {
    awaitingTransferRef.current = false;
    if (userTeam) setOvrByTeam((prev) => new Map(prev).set(userTeam.id, computeTeamOvr(userXi)));
    const secondFixtures = fixturesRef.current.filter((f) => f.round >= halftimeRoundRef.current);
    const m2 = simulateLeagueFixtures(secondFixtures, buildSimXi(userXi), COMPETITION_ID, NEUTRAL_ERA_RULES);
    const all = [...matches, ...m2];
    const t = buildStandingsTable(all, teamIdsRef.current, POINTS_SYSTEM);
    setMatches(all);
    setTable(t);
    saveSeason(all, t);
    setPhase('revealing');
    setPlaying(true);
  };

  // Auto-advance the reveal one game at a time once results are in.
  useEffect(() => {
    if (phase !== 'revealing' || userMatches.length === 0 || !playing) return;
    tickerRef.current = setInterval(() => {
      setRevealCount((c) => {
        if (c >= userMatches.length) return c;
        return c + 1;
      });
    }, REVEAL_MS);
    return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
  }, [phase, userMatches.length, playing]);

  useEffect(() => {
    if (phase === 'revealing' && userMatches.length > 0 && revealCount >= userMatches.length) {
      if (awaitingTransferRef.current) openTransferWindow();
      else setPhase('done');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealCount, userMatches.length]);

  const skipToEnd = () => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    setRevealCount(userMatches.length);
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

  const leagueName = chosenLeague ? getLeague(chosenLeague)?.name ?? '' : '';
  const totalTeams = xiByTeam ? xiByTeam.size : 0;
  const totalGames = userMatches.length;

  // Live standings up to the last revealed matchday (for the running league position).
  const currentMatch = revealCount > 0 ? userMatches[revealCount - 1] : null;
  const currentMatchday = currentMatch ? matchdayNumber(currentMatch.round) : 0;
  const partialTable = phase === 'revealing' && currentMatchday > 0
    ? buildStandingsTable(matches.filter((m) => matchdayNumber(m.round) <= currentMatchday), Array.from(xiByTeam?.keys() ?? []), POINTS_SYSTEM)
    : table;
  const userRow = (phase === 'done' ? table : partialTable).find((r) => r.teamId === userTeam.id);
  const userPosition = (phase === 'done' ? table : partialTable).findIndex((r) => r.teamId === userTeam.id) + 1;

  // Running record from revealed user games.
  const revealed = userMatches.slice(0, revealCount);
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of revealed) {
    const home = m.homeTeamId === userTeam.id;
    const forGoals = home ? m.homeScore : m.awayScore;
    const agGoals = home ? m.awayScore : m.homeScore;
    gf += forGoals; ga += agGoals;
    if (forGoals > agGoals) w++; else if (forGoals === agGoals) d++; else l++;
  }
  const points = w * 3 + d;

  return (
    <div className="flex min-h-svh flex-col">
      <ProgrammeNav
        left={<Link to="/" className="no-underline hover:text-[var(--brick)]" style={{ color: 'var(--soft)' }}>← Cover</Link>}
      />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 pb-14 pt-9 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-4">
            <span className="font-stamp -rotate-[1.5deg] border-[1.5px] px-2.5 py-1 text-sm" style={{ borderColor: 'var(--brick)', color: 'var(--brick)' }}>
              ACT IV
            </span>
            <h1 className="font-display m-0 text-[42px] font-extrabold sm:text-[52px]" style={{ color: 'var(--ink)' }}>The season</h1>
          </div>
          <div className="text-[13px]" style={{ color: 'var(--soft)' }}>
            {userTeam.name}{leagueName ? ` · ${leagueName}` : ''}{totalGames ? ` · ${totalGames} games` : ''}
          </div>
        </div>

        {/* ============ LEAGUE PICKER ============ */}
        {phase === 'league' && (
          <div className="mt-10 border-[3px] px-6 py-12 sm:px-10" style={{ borderColor: '#1D2B45', borderStyle: 'double', background: '#FDFAF1', boxShadow: '6px 6px 0 var(--card-shadow)' }}>
            <div className="text-center text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6B5F4A' }}>Your XI is signed · Now choose your division</div>
            <div className="font-display my-3 text-center text-[30px] font-extrabold sm:text-[40px]" style={{ color: '#1D2B45' }}>
              Which league do you enter?
            </div>
            <p className="mx-auto mb-8 max-w-[56ch] text-center text-[14px] leading-relaxed" style={{ color: '#3C3325' }}>
              You'll play a full home-and-away season against that league's real current clubs — each fielding their actual squad. Your team OVR of <b style={{ color: '#A83E2C' }}>{userOvr.overall}</b> meets theirs, line by line.
            </p>
            {buildError && <p className="mb-5 text-center text-[13px] font-semibold" style={{ color: '#A83E2C' }}>{buildError}</p>}
            <div className="mx-auto flex max-w-[720px] flex-wrap justify-center gap-3">
              {candidateLeagues.map((lid) => {
                const lg = getLeague(lid);
                const ink = LEAGUE_INKS[lid] ?? '#1D2B45';
                return (
                  <button
                    key={lid}
                    type="button"
                    onClick={() => startLeague(lid)}
                    className="cursor-pointer px-5 py-4 text-left transition-transform hover:-translate-y-0.5"
                    style={{ background: ink, color: '#FDFAF1', boxShadow: '3px 3px 0 var(--card-shadow)', minWidth: 200 }}
                  >
                    <div className="font-display text-[20px] font-extrabold leading-tight">{lg?.name ?? lid}</div>
                    <div className="text-[10.5px] tracking-[0.12em] opacity-85">{lg?.country ?? ''} · ENTER →</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'building' && (
          <div className="mt-10 border border-dashed px-5 py-16 text-center text-sm italic" style={{ borderColor: 'var(--line)', color: 'var(--soft)' }}>
            Assembling {leagueName}'s clubs and their squads…
          </div>
        )}

        {/* ============ READY / KICK OFF ============ */}
        {phase === 'ready' && (
          <div className="mt-10 border-[3px] px-6 py-14 text-center sm:px-10" style={{ borderColor: '#1D2B45', borderStyle: 'double', background: '#FDFAF1', boxShadow: '6px 6px 0 var(--card-shadow)' }}>
            <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6B5F4A' }}>{leagueName} · {totalTeams} clubs · {(totalTeams - 1) * 2} games</div>
            <div className="font-display my-4 text-[34px] font-extrabold sm:text-[44px]" style={{ color: '#1D2B45' }}>
              {userTeam.name} enter the {leagueName}.
              <br />
              <span className="font-medium italic" style={{ color: '#A83E2C' }}>Can you go unbeaten?</span>
            </div>
            {(() => {
              const shownOvr = managersEnabled && managerId
                ? computeTeamOvr(applyManagerToXI(userPlayers, getManager(managerId)))
                : userOvr;
              return (
                <div className="mx-auto mb-7 flex max-w-[420px] justify-center gap-2">
                  {(['overall', 'def', 'mid', 'atk'] as const).map((k) => (
                    <div key={k} className="flex-1 border py-2" style={{ borderColor: '#1D2B45', background: '#FDFAF1' }}>
                      <div className="font-stamp text-[22px]" style={{ color: shownOvr[k] !== userOvr[k] ? '#3E7A4E' : '#1D2B45' }}>{shownOvr[k]}</div>
                      <div className="text-[9px] font-bold tracking-[0.12em]" style={{ color: '#6B5F4A' }}>{k === 'overall' ? 'TEAM OVR' : k.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {managersEnabled && (
              <div className="mx-auto mb-7 max-w-[640px]">
                <div className="mb-2.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: '#A83E2C' }}>Appoint your gaffer</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MANAGERS.map((mgr) => {
                    const sel = managerId === mgr.id;
                    const line = (v: number) => (v > 0 ? `+${v}` : `${v}`);
                    return (
                      <button
                        key={mgr.id}
                        type="button"
                        onClick={() => setManagerId(sel ? null : mgr.id)}
                        className="cursor-pointer border-[1.5px] px-3 py-2.5 text-left transition-transform hover:-translate-y-0.5"
                        style={{ borderColor: sel ? '#A83E2C' : '#D8CBAD', background: sel ? '#F5E9C8' : '#FDFAF1', outline: sel ? '2px solid #A83E2C' : 'none', outlineOffset: 1 }}
                      >
                        <div className="font-display text-[15px] font-extrabold leading-tight" style={{ color: '#1D2B45' }}>{mgr.name}</div>
                        <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: '#6B5F4A' }}>{mgr.style}</div>
                        <div className="mt-1 flex gap-1.5 font-stamp text-[10px]">
                          <span style={{ color: mgr.def >= 0 ? '#3E7A4E' : '#A83E2C' }}>DEF {line(mgr.def)}</span>
                          <span style={{ color: mgr.mid >= 0 ? '#3E7A4E' : '#A83E2C' }}>MID {line(mgr.mid)}</span>
                          <span style={{ color: mgr.atk >= 0 ? '#3E7A4E' : '#A83E2C' }}>ATK {line(mgr.atk)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!managerId && <p className="mt-2 text-[11px] italic" style={{ color: '#6B5F4A' }}>Pick a gaffer, or kick off without one.</p>}
              </div>
            )}

            <button
              type="button"
              onClick={runSeason}
              className="font-stamp foil-bg relative cursor-pointer overflow-hidden px-9 py-4 text-lg tracking-[0.1em] hover:brightness-105"
              style={{ color: '#3B2C08', border: '1.5px solid #8C6A1D' }}
            >
              <span className="sheen-layer pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(105deg,transparent 38%,rgba(255,255,255,.75) 50%,transparent 62%)', backgroundSize: '220% 100%', animation: 'foilSheen 3.2s ease-in-out infinite' }} />
              KICK OFF THE SEASON
            </button>
          </div>
        )}

        {/* ============ MATCH-DAY REVEAL (one game at a time, centred) ============ */}
        {phase === 'revealing' && (
          <div className="mt-8 flex flex-col items-center">
            {currentMatch ? (() => {
              const m = currentMatch;
              const userHome = m.homeTeamId === userTeam.id;
              const oppId = userHome ? m.awayTeamId : m.homeTeamId;
              // Everything is shown from the user's perspective: user always on the left, with an
              // (H)/(A) venue tag, and score/xG/odds flipped so they read user-first left-to-right.
              const forGoals = userHome ? m.homeScore : m.awayScore;
              const agGoals = userHome ? m.awayScore : m.homeScore;
              const userXG = userHome ? m.homeXG : m.awayXG;
              const oppXG = userHome ? m.awayXG : m.homeXG;
              const userWin = Math.round((userHome ? m.homeWinProbability : m.awayWinProbability) * 100);
              const oppWin = Math.round((userHome ? m.awayWinProbability : m.homeWinProbability) * 100);
              const drawP = Math.max(0, 100 - userWin - oppWin);
              const res = forGoals > agGoals ? 'WON' : forGoals === agGoals ? 'DREW' : 'LOST';
              const resInk = res === 'WON' ? '#3E7A4E' : res === 'DREW' ? '#8A7D63' : '#A83E2C';
              const venue = userHome ? 'H' : 'A';
              const leagueInk = chosenLeague ? LEAGUE_INKS[chosenLeague] ?? '#1D2B45' : '#1D2B45';
              const teamCell = (id: string, isUser: boolean, align: 'left' | 'right') => (
                <div className={`flex flex-col gap-1 ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
                  <span className="font-display text-[19px] font-extrabold leading-tight sm:text-[22px]" style={{ color: isUser ? '#A83E2C' : '#1D2B45' }}>
                    {isUser && '★ '}{teamNames.get(id)}
                  </span>
                  <OvrChip ovr={ovrByTeam.get(id)?.overall ?? 0} ink={isUser ? '#A83E2C' : leagueInk} />
                </div>
              );
              return (
                <div
                  key={m.id}
                  className="w-full max-w-[620px]"
                  style={{ background: '#FDFAF1', border: '1px solid #D8CBAD', boxShadow: '6px 6px 0 var(--card-shadow)', animation: 'ticketOut .35s cubic-bezier(.2,1.1,.4,1)' }}
                >
                  <div className="flex items-center justify-between px-4 py-2" style={{ background: leagueInk, color: '#FDFAF1' }}>
                    <span className="font-stamp text-[12px] tracking-[0.1em]">
                      MATCHDAY {currentMatchday}
                      <span className="ml-2 rounded-sm px-1.5 py-px text-[11px]" style={{ background: '#FDFAF1', color: leagueInk }}>({venue})</span>
                    </span>
                    <span className="text-[10px] tracking-[0.14em] opacity-85">{revealCount} / {totalGames}</span>
                  </div>
                  <div className="grid items-center gap-3 px-5 py-7" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
                    {teamCell(userTeam.id, true, 'left')}
                    <div className="flex flex-col items-center">
                      <span className="font-stamp text-[40px] leading-none" style={{ color: '#1D2B45' }}>{forGoals}–{agGoals}</span>
                      <span className="mt-1 text-[10.5px]" style={{ color: '#3C3325' }}>xG {userXG.toFixed(1)}–{oppXG.toFixed(1)}</span>
                    </div>
                    {teamCell(oppId, false, 'right')}
                  </div>
                  <div className="px-5 pb-3">
                    <span className="flex h-2.5 border" style={{ borderColor: '#1D2B45' }}>
                      <span style={{ width: `${userWin}%`, background: '#3E7A4E' }} />
                      <span style={{ width: `${drawP}%`, background: '#D8CBAD' }} />
                      <span style={{ width: `${oppWin}%`, background: '#A83E2C' }} />
                    </span>
                    <div className="mt-1 flex justify-between text-[9.5px]" style={{ color: '#6B5F4A' }}>
                      <span>YOU {userWin}%</span>
                      <span>DRAW {drawP}%</span>
                      <span>{oppWin}% {teamNames.get(oppId)?.slice(0, 14)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center border-t py-2.5" style={{ borderColor: '#EDE3CB' }}>
                    <span className="font-stamp px-3 py-1 text-[14px]" style={{ background: resInk, color: '#FDFAF1', borderRadius: 3 }}>
                      {userTeam.name.toUpperCase()} {res} · {userHome ? 'HOME' : 'AWAY'}
                    </span>
                  </div>
                </div>
              );
            })() : (
              <div className="w-full max-w-[620px] px-5 py-16 text-center text-sm italic" style={{ background: '#FDFAF1', border: '1px solid #D8CBAD', color: '#6B5F4A' }}>
                The teleprinter is warming up…
              </div>
            )}

            {/* running record + controls */}
            <div className="mt-5 flex w-full max-w-[620px] flex-wrap items-center justify-between gap-3 border px-4 py-3" style={{ borderColor: '#D8CBAD', background: '#FDFAF1' }}>
              <div className="flex items-center gap-4 text-[13px]" style={{ color: '#1D2B45' }}>
                <span className="font-stamp text-[15px]">{w}W–{d}D–{l}L</span>
                <span style={{ color: '#6B5F4A' }}>GD {gf - ga > 0 ? '+' : ''}{gf - ga}</span>
                <span className="font-stamp" style={{ color: '#A83E2C' }}>{points} PTS</span>
                {userPosition > 0 && <span className="border px-2 py-0.5 text-[11px]" style={{ borderColor: '#C7A63E', color: '#8C6A1D' }}>{userPosition}{userPosition === 1 ? 'ST' : userPosition === 2 ? 'ND' : userPosition === 3 ? 'RD' : 'TH'}</span>}
                {l === 0 && revealCount > 0 && <span className="font-stamp text-[11px]" style={{ color: '#3E7A4E' }}>UNBEATEN</span>}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPlaying((p) => !p)} className="cursor-pointer border px-3 py-1.5 text-[12px] font-bold uppercase" style={{ borderColor: '#1D2B45', color: '#1D2B45' }}>
                  {playing ? '❚❚ Pause' : '▶ Play'}
                </button>
                <button type="button" onClick={() => setRevealCount((c) => Math.min(userMatches.length, c + 1))} className="cursor-pointer border px-3 py-1.5 text-[12px] font-bold uppercase" style={{ borderColor: '#1D2B45', color: '#1D2B45' }}>
                  Next ▸
                </button>
                <button type="button" onClick={skipToEnd} className="cursor-pointer border-0 px-3 py-1.5 text-[12px] font-bold uppercase" style={{ background: '#A83E2C', color: '#FDFAF1' }}>
                  Skip ⏭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ JANUARY TRANSFER WINDOW ============ */}
        {phase === 'transfer' && (
          <div className="mt-8">
            <div className="border-[3px] px-5 py-6 sm:px-8" style={{ borderColor: '#1D2B45', borderStyle: 'double', background: '#FDFAF1', boxShadow: '6px 6px 0 var(--card-shadow)' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6B5F4A' }}>Halfway · the window is open</div>
                  <div className="font-display text-[28px] font-extrabold sm:text-[34px]" style={{ color: '#1D2B45' }}>January transfer window</div>
                </div>
                <div className="font-stamp text-[15px]" style={{ color: swapsLeft > 0 ? '#A83E2C' : '#6B5F4A' }}>{swapsLeft} signing{swapsLeft === 1 ? '' : 's'} left</div>
              </div>
              <p className="mt-1 mb-4 text-[12.5px]" style={{ color: '#3C3325' }}>
                Sign a player and they replace your weakest starter in that line for the second half. Skip if you're happy with your XI.
              </p>
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.14em]" style={{ color: '#A83E2C' }}>Your XI</div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {userXi.map((p, i) => (
                      <div key={`${p.id}-${i}`} className="flex items-center gap-2 border-b py-1" style={{ borderColor: '#EDE3CB' }}>
                        <span className="font-stamp w-9 py-0.5 text-center text-[9px]" style={{ background: POSITION_INKS[POSITION_TO_BROAD[p.position]], color: '#F6EFDF' }}>{p.position}</span>
                        <span className="font-jersey min-w-0 flex-1 truncate text-[13px] font-semibold uppercase" style={{ color: '#1D2B45' }}>{p.lastName || p.firstName}</span>
                        <span className="font-stamp text-[13px]" style={{ color: '#1D2B45' }}>{p.ratings.overall}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.14em]" style={{ color: '#A83E2C' }}>The market · top available</div>
                  <div className="max-h-[320px] overflow-y-auto pr-1">
                    {market.map((p) => {
                      const canSign = swapsLeft > 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={!canSign}
                          onClick={() => signPlayer(p)}
                          className="grid w-full items-center gap-2 border-b px-1 py-1.5 text-left hover:bg-[#F5E9C8] disabled:cursor-not-allowed disabled:opacity-45"
                          style={{ gridTemplateColumns: '36px 1fr auto auto', borderColor: '#EDE3CB', cursor: canSign ? 'pointer' : 'not-allowed' }}
                        >
                          <span className="font-stamp py-0.5 text-center text-[9px]" style={{ background: POSITION_INKS[POSITION_TO_BROAD[p.position]], color: '#F6EFDF' }}>{p.position}</span>
                          <span className="font-jersey min-w-0 truncate text-[13px] font-semibold uppercase" style={{ color: '#1D2B45' }}>{p.lastName || p.firstName}</span>
                          <span className="text-[10.5px]" style={{ color: '#6B5F4A' }}>{p.nationality}</span>
                          <span className="font-stamp text-[14px]" style={{ color: p.ratings.overall >= 85 ? '#8C6A1D' : '#A83E2C' }}>{p.ratings.overall}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={resumeAfterTransfer}
                  className="font-stamp cursor-pointer border-0 px-8 py-3.5 text-[15px] uppercase tracking-[0.08em]"
                  style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)', boxShadow: '4px 4px 0 var(--btn-shadow)' }}
                >
                  Continue the season →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ FINAL TABLE + RESULT ============ */}
        {phase === 'done' && (
          <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col gap-5">
              {userRow && <ResultCardPanel team={userTeam} row={userRow} position={userPosition} totalTeams={table.length} leagueName={leagueName} />}
            </div>
            <section style={{ background: '#FDFAF1', border: '1px solid #D8CBAD', boxShadow: '5px 5px 0 var(--card-shadow)' }}>
              <div className="flex items-center justify-between border-b-[3px] px-4 py-3.5" style={{ borderColor: '#1D2B45', borderBottomStyle: 'double' }}>
                <span className="font-display text-[19px] font-bold" style={{ color: '#1D2B45' }}>Final table</span>
                <span className="text-[11px] tracking-[0.12em]" style={{ color: '#6B5F4A' }}>{leagueName.toUpperCase()}</span>
              </div>
              <div className="grid items-center gap-x-1.5 border-b-[1.5px] px-3.5 pb-1.5 pt-2 text-[10.5px] tracking-[0.08em]" style={{ gridTemplateColumns: '26px 22px minmax(0,1fr) 30px 30px 30px 38px 42px', color: '#6B5F4A', borderColor: '#1D2B45' }}>
                <span>#</span><span /><span>CLUB</span>
                <span className="text-center">W</span><span className="text-center">D</span><span className="text-center">L</span>
                <span className="text-center">GD</span><span className="text-right">PTS</span>
              </div>
              {table.map((row, index) => {
                const you = row.teamId === userTeam.id;
                return (
                  <div key={row.teamId} className="grid items-center gap-x-1.5 border-b px-3.5 py-2" style={{ gridTemplateColumns: '26px 22px minmax(0,1fr) 30px 30px 30px 38px 42px', borderBottomColor: '#EDE3CB', background: you ? 'linear-gradient(90deg,#F5E9C8,#FDFAF1)' : 'transparent', borderLeft: `4px solid ${you ? '#C7A63E' : 'transparent'}` }}>
                    <span className="font-stamp text-[13px]" style={{ color: you ? '#1D2B45' : '#6B5F4A' }}>{index + 1}</span>
                    <span className="inline-block h-[19px] w-4" style={{ background: you ? '#1D2B45' : PENNANT_INKS[index % PENNANT_INKS.length], clipPath: 'polygon(0 0,100% 0,100% 68%,50% 100%,0 68%)' }} />
                    <span className="truncate text-[13px]" style={{ fontWeight: you ? 800 : 400, color: '#1D2B45' }}>
                      {teamNames.get(row.teamId) ?? row.teamId}
                      {you && <span className="font-stamp ml-1 text-[10px]" style={{ color: '#8C6A1D' }}>★ YOU</span>}
                    </span>
                    <span className="text-center text-[12.5px]" style={{ color: '#3C3325' }}>{row.won}</span>
                    <span className="text-center text-[12.5px]" style={{ color: '#3C3325' }}>{row.drawn}</span>
                    <span className="text-center text-[12.5px]" style={{ color: '#3C3325' }}>{row.lost}</span>
                    <span className="text-center text-[12.5px]" style={{ color: '#3C3325' }}>{row.goalsFor - row.goalsAgainst > 0 ? '+' : ''}{row.goalsFor - row.goalsAgainst}</span>
                    <span className="font-stamp text-right text-sm" style={{ color: '#1D2B45' }}>{row.points}</span>
                  </div>
                );
              })}
            </section>
          </div>
        )}
      </main>
      <ProgrammeFooter />
    </div>
  );
}
