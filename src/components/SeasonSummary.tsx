import type { ReactNode } from 'react';
import { computeSeasonStats, type SeasonStats, type SeasonContext } from '../engine/seasonStats';
import type { Campaign } from '../state/AppContext';
import type { Match } from '../types';

const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const GREEN = '#3E7A4E';
const GOLD = '#C7A63E';
const LINE = '#D8CBAD';
const SOFT = '#6B5F4A';

const ord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
const toneColor = (t: 'good' | 'bad' | 'neutral') => (t === 'good' ? GREEN : t === 'bad' ? BRICK : SOFT);

interface Column {
  key: string;
  label: string;
  s: SeasonStats;
}

/**
 * The unified end-of-season page: the league table and each competition's result, plus every stat
 * shown side by side — Overall next to League / Cup / Champions League — in one compact matrix, so
 * combined and per-tournament figures read together without any toggles.
 */
export function SeasonSummary({ campaign }: { campaign: Campaign }) {
  const teamNames = new Map(campaign.teamNames);
  const { teamId, xi } = campaign;
  const name = (id: string) => teamNames.get(id) ?? id;

  const league = campaign.league;
  const cup = campaign.cup?.matches ?? [];
  const cl = campaign.cl?.matches ?? [];
  const all = [...league, ...cup, ...cl];

  // League context so the League/Overall columns carry the verdict + insights.
  const row = campaign.table.find((r) => r.teamId === teamId);
  const ctx: SeasonContext = {
    position: campaign.leaguePosition,
    teamCount: campaign.table.length,
    goalsForRank: 1 + campaign.table.filter((r) => r.goalsFor > (row?.goalsFor ?? 0)).length,
    goalsAgainstRank: 1 + campaign.table.filter((r) => r.goalsAgainst < (row?.goalsAgainst ?? Infinity)).length,
    competition: campaign.leagueName,
  };
  const leagueStats = computeSeasonStats(league, teamId, { xi, context: ctx });
  const per = (m: Match[]) => computeSeasonStats(m, teamId, { xi });

  const columns: Column[] = [
    { key: 'overall', label: 'Overall', s: per(all) },
    { key: 'league', label: 'League', s: leagueStats },
    ...(cup.length ? [{ key: 'cup', label: 'Cup', s: per(cup) }] : []),
    ...(cl.length ? [{ key: 'cl', label: 'Champions Lg', s: per(cl) }] : []),
  ];
  const overall = columns[0].s;

  const metrics: { label: string; get: (s: SeasonStats) => string | number; ink?: (s: SeasonStats) => string }[] = [
    { label: 'Played', get: (s) => s.played },
    { label: 'W – D – L', get: (s) => `${s.won}-${s.drawn}-${s.lost}` },
    { label: 'Goals', get: (s) => s.goalsFor, ink: () => GREEN },
    { label: 'Conceded', get: (s) => s.goalsAgainst, ink: () => BRICK },
    { label: 'Goal diff', get: (s) => (s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference) },
    { label: 'Clean sheets', get: (s) => s.cleanSheets },
    { label: 'Win rate', get: (s) => `${s.winRate}%` },
  ];

  const gridCols = `minmax(96px,1.1fr) ${columns.map(() => '1fr').join(' ')}`;
  const scorers = (overall.players ?? []).filter((p) => p.goals > 0).slice(0, 6);

  const compCards = [
    { label: campaign.leagueName, result: campaign.leaguePosition ? `${campaign.leaguePosition}${ord(campaign.leaguePosition)}` : '—', sub: row ? `${row.won}W-${row.drawn}D-${row.lost}L · ${row.points} pts` : '', ink: campaign.leaguePosition === 1 ? GOLD : INK, border: INK },
    ...(campaign.cup ? [{ label: `${campaign.leagueName} Cup`, result: campaign.cup.exit === 'Winners' ? '🏆 Winners' : campaign.cup.exit, sub: `${campaign.cup.matches.length} tie${campaign.cup.matches.length === 1 ? '' : 's'}`, ink: campaign.cup.exit === 'Winners' ? GOLD : INK, border: BRICK }] : []),
    ...(campaign.cl ? [{ label: 'Champions League', result: campaign.cl.exit === 'Winners' ? '🏆 Winners' : campaign.cl.exit, sub: `${campaign.cl.matches.length} tie${campaign.cl.matches.length === 1 ? '' : 's'}`, ink: campaign.cl.exit === 'Winners' ? GOLD : INK, border: '#2F5D8A' }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-[820px]">
      {/* verdict */}
      {leagueStats.verdict && (
        <div className="mb-5 border-l-[5px] px-5 py-4" style={{ borderColor: toneColor(leagueStats.verdict.tone), background: CREAM, boxShadow: '4px 4px 0 var(--card-shadow, #E4D9BE)' }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: SOFT }}>Full time</div>
          <div className="font-display text-[26px] font-extrabold leading-tight" style={{ color: toneColor(leagueStats.verdict.tone) }}>{leagueStats.verdict.title}</div>
          <div className="mt-0.5 text-[13px] italic" style={{ color: INK }}>{leagueStats.verdict.blurb}</div>
        </div>
      )}

      {/* competitions played */}
      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        {compCards.map((c, i) => (
          <div key={i} className="border-l-[4px] px-4 py-3" style={{ borderColor: c.border, background: CREAM }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: SOFT }}>{c.label}</div>
            <div className="font-display text-[20px] font-extrabold leading-tight" style={{ color: c.ink }}>{c.result}</div>
            <div className="text-[11px]" style={{ color: SOFT }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* stats matrix — every competition side by side */}
      <SectionHead>Stats by competition</SectionHead>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 340 }}>
          <div className="grid items-center border-b-[1.5px] py-2 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ gridTemplateColumns: gridCols, borderColor: INK, color: SOFT }}>
            <span />
            {columns.map((c) => (
              <span key={c.key} className="text-center" style={{ color: c.key === 'overall' ? BRICK : INK }}>{c.label}</span>
            ))}
          </div>
          {metrics.map((m, i) => (
            <div key={m.label} className="grid items-center py-2" style={{ gridTemplateColumns: gridCols, borderTop: i === 0 ? 'none' : `1px solid #EDE3CB` }}>
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: SOFT }}>{m.label}</span>
              {columns.map((c) => (
                <span key={c.key} className="font-stamp text-center text-[15px] tabular-nums" style={{ color: c.key === 'overall' ? (m.ink?.(c.s) ?? INK) : '#3C3325', fontWeight: c.key === 'overall' ? 700 : 400 }}>{m.get(c.s)}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* combined top scorers */}
      {scorers.length > 0 && (
        <>
          <SectionHead>Top scorers · all competitions</SectionHead>
          <div style={{ background: CREAM, border: `1px solid ${LINE}` }}>
            {scorers.map((p, i) => (
              <div key={p.playerId} className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 px-3 py-2" style={{ borderTop: i === 0 ? 'none' : `1px solid #EDE3CB` }}>
                <span className="font-stamp grid h-[20px] w-[20px] place-items-center text-[11px]" style={{ background: i === 0 ? GOLD : INK, color: CREAM, borderRadius: 3 }}>{i + 1}</span>
                <span className="truncate text-[13.5px] font-semibold" style={{ color: INK }}>{p.name}</span>
                <span className="font-stamp w-9 text-center text-[15px]" style={{ color: BRICK }}>{p.goals}</span>
                <span className="w-9 text-center text-[12px]" style={{ color: SOFT }}>{p.assists}a</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* domestic league table */}
      <SectionHead>{campaign.leagueName} · final table</SectionHead>
      <div style={{ background: CREAM, border: `1px solid ${LINE}` }}>
        <div className="grid items-center gap-x-1.5 border-b px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em]" style={{ gridTemplateColumns: '24px minmax(0,1fr) 26px 26px 26px 34px 36px', borderColor: LINE, color: SOFT }}>
          <span>#</span><span>Club</span><span className="text-center">W</span><span className="text-center">D</span><span className="text-center">L</span><span className="text-center">GD</span><span className="text-right">Pts</span>
        </div>
        {campaign.table.map((r, i) => {
          const you = r.teamId === teamId;
          return (
            <div key={r.teamId} className="grid items-center gap-x-1.5 px-3 py-1.5" style={{ gridTemplateColumns: '24px minmax(0,1fr) 26px 26px 26px 34px 36px', borderTop: i === 0 ? 'none' : `1px solid #EDE3CB`, background: you ? 'linear-gradient(90deg,#F5E9C8,#FDFAF1)' : undefined }}>
              <span className="font-stamp text-[12px]" style={{ color: you ? INK : SOFT }}>{i + 1}</span>
              <span className="truncate text-[12.5px]" style={{ color: INK, fontWeight: you ? 800 : 400 }}>{name(r.teamId)}{you && <span className="font-stamp ml-1 text-[10px]" style={{ color: '#8C6A1D' }}>★</span>}</span>
              <span className="text-center text-[12px]" style={{ color: '#3C3325' }}>{r.won}</span>
              <span className="text-center text-[12px]" style={{ color: '#3C3325' }}>{r.drawn}</span>
              <span className="text-center text-[12px]" style={{ color: '#3C3325' }}>{r.lost}</span>
              <span className="text-center text-[12px]" style={{ color: '#3C3325' }}>{r.goalsFor - r.goalsAgainst > 0 ? '+' : ''}{r.goalsFor - r.goalsAgainst}</span>
              <span className="font-stamp text-right text-[13px]" style={{ color: INK }}>{r.points}</span>
            </div>
          );
        })}
      </div>

      {/* insights */}
      {leagueStats.insights && leagueStats.insights.length > 0 && (
        <>
          <SectionHead>How the season went</SectionHead>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {leagueStats.insights.map((ins, i) => (
              <div key={i} className="border-l-[4px] px-3 py-2.5" style={{ borderColor: toneColor(ins.tone), background: CREAM }}>
                <div className="text-[13px] font-bold" style={{ color: toneColor(ins.tone) }}>{ins.title}</div>
                <div className="mt-0.5 text-[12px]" style={{ color: INK }}>{ins.detail}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-2.5">
      <span className="font-display text-[19px] font-bold" style={{ color: INK }}>{children}</span>
      <span className="h-px flex-1" style={{ background: LINE }} />
    </div>
  );
}

/** Build the campaign's per-competition user matches from a set of cup ties (with goal events). */
export function tiesToMatches(userTies: { round: string; homeId: string; awayId: string; result: { homeGoals: number; awayGoals: number; xgHome: number; xgAway: number; homeWinProbability: number; drawProbability: number; awayWinProbability: number; goals: { minute: number; side: 'home' | 'away'; scorerId: string; scorerName: string; assistId?: string; assistName?: string }[] } }[], prefix: string): Match[] {
  return userTies.map((t, i) => ({
    id: `${prefix}-${i}`, competitionId: prefix, round: t.round,
    homeTeamId: t.homeId, awayTeamId: t.awayId,
    homeScore: t.result.homeGoals, awayScore: t.result.awayGoals,
    homeXG: t.result.xgHome, awayXG: t.result.xgAway,
    homeWinProbability: t.result.homeWinProbability, drawProbability: t.result.drawProbability, awayWinProbability: t.result.awayWinProbability,
    simulated: true,
    goals: t.result.goals.map((g) => ({ minute: g.minute, teamId: g.side === 'home' ? t.homeId : t.awayId, scorerId: g.scorerId, scorerName: g.scorerName, assistId: g.assistId, assistName: g.assistName })),
  }));
}
