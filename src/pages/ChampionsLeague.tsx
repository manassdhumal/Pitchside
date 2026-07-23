import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppContext';
import { getTeam, getPlayers } from '../storage/cache';
import { loadIndex } from '../data/historicalData';
import { loadEuropeanField } from '../data/leagueOpponents';
import { simulateLeaguePhase, simulatePlayoffRound, MATCHES_PER_TEAM, type LeaguePhaseResult, type PlayoffTie } from '../engine/leaguePhase';
import { simulateCup, type CupResult } from '../engine/cup';
import { getManager, applyManagerToXI, managerTactics } from '../data/managers';
import type { TacticalShape } from '../engine/matchEngine';
import { computeTeamOvr } from '../engine/teamRatings';
import { CupBracket } from '../components/CupBracket';
import { KnockoutTieCard, RevealControls } from '../components/KnockoutReveal';
import { ProgrammeNav, ProgrammeFooter } from '../components/chrome/ProgrammeChrome';
import type { Team, Player, RatingsMode, StandingsRow } from '../types';

// The modern (2024+) format: a single 36-team league phase, then a knockout.
const FIELD_SIZE = 36;
const ALL_LEAGUES = ['premier-league', 'bundesliga', 'la-liga', 'serie-a', 'ligue-1'];
const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const GREEN = '#3E7A4E';
const AMBER = '#B4691E';
const LINE = '#D8CBAD';

/** The draft settings, carried in from the competition screen and handed straight back by the
 * "← Competitions" link so a round trip doesn't silently reset them to defaults. */
interface NavState {
  leagueIds?: string[];
  seasonMax?: string;
  ratingsMode?: RatingsMode;
  managersEnabled?: boolean;
  transferWindowEnabled?: boolean;
}

interface Field {
  team: Team;
  userXi: Player[];
  opponents: { id: string; name: string; ovr: number; players: Player[] }[];
}

