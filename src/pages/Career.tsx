import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ProgrammeNav, ProgrammeFooter } from '../components/chrome/ProgrammeChrome';
import { getAllTeams, getAllSeasons, getTeam, getPlayers, deleteSeason, deleteTeam, type TeamSummary, type SeasonSummary } from '../storage/cache';
import { SeasonStatsPanel } from '../components/SeasonStats';
import type { StoredSeasonStats } from '../engine/seasonStats';
import { POSITION_TO_BROAD, type BroadPosition, type Player } from '../types';

const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const GREEN = '#3E7A4E';
const LINE = '#D8CBAD';
const SOFT = '#6B5F4A';

const LINE_ORDER: BroadPosition[] = ['GK', 'DF', 'MF', 'FW'];
const LINE_LABEL: Record<BroadPosition, string> = { GK: 'Goalkeeper', DF: 'Defence', MF: 'Midfield', FW: 'Attack' };
const LINE_INK: Record<BroadPosition, string> = { GK: '#B8860B', DF: '#2F5D8A', MF: GREEN, FW: BRICK };

const ord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
const dateStr = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Pull the saved stats blob out of a season's denormalized summary, if it was recorded. Seasons
 * saved before the stats-in-summary change have no `stats` field and return null (legacy fallback). */
const statsFrom = (summary: Record<string, unknown> | null): StoredSeasonStats | null =>
  summary && typeof summary === 'object' && 'stats' in summary && 'teamNames' in summary
    ? (summary as unknown as StoredSeasonStats)
    : null;

/** The manager's history: every saved team and season, with delete controls (the "remove past
 * seasons" ask). Data comes from the accounts API via the cache helpers. */
