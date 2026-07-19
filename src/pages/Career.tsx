import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ProgrammeNav, ProgrammeFooter } from '../components/chrome/ProgrammeChrome';
import { getAllTeams, getAllSeasons, deleteSeason, deleteTeam, type TeamSummary, type SeasonSummary } from '../storage/cache';

const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const GREEN = '#3E7A4E';
const LINE = '#D8CBAD';
const SOFT = '#6B5F4A';

const ord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
const dateStr = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** The manager's history: every saved team and season, with delete controls (the "remove past
 * seasons" ask). Data comes from the accounts API via the cache helpers. */
export default function Career() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
              <div className="grid gap-2.5 sm:grid-cols-2">
                {teams.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3" style={{ background: CREAM, border: `1px solid ${LINE}`, boxShadow: '3px 3px 0 var(--card-shadow)' }}>
                    <div>
                      <div className="font-display text-[17px] font-bold" style={{ color: INK }}>{t.name}</div>
                      <div className="text-[11px]" style={{ color: SOFT }}>{t.team.formation} · {dateStr(t.createdAt)}</div>
                    </div>
                    <button type="button" onClick={() => removeTeam(t.id)} title="Delete team + its seasons"
                      className="cursor-pointer border px-2.5 py-1 text-[11px] font-bold uppercase hover:brightness-105"
                      style={{ borderColor: BRICK, color: BRICK, background: 'transparent' }}>
                      Delete
                    </button>
                  </div>
                ))}
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
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i === 0 ? 'none' : `1px solid #EDE3CB` }}>
                      <span className="font-stamp grid h-[30px] w-[30px] shrink-0 place-items-center text-[12px]" style={{ background: champ ? '#C7A63E' : INK, color: CREAM, borderRadius: 3 }}>
                        {s.position ? `${s.position}` : '–'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold" style={{ color: INK }}>
                          {champ && '★ '}{s.competition ?? 'Season'} <span style={{ color: SOFT }}>· {teamName(s.teamId)}</span>
                        </div>
                        <div className="text-[11px]" style={{ color: SOFT }}>
                          {s.position ? `Finished ${s.position}${ord(s.position)}` : ''}{s.points != null ? ` · ${s.points} pts` : ''}{s.played != null ? ` · ${s.played} games` : ''} · {dateStr(s.createdAt)}
                        </div>
                      </div>
                      <button type="button" onClick={() => removeSeason(s.id)} title="Delete this season"
                        className="shrink-0 cursor-pointer border px-2.5 py-1 text-[11px] font-bold uppercase hover:brightness-105"
                        style={{ borderColor: BRICK, color: BRICK, background: 'transparent' }}>
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-6 text-center text-[11px] italic" style={{ color: SOFT }}>
              Champion seasons are marked <span style={{ color: GREEN }}>★</span>. Deleting a team removes its seasons too.
            </p>
          </>
        )}
      </main>
      <ProgrammeFooter />
    </div>
  );
}