export default function ChampionsLeague() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTeamId, managerId } = useAppState();
  const nav = (location.state as NavState | null) ?? {};
  const seasonMax = nav.seasonMax ?? '2025-26';
  const ratingsMode: RatingsMode = nav.ratingsMode ?? 'season';

  const [phase, setPhase] = useState<'building' | 'league' | 'playoff' | 'knockout' | 'done'>('building');
  const [error, setError] = useState<string | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());
  const [lp, setLp] = useState<LeaguePhaseResult | null>(null);
  const [cup, setCup] = useState<CupResult | null>(null);
  const [userPos, setUserPos] = useState(0);
  const [userPlayoffTie, setUserPlayoffTie] = useState<PlayoffTie | null>(null);
  const [userInR16, setUserInR16] = useState(false);
  const [cupReveal, setCupReveal] = useState(0);
  const [koPlaying, setKoPlaying] = useState(true);
  const [ovrById, setOvrById] = useState<Map<string, number>>(new Map());
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fieldRef = useRef<Field | null>(null);
  const setupDone = useRef(false);

  // Simulate the whole competition with the chosen gaffer baked into the user's side (rating deltas +
  // tactical shape). The manager also lifts the user's strength, so it can shift their league-phase seed.
  const runCompetition = (mgrId: string | null) => {
    const field = fieldRef.current;
    if (!field) return;
    const { team, opponents } = field;
    const manager = getManager(mgrId);
    const userXi = applyManagerToXI(field.userXi, manager);

    const names = new Map<string, string>();
    const xis = new Map<string, Player[]>();
    const ovrs = new Map<string, number>();
    names.set(team.id, team.name); xis.set(team.id, userXi); ovrs.set(team.id, computeTeamOvr(userXi).overall);
    for (const o of opponents) { names.set(o.id, o.name); xis.set(o.id, o.players); ovrs.set(o.id, o.ovr); }
    const tactics: Map<string, TacticalShape> | undefined = manager ? new Map([[team.id, managerTactics(manager)]]) : undefined;

    const fieldIds = [team.id, ...opponents.map((o) => o.id)];
    const phaseResult = simulateLeaguePhase(fieldIds, xis, tactics);
    // One play-off run: the winners that feed the R16 must match the tie shown to the user.
    const po = simulatePlayoffRound(phaseResult.playoffIds, xis, team.id, tactics);
    const r16 = [...phaseResult.directIds, ...po.winners];
    const cupResult = simulateCup(r16.map((id) => ({ id, xi: xis.get(id)! })), team.id, tactics);

    setTeamNames(names);
    setOvrById(ovrs);
    setLp(phaseResult);
    setCup(cupResult);
    setUserPos(phaseResult.table.findIndex((r) => r.teamId === team.id) + 1);
    setUserPlayoffTie(po.ties.find((t) => t.userInvolved) ?? null);
    setUserInR16(r16.includes(team.id));
    setPhase('league');
  };

  useEffect(() => {
    if (!currentTeamId) { navigate('/draft'); return; }
    if (setupDone.current) return;
    setupDone.current = true;
    (async () => {
      const team = await getTeam(currentTeamId);
      if (!team) { navigate('/draft'); return; }
      const userXi = (await getPlayers(team.squad)).slice(0, 11);
      const entries = await loadIndex();
      const opps = await loadEuropeanField(ALL_LEAGUES, seasonMax, entries, ratingsMode, FIELD_SIZE - 1);
      if (opps.length < FIELD_SIZE - 1) {
        setError('Not enough clubs with complete data to fill a 36-team Champions League yet — scrape more, or add leagues in Setup.');
        return;
      }
      fieldRef.current = {
        team,
        userXi,
        opponents: opps.map((o) => ({ id: o.team.id, name: o.team.name, ovr: o.ovr.overall, players: o.players })),
      };
      setUserTeam(team);
      runCompetition(managerId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeamId, navigate, seasonMax, ratingsMode, managerId]);

  // Reveal the knockout one round at a time, paused-aware, at a matchday pace (like the domestic cup).
  useEffect(() => {
    if (phase !== 'knockout' || !cup || !koPlaying) return;
    tickerRef.current = setInterval(() => setCupReveal((c) => (c >= cup.rounds.length ? c : c + 1)), 2600);
    return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
  }, [phase, cup, koPlaying]);
  useEffect(() => {
    if (phase === 'knockout' && cup && cupReveal >= cup.rounds.length) setPhase('done');
  }, [phase, cupReveal, cup]);
  useEffect(() => () => { if (tickerRef.current) clearInterval(tickerRef.current); }, []);

  const inTop8 = lp ? lp.directIds.includes(userTeam?.id ?? '') : false;
  const inPlayoff = lp ? lp.playoffIds.includes(userTeam?.id ?? '') : false;
  const wonPlayoff = userPlayoffTie?.winnerId === userTeam?.id;
  const goToKnockout = () => { setCupReveal(0); setKoPlaying(true); setPhase('knockout'); };
  const afterLeague = () => setPhase(inPlayoff ? 'playoff' : 'knockout');

  const exitLabel = cup && userTeam
    ? (cup.champion === userTeam.id ? 'Winners'
      : userInR16 ? cup.userExit
      : inPlayoff ? 'Play-off round'
      : `League phase (${userPos}th)`)
    : '';

  const name = (id: string) => teamNames.get(id) ?? id;

  return (
    <div className="flex min-h-svh flex-col">
      <ProgrammeNav left={<Link to="/season" state={nav} className="no-underline hover:text-[var(--brick)]" style={{ color: 'var(--soft)' }}>← Competitions</Link>} />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 pb-14 pt-9 sm:px-10">
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="font-stamp -rotate-[1.5deg] border-[1.5px] px-2.5 py-1 text-sm" style={{ borderColor: 'var(--brick)', color: 'var(--brick)' }}>ACT V</span>
          <h1 className="font-display m-0 text-[42px] font-extrabold sm:text-[52px]" style={{ color: 'var(--ink)' }}>Champions League</h1>
        </div>

        {error && <div className="mt-10 border-[1.5px] px-5 py-8 text-center text-[14px] font-semibold" style={{ borderColor: BRICK, color: BRICK, background: CREAM }}>{error}</div>}

        {phase === 'building' && !error && (
          <div className="mt-10 border border-dashed px-5 py-16 text-center text-sm italic" style={{ borderColor: 'var(--line)', color: 'var(--soft)' }}>
            Gathering Europe's 36 best and playing the league phase…
          </div>
        )}

        {/* ============ LEAGUE PHASE TABLE ============ */}
        {phase === 'league' && userTeam && lp && (
          <div className="mt-9">
            <div className="mb-5 text-center">
              <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6B5F4A' }}>The league phase · one table, {MATCHES_PER_TEAM} games each</div>
              <div className="font-display text-[26px] font-extrabold sm:text-[32px]" style={{ color: INK }}>
                {inTop8 ? `${userPos}th — straight to the Round of 16`
                  : inPlayoff ? `${userPos}th — into the knockout play-off`
                  : `${userPos}th — eliminated`}
              </div>
              {managerId && (
                <div className="mt-2 inline-block border-[1.5px] px-3 py-1" style={{ borderColor: BRICK, background: '#F5E9C8' }}>
                  <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: '#6B5F4A' }}>Gaffer</span>{' '}
                  <span className="font-display text-[14px] font-extrabold" style={{ color: INK }}>{getManager(managerId)?.name}</span>
                </div>
              )}
            </div>

            <div className="mx-auto max-w-[620px]" style={{ background: CREAM, border: `1px solid ${LINE}`, boxShadow: '5px 5px 0 var(--card-shadow)' }}>
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="font-stamp" style={{ background: INK, color: CREAM }}>
                    <th className="py-1.5 pl-3 text-left font-normal">#</th>
                    <th className="py-1.5 text-left font-normal">Club</th>
                    <th className="py-1.5 text-center font-normal">Pld</th>
                    <th className="py-1.5 text-center font-normal">GD</th>
                    <th className="py-1.5 pr-3 text-center font-normal">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {lp.table.map((row: StandingsRow, i) => {
                    const you = row.teamId === userTeam.id;
                    const zone = i < 8 ? 'direct' : i < 24 ? 'playoff' : 'out';
                    const tint = you ? '#F5E9C8' : zone === 'direct' ? 'rgba(62,122,78,.09)' : zone === 'playoff' ? 'rgba(180,105,30,.07)' : 'transparent';
                    const gd = row.goalsFor - row.goalsAgainst;
                    return (
                      <tr key={row.teamId}
                        style={{
                          background: tint,
                          borderTop: i === 8 ? `2px solid ${GREEN}` : i === 24 ? `2px solid ${AMBER}` : `1px solid #EDE3CB`,
                          opacity: zone === 'out' && !you ? 0.6 : 1,
                        }}
                      >
                        <td className="py-1.5 pl-3 font-stamp" style={{ color: zone === 'direct' ? GREEN : zone === 'playoff' ? AMBER : '#9A8C6E' }}>{i + 1}</td>
                        <td className="py-1.5 pr-1 leading-tight" style={{ color: you ? BRICK : INK, fontWeight: you ? 700 : 500 }}>
                          {you ? '★ ' : ''}<span title={name(row.teamId)}>{name(row.teamId).slice(0, 22)}</span>
                        </td>
                        <td className="py-1.5 text-center" style={{ color: '#6B5F4A' }}>{row.played}</td>
                        <td className="py-1.5 text-center" style={{ color: '#6B5F4A' }}>{gd > 0 ? `+${gd}` : gd}</td>
                        <td className="py-1.5 pr-3 text-center font-stamp" style={{ color: INK }}>{row.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mx-auto mt-3 flex max-w-[620px] justify-center gap-4 text-[10.5px]" style={{ color: '#6B5F4A' }}>
              <span><span style={{ color: GREEN }}>■</span> 1–8 · Round of 16</span>
              <span><span style={{ color: AMBER }}>■</span> 9–24 · Play-off</span>
              <span>25–36 · Out</span>
            </div>

            <div className="mt-8 text-center">
              <button type="button" onClick={afterLeague} className="font-stamp foil-bg relative cursor-pointer overflow-hidden px-8 py-4 text-[16px] tracking-[0.1em] hover:brightness-105">
                {inPlayoff ? 'Play the play-off →' : inTop8 ? 'Into the knockout →' : 'Watch the knockout →'}
              </button>
            </div>
          </div>
        )}

        {/* ============ USER'S PLAY-OFF TIE ============ */}
        {phase === 'playoff' && userTeam && userPlayoffTie && (() => {
          const t = userPlayoffTie;
          const userHome = t.homeId === userTeam.id; // user is the higher seed?
          const oppId = userHome ? t.awayId : t.homeId;
          const userAgg = userHome ? t.aggHome : t.aggAway;
          const oppAgg = userHome ? t.aggAway : t.aggHome;
          return (
            <div className="mt-9 flex flex-col items-center">
              <div className="mb-5 text-center">
                <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6B5F4A' }}>Knockout play-off · two legs</div>
                <div className="font-display text-[26px] font-extrabold sm:text-[30px]" style={{ color: INK }}>Win to reach the Round of 16</div>
              </div>
              <div className="w-full max-w-[460px]" style={{ background: CREAM, border: `1px solid ${LINE}`, boxShadow: '6px 6px 0 var(--card-shadow)' }}>
                <div className="grid items-center gap-2 px-5 py-6" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
                  <span className="font-display text-[19px] font-extrabold" style={{ color: BRICK }}>★ {userTeam.name}</span>
                  <span className="font-stamp text-[30px] leading-none" style={{ color: INK }}>{userAgg}–{oppAgg}</span>
                  <span className="text-right font-display text-[19px] font-extrabold" style={{ color: INK }}>{name(oppId)}</span>
                </div>
                <div className="px-5 pb-3 text-center text-[11px]" style={{ color: '#6B5F4A' }}>
                  legs: {t.leg1.homeGoals}–{t.leg1.awayGoals}, {t.leg2.homeGoals}–{t.leg2.awayGoals}{t.penalties ? ` · pens ${t.penalties.home}–${t.penalties.away}` : ''} · aggregate
                </div>
                <div className="flex items-center justify-center border-t py-2.5" style={{ borderColor: '#EDE3CB' }}>
                  <span className="font-stamp px-3 py-1 text-[14px]" style={{ background: wonPlayoff ? GREEN : BRICK, color: CREAM, borderRadius: 3 }}>
                    {wonPlayoff ? 'THROUGH TO THE R16' : 'KNOCKED OUT'}
                  </span>
                </div>
              </div>
              <button type="button" onClick={goToKnockout} className="font-stamp foil-bg relative mt-7 cursor-pointer overflow-hidden px-8 py-4 text-[16px] tracking-[0.1em] hover:brightness-105">
                {wonPlayoff ? 'Into the knockout →' : 'Watch the knockout →'}
              </button>
            </div>
          );
        })()}

        {/* ============ KNOCKOUT + FINAL ============ */}
        {(phase === 'knockout' || phase === 'done') && cup && userTeam && (
          <div className="mt-9 flex flex-col items-center">
            <div className="mb-5 text-center">
              <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6B5F4A' }}>Champions League · knockout</div>
              <div className="font-display text-[26px] font-extrabold sm:text-[30px]" style={{ color: INK }}>The road to the final</div>
            </div>

            {/* the user's tie in the round just revealed — a full matchday card with timeline */}
            {phase === 'knockout' && cupReveal > 0 && (() => {
              const tie = cup.rounds[cupReveal - 1]?.find((t) => t.userInvolved) ?? null;
              return tie ? (
                <KnockoutTieCard tie={tie} userId={userTeam.id} userName={userTeam.name} teamNames={teamNames}
                  ovrOf={(id) => ovrById.get(id)} roundIndex={cupReveal} totalRounds={cup.rounds.length} leagueInk={INK} />
              ) : null;
            })()}

            <CupBracket
              rounds={cup.rounds}
              revealed={phase === 'done' ? cup.rounds.length : cupReveal}
              userId={userTeam.id}
              teamNames={teamNames}
              seedById={cup.seedById}
            />

            {phase === 'knockout' && (
              <RevealControls playing={koPlaying} atEnd={cupReveal >= cup.rounds.length}
                onToggle={() => setKoPlaying((p) => !p)}
                onNext={() => setCupReveal((c) => Math.min(cup.rounds.length, c + 1))}
                onSkip={() => { if (tickerRef.current) clearInterval(tickerRef.current); setCupReveal(cup.rounds.length); }} />
            )}

            {phase === 'done' && (
              <div className="mt-7 w-full max-w-[560px]">
                <div className="p-2.5" style={cup.champion === userTeam.id ? undefined : { background: CREAM, border: `1px solid ${LINE}` }}>
                  <div className={cup.champion === userTeam.id ? 'foil-card-bg relative overflow-hidden p-2.5' : ''}>
                    <div className="px-6 py-6 text-center" style={{ background: INK, color: '#F6EFDF' }}>
                      <div className="text-[10px] tracking-[0.2em]" style={{ color: '#E5C96B' }}>CHAMPIONS LEAGUE</div>
                      <div className="font-display my-2 text-[30px] font-extrabold">
                        {cup.champion === userTeam.id ? '🏆 KINGS OF EUROPE' : `Out in the ${exitLabel}`}
                      </div>
                      <div className="text-[13px]" style={{ color: 'rgba(246,239,223,.85)' }}>
                        {cup.champion === userTeam.id
                          ? `${userTeam.name} conquer the continent!`
                          : `Winners: ${name(cup.champion)}`}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2.5">
                  <Link to="/season" state={nav} className="flex-1 border-[1.5px] px-4 py-3 text-center text-[13px] font-bold uppercase tracking-[0.06em] no-underline" style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}>Competitions</Link>
                  <Link to="/setup" className="flex-1 border-[1.5px] px-4 py-3 text-center text-[13px] font-bold uppercase tracking-[0.06em] no-underline" style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}>New draft</Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <ProgrammeFooter />
    </div>
  );
}