export default function Career() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamXIs, setTeamXIs] = useState<Record<string, Player[]>>({});

  const toggleTeam = useCallback(async (id: string) => {
    if (expandedTeamId === id) { setExpandedTeamId(null); return; }
    setExpandedTeamId(id);
    if (!teamXIs[id]) {
      const team = await getTeam(id); // fetches + seeds the player cache
      const players = team ? await getPlayers(team.squad) : [];
      setTeamXIs((prev) => ({ ...prev, [id]: players }));
    }
  }, [expandedTeamId, teamXIs]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([getAllTeams(), getAllSeasons()]);
      setTeams(t);
      setSeasons(s);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const removeSeason = async (id: string) => {
    if (!confirm('Delete this season from your record? This cannot be undone.')) return;
    await deleteSeason(id);
    setSeasons((prev) => prev.filter((s) => s.id !== id));
  };
  const removeTeam = async (id: string) => {
    if (!confirm('Delete this team and all of its seasons? This cannot be undone.')) return;
    await deleteTeam(id);
    setTeams((prev) => prev.filter((t) => t.id !== id));
    setSeasons((prev) => prev.filter((s) => s.teamId !== id));
  };

  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? 'Team';

  return (
    <div className="flex min-h-svh flex-col">
      <ProgrammeNav left={<Link to="/" className="no-underline hover:text-[var(--brick)]" style={{ color: 'var(--soft)' }}>← Cover</Link>} />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-14 pt-9 sm:px-10">
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="font-stamp -rotate-[1.5deg] border-[1.5px] px-2.5 py-1 text-sm" style={{ borderColor: 'var(--brick)', color: 'var(--brick)' }}>THE RECORD</span>
          <h1 className="font-display m-0 text-[42px] font-extrabold sm:text-[52px]" style={{ color: 'var(--ink)' }}>My Career</h1>
        </div>

        {loading ? (
          <div className="mt-10 border border-dashed px-5 py-16 text-center text-sm italic" style={{ borderColor: LINE, color: SOFT }}>Loading your history…</div>
        ) : (
          <>
            {/* TEAMS */}
            <div className="mb-3 mt-9 flex items-center gap-2.5">
              <span className="font-display text-[20px] font-bold" style={{ color: INK }}>Your teams</span>
              <span className="h-px flex-1" style={{ background: LINE }} />
              <span className="text-[11px]" style={{ color: SOFT }}>{teams.length}</span>
            </div>
            {teams.length === 0 ? (
              <div className="border border-dashed px-5 py-8 text-center text-[13px] italic" style={{ borderColor: LINE, color: SOFT }}>
                No teams yet. <Link to="/setup" style={{ color: BRICK }}>Draft your first XI →</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {teams.map((t) => {
                  const open = expandedTeamId === t.id;
                  const seasonCount = seasons.filter((s) => s.teamId === t.id).length;
                  return (
                    <div key={t.id} style={{ background: CREAM, border: `1px solid ${LINE}`, boxShadow: '3px 3px 0 var(--card-shadow)' }}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <button type="button" onClick={() => void toggleTeam(t.id)} aria-expanded={open}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left">
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="font-display text-[17px] font-bold" style={{ color: INK }}>{t.name}</span>
                              <span className="text-[11px]" style={{ color: BRICK }}>{open ? '▲' : '▼'}</span>
                            </span>
                            <span className="block text-[11px]" style={{ color: SOFT }}>{t.team.formation} · {seasonCount} season{seasonCount === 1 ? '' : 's'} · {dateStr(t.createdAt)}</span>
                          </span>
                        </button>
                        <button type="button" onClick={() => removeTeam(t.id)} title="Delete team + its seasons"
                          className="shrink-0 cursor-pointer border px-2.5 py-1 text-[11px] font-bold uppercase hover:brightness-105"
                          style={{ borderColor: BRICK, color: BRICK, background: 'transparent' }}>
                          Delete
                        </button>
                      </div>
                      {open && (
                        <div className="px-4 pb-4 pt-1" style={{ borderTop: `1px solid #EDE3CB`, background: '#FBF6E9' }}>
                          <TeamXI players={teamXIs[t.id]} formation={t.team.formation} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SEASONS */}
            <div className="mb-3 mt-9 flex items-center gap-2.5">
              <span className="font-display text-[20px] font-bold" style={{ color: INK }}>Season history</span>
              <span className="h-px flex-1" style={{ background: LINE }} />
              <span className="text-[11px]" style={{ color: SOFT }}>{seasons.length}</span>
            </div>
            {seasons.length === 0 ? (
              <div className="border border-dashed px-5 py-8 text-center text-[13px] italic" style={{ borderColor: LINE, color: SOFT }}>
                No seasons played yet.
              </div>
            ) : (
              <div style={{ background: CREAM, border: `1px solid ${LINE}`, boxShadow: '4px 4px 0 var(--card-shadow)' }}>
                {seasons.map((s, i) => {
                  const champ = s.position === 1;
                  const stored = statsFrom(s.summary);
                  const open = expandedId === s.id;
                  return (
                    <div key={s.id} style={{ borderTop: i === 0 ? 'none' : `1px solid #EDE3CB` }}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button type="button"
                          onClick={() => stored && setExpandedId(open ? null : s.id)}
                          aria-expanded={open}
                          title={stored ? (open ? 'Hide stats' : 'View full season stats') : 'No detailed stats recorded for this season'}
                          className={`flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent p-0 text-left ${stored ? 'cursor-pointer' : 'cursor-default'}`}>
                          <span className="font-stamp grid h-[30px] w-[30px] shrink-0 place-items-center text-[12px]" style={{ background: champ ? '#C7A63E' : INK, color: CREAM, borderRadius: 3 }}>
                            {s.position ? `${s.position}` : '–'}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 truncate text-[14px] font-semibold" style={{ color: INK }}>
                              {champ && '★ '}{s.competition ?? 'Season'} <span style={{ color: SOFT }}>· {teamName(s.teamId)}</span>
                              {stored && <span className="text-[11px]" style={{ color: BRICK }}>{open ? '▲' : '▼'}</span>}
                            </span>
                            <span className="block text-[11px]" style={{ color: SOFT }}>
                              {s.position ? `Finished ${s.position}${ord(s.position)}` : ''}{s.points != null ? ` · ${s.points} pts` : ''}{s.played != null ? ` · ${s.played} games` : ''} · {dateStr(s.createdAt)}
                            </span>
                          </span>
                        </button>
                        <button type="button" onClick={() => removeSeason(s.id)} title="Delete this season"
                          className="shrink-0 cursor-pointer border px-2.5 py-1 text-[11px] font-bold uppercase hover:brightness-105"
                          style={{ borderColor: BRICK, color: BRICK, background: 'transparent' }}>
                          Delete
                        </button>
                      </div>
                      {open && stored && (
                        <div className="px-4 pb-5 pt-1" style={{ borderTop: `1px solid #EDE3CB`, background: '#FBF6E9' }}>
                          <SeasonStatsPanel stats={stored.stats} teamNames={new Map(Object.entries(stored.teamNames))} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-6 text-center text-[11px] italic" style={{ color: SOFT }}>
              Champion seasons are marked <span style={{ color: GREEN }}>★</span>. Tap a team to see its XI, or a season for its full stats. Deleting a team removes its seasons too.
            </p>
          </>
        )}
      </main>
      <ProgrammeFooter />
    </div>
  );
}

/** The drafted XI for a team, grouped by line (GK/DF/MF/FW) with each player's overall rating. */
function TeamXI({ players, formation }: { players: Player[] | undefined; formation: string }) {
  if (!players) return <div className="py-4 text-center text-[12px] italic" style={{ color: SOFT }}>Loading the squad…</div>;
  if (players.length === 0) return <div className="py-4 text-center text-[12px] italic" style={{ color: SOFT }}>Squad details aren’t available for this team.</div>;
  return (
    <div className="flex flex-col gap-2.5 pt-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: SOFT }}>{formation} · {players.length} players</div>
      {LINE_ORDER.map((line) => {
        const inLine = players.filter((p) => POSITION_TO_BROAD[p.position] === line);
        if (inLine.length === 0) return null;
        return (
          <div key={line} className="flex flex-wrap items-center gap-1.5">
            <span className="w-[74px] shrink-0 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: LINE_INK[line] }}>{LINE_LABEL[line]}</span>
            {inLine.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5 border px-2 py-1" style={{ borderColor: LINE, background: CREAM }}>
                <span className="text-[10px] font-bold uppercase" style={{ color: LINE_INK[line] }}>{p.position}</span>
                <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{p.firstName} {p.lastName}</span>
                <span className="font-stamp text-[12px]" style={{ color: p.ratings.overall >= 85 ? '#B8860B' : SOFT }}>{p.ratings.overall}</span>
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
