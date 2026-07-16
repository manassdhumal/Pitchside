import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppContext';
import { getTeam, getPlayers } from '../storage/cache';
import { loadIndex } from '../data/historicalData';
import { loadEuropeanField } from '../data/leagueOpponents';
import { computeTeamOvr } from '../engine/teamRatings';
import { drawGroups, simulateGroupStage, groupQualifiers, type GroupResult } from '../engine/groupStage';
import { simulateCup, type CupResult } from '../engine/cup';
import { CupBracket } from '../components/CupBracket';
import { ProgrammeNav, ProgrammeFooter } from '../components/chrome/ProgrammeChrome';
import type { Team, Player, RatingsMode } from '../types';

const FIELD_SIZE = 32;
const NUM_GROUPS = 8;
// The Champions League is pan-European — its field is drawn from every league, not just whichever
// the user picked for the draft/domestic season.
const ALL_LEAGUES = ['premier-league', 'bundesliga', 'la-liga', 'serie-a', 'ligue-1'];
const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const GREEN = '#3E7A4E';
const LINE = '#D8CBAD';

interface NavState {
  leagueIds?: string[];
  seasonMax?: string;
  ratingsMode?: RatingsMode;
}

export default function ChampionsLeague() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTeamId } = useAppState();
  const nav = (location.state as NavState | null) ?? {};
  const seasonMax = nav.seasonMax ?? '2025-26';
  const ratingsMode: RatingsMode = nav.ratingsMode ?? 'season';

  const [phase, setPhase] = useState<'building' | 'draw' | 'groups' | 'knockout' | 'done'>('building');
  const [error, setError] = useState<string | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());
  const [ovrByTeam, setOvrByTeam] = useState<Map<string, number>>(new Map());
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [cup, setCup] = useState<CupResult | null>(null);
  const [userGroupId, setUserGroupId] = useState('');
  const [userAdvanced, setUserAdvanced] = useState(false);
  const [cupReveal, setCupReveal] = useState(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setupDone = useRef(false);

  useEffect(() => {
    if (!currentTeamId) { navigate('/draft'); return; }
    if (setupDone.current) return;
    setupDone.current = true;
    (async () => {
      const team = await getTeam(currentTeamId);
      if (!team) { navigate('/draft'); return; }
      const userXi = (await getPlayers(team.squad)).slice(0, 11);
      const entries = await loadIndex();
      const opponents = await loadEuropeanField(ALL_LEAGUES, seasonMax, entries, ratingsMode, FIELD_SIZE - 1);
      if (opponents.length < FIELD_SIZE - 1) {
        setError('Not enough clubs with complete data to fill a 32-team Champions League yet — scrape more, or add leagues in Setup.');
        return;
      }

      const names = new Map<string, string>();
      const ovrs = new Map<string, number>();
      const xis = new Map<string, Player[]>();
      const strength = new Map<string, number>();
      const uOvr = computeTeamOvr(userXi).overall;
      names.set(team.id, team.name); ovrs.set(team.id, uOvr); xis.set(team.id, userXi); strength.set(team.id, uOvr);
      for (const o of opponents) {
        names.set(o.team.id, o.team.name); ovrs.set(o.team.id, o.ovr.overall);
        xis.set(o.team.id, o.players); strength.set(o.team.id, o.ovr.overall);
      }

      const fieldIds = [team.id, ...opponents.map((o) => o.team.id)];
      const drawn = drawGroups(fieldIds, strength, NUM_GROUPS);
      const groupResults = simulateGroupStage(drawn, xis);
      const quals = groupQualifiers(groupResults, 2);
      const cupResult = simulateCup(quals.map((id) => ({ id, xi: xis.get(id)! })), team.id);
      const uGroup = groupResults.find((g) => g.teamIds.includes(team.id));

      setUserTeam(team);
      setTeamNames(names);
      setOvrByTeam(ovrs);
      setGroups(groupResults);
      setCup(cupResult);
      setUserGroupId(uGroup?.id ?? '');
      setUserAdvanced(quals.includes(team.id));
      setPhase('draw');
    })();
  }, [currentTeamId, navigate, seasonMax, ratingsMode]);

  // Reveal the knockout one round at a time, like the domestic cup.
  useEffect(() => {
    if (phase !== 'knockout' || !cup) return;
    tickerRef.current = setInterval(() => setCupReveal((c) => (c >= cup.rounds.length ? c : c + 1)), 1600);
    return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
  }, [phase, cup]);
  useEffect(() => {
    if (phase === 'knockout' && cup && cupReveal >= cup.rounds.length) setPhase('done');
  }, [phase, cupReveal, cup]);
  useEffect(() => () => { if (tickerRef.current) clearInterval(tickerRef.current); }, []);

  const userGroup = groups.find((g) => g.id === userGroupId);
  const exitLabel = !userAdvanced ? 'Group stage' : cup?.userExit ?? '';

  return (
    <div className="flex min-h-svh flex-col">
      <ProgrammeNav left={<Link to="/season" className="no-underline hover:text-[var(--brick)]" style={{ color: 'var(--soft)' }}>← Competitions</Link>} />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 pb-14 pt-9 sm:px-10">
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="font-stamp -rotate-[1.5deg] border-[1.5px] px-2.5 py-1 text-sm" style={{ borderColor: 'var(--brick)', color: 'var(--brick)' }}>ACT V</span>
          <h1 className="font-display m-0 text-[42px] font-extrabold sm:text-[52px]" style={{ color: 'var(--ink)' }}>Champions League</h1>
        </div>

        {error && <div className="mt-10 border-[1.5px] px-5 py-8 text-center text-[14px] font-semibold" style={{ borderColor: BRICK, color: BRICK, background: CREAM }}>{error}</div>}

        {phase === 'building' && !error && (
          <div className="mt-10 border border-dashed px-5 py-16 text-center text-sm italic" style={{ borderColor: 'var(--line)', color: 'var(--soft)' }}>
            Gathering Europe's 32 best and making the draw…
          </div>
        )}

        {/* ============ THE DRAW ============ */}
        {phase === 'draw' && userTeam && userGroup && (
          <div className="mt-9 flex flex-col items-center">
            <div className="mb-5 text-center">
              <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6B5F4A' }}>The draw is made</div>
              <div className="font-display text-[28px] font-extrabold sm:text-[34px]" style={{ color: INK }}>You're in Group {userGroup.id}</div>
            </div>
            <div className="w-full max-w-[440px]" style={{ background: CREAM, border: `2px solid ${BRICK}`, boxShadow: '6px 6px 0 var(--card-shadow)' }}>
              <div className="px-4 py-2 font-stamp text-[13px] tracking-[0.12em]" style={{ background: INK, color: CREAM }}>GROUP {userGroup.id}</div>
              {userGroup.teamIds
                .slice()
                .sort((a, b) => (ovrByTeam.get(b) ?? 0) - (ovrByTeam.get(a) ?? 0))
                .map((id) => {
                  const you = id === userTeam.id;
                  return (
                    <div key={id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${LINE}` }}>
                      <span className="font-display text-[17px] font-bold" style={{ color: you ? BRICK : INK }}>{you ? '★ ' : ''}{teamNames.get(id)}</span>
                      <span className="font-stamp px-1.5 py-0.5 text-[12px]" style={{ background: you ? BRICK : INK, color: CREAM, borderRadius: 3 }}>{ovrByTeam.get(id)}</span>
                    </div>
                  );
                })}
            </div>
            <button type="button" onClick={() => setPhase('groups')} className="font-stamp foil-bg relative mt-7 cursor-pointer overflow-hidden px-8 py-4 text-[16px] tracking-[0.1em] hover:brightness-105">
              Play the group stage →
            </button>
          </div>
        )}

        {/* ============ GROUP STAGE ============ */}
        {phase === 'groups' && userTeam && (
          <div className="mt-9">
            <div
              className="mx-auto mb-7 max-w-[560px] px-5 py-4 text-center"
              style={{ background: userAdvanced ? GREEN : BRICK, color: CREAM, boxShadow: '4px 4px 0 var(--card-shadow)' }}
            >
              <div className="font-display text-[22px] font-extrabold">
                {userAdvanced ? `Through from Group ${userGroupId} — into the Round of 16` : `Out at the group stage`}
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {groups.map((g) => {
                const isUserGroup = g.id === userGroupId;
                return (
                  <div key={g.id} style={{ background: CREAM, border: `${isUserGroup ? 2 : 1}px solid ${isUserGroup ? BRICK : LINE}`, boxShadow: '3px 3px 0 var(--card-shadow)' }}>
                    <div className="px-3 py-1.5 font-stamp text-[11px] tracking-[0.12em]" style={{ background: isUserGroup ? BRICK : INK, color: CREAM }}>GROUP {g.id}</div>
                    <table className="w-full border-collapse text-[11.5px]">
                      <thead>
                        <tr style={{ color: '#9A8C6E' }}>
                          <th className="py-1 pl-2 text-left font-normal">#</th>
                          <th className="py-1 text-left font-normal">Club</th>
                          <th className="py-1 text-center font-normal">Pld</th>
                          <th className="py-1 pr-2 text-center font-normal">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.table.map((row, i) => {
                          const you = row.teamId === userTeam.id;
                          const qualifies = i < 2;
                          return (
                            <tr key={row.teamId} style={{ borderTop: `1px solid #EDE3CB`, background: qualifies ? 'rgba(62,122,78,.08)' : 'transparent' }}>
                              <td className="py-1.5 pl-2" style={{ color: qualifies ? GREEN : '#9A8C6E', fontWeight: qualifies ? 700 : 400 }}>{i + 1}</td>
                              <td className="py-1.5 pr-1 leading-tight" style={{ color: you ? BRICK : INK, fontWeight: you ? 700 : 500 }}>
                                {you ? '★ ' : ''}<span title={teamNames.get(row.teamId)}>{(teamNames.get(row.teamId) ?? '').slice(0, 14)}</span>
                              </td>
                              <td className="py-1.5 text-center" style={{ color: '#6B5F4A' }}>{row.played}</td>
                              <td className="py-1.5 pr-2 text-center font-stamp" style={{ color: INK }}>{row.points}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 text-center">
              <button type="button" onClick={() => { setCupReveal(0); setPhase('knockout'); }} className="font-stamp foil-bg relative cursor-pointer overflow-hidden px-8 py-4 text-[16px] tracking-[0.1em] hover:brightness-105">
                {userAdvanced ? 'Enter the knockout →' : 'Watch the knockout →'}
              </button>
            </div>
          </div>
        )}

        {/* ============ KNOCKOUT + FINAL ============ */}
        {(phase === 'knockout' || phase === 'done') && cup && userTeam && (
          <div className="mt-9 flex flex-col items-center">
            <div className="mb-5 text-center">
              <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6B5F4A' }}>Champions League · knockout</div>
              <div className="font-display text-[26px] font-extrabold sm:text-[30px]" style={{ color: INK }}>The road to the final</div>
            </div>

            <CupBracket
              rounds={cup.rounds}
              revealed={phase === 'done' ? cup.rounds.length : cupReveal}
              userId={userTeam.id}
              teamNames={teamNames}
              seedById={cup.seedById}
            />

            {phase === 'knockout' && (
              <button type="button" onClick={() => { if (tickerRef.current) clearInterval(tickerRef.current); setCupReveal(cup.rounds.length); }}
                className="mt-5 cursor-pointer border-0 px-4 py-2 text-[12px] font-bold uppercase" style={{ background: BRICK, color: CREAM }}>
                Skip to final ⏭
              </button>
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
                          : `Winners: ${teamNames.get(cup.champion) ?? cup.champion}`}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2.5">
                  <Link to="/season" className="flex-1 border-[1.5px] px-4 py-3 text-center text-[13px] font-bold uppercase tracking-[0.06em] no-underline" style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}>Competitions</Link>
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
