import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { SeasonStats } from '../engine/seasonStats';

const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const GREEN = '#3E7A4E';
const LINE = '#D8CBAD';
const SOFT = '#6B5F4A';

function Tile({ label, value, sub, ink = INK }: { label: string; value: string | number; sub?: string; ink?: string }) {
  return (
    <div className="flex flex-col items-center justify-center border px-2 py-3 text-center" style={{ borderColor: LINE, background: CREAM }}>
      <div className="font-stamp text-[22px] leading-none" style={{ color: ink }}>{value}</div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: SOFT }}>{label}</div>
      {sub && <div className="mt-0.5 text-[9.5px]" style={{ color: SOFT }}>{sub}</div>}
    </div>
  );
}

/** End-of-season team stats: headline tiles, a points-progression chart, a form strip, and the
 * standout results. All team-level (the sim has no individual scorers). */
export function SeasonStatsPanel({ stats, teamNames }: { stats: SeasonStats; teamNames: Map<string, string> }) {
  const name = (id: string) => teamNames.get(id) ?? id;
  const chartData = stats.cumulativePoints.map((p, i) => ({ md: i + 1, pts: p }));
  const rec = (r: { won: number; drawn: number; lost: number }) => `${r.won}-${r.drawn}-${r.lost}`;

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="font-display text-[19px] font-bold" style={{ color: INK }}>Season in numbers</span>
        <span className="h-px flex-1" style={{ background: LINE }} />
      </div>

      {/* headline tiles */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Tile label="Record" value={`${stats.won}-${stats.drawn}-${stats.lost}`} sub="W-D-L" />
        <Tile label="Points" value={stats.points} ink={BRICK} />
        <Tile label="Goals for" value={stats.goalsFor} sub={`${stats.goalsForPerGame.toFixed(1)}/gm`} />
        <Tile label="Against" value={stats.goalsAgainst} sub={`${stats.goalsAgainstPerGame.toFixed(1)}/gm`} />
        <Tile label="Goal diff" value={stats.goalDifference > 0 ? `+${stats.goalDifference}` : stats.goalDifference} ink={stats.goalDifference >= 0 ? GREEN : BRICK} />
        <Tile label="Win rate" value={`${stats.winRate}%`} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Clean sheets" value={stats.cleanSheets} ink={GREEN} />
        <Tile label="Blanks" value={stats.failedToScore} sub="failed to score" />
        <Tile label="Best streak" value={stats.longestWinStreak} sub="wins in a row" />
        <Tile label="Unbeaten run" value={stats.longestUnbeatenRun} sub="games" />
      </div>

      {/* points progression chart */}
      {chartData.length > 1 && (
        <div className="mt-3 border px-3 pt-3 pb-1" style={{ borderColor: LINE, background: CREAM }}>
          <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: SOFT }}>Points by matchday</div>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <XAxis dataKey="md" tick={{ fontSize: 10, fill: SOFT }} stroke={LINE} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: SOFT }} stroke={LINE} width={34} />
              <Tooltip
                contentStyle={{ background: INK, border: 'none', borderRadius: 3, fontSize: 11, color: CREAM }}
                labelStyle={{ color: '#E5C96B' }}
                formatter={(v) => [`${v} pts`, '']}
                labelFormatter={(l) => `Matchday ${l}`}
              />
              <Line type="monotone" dataKey="pts" stroke={BRICK} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* form strip */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: SOFT }}>Form</span>
        <div className="flex flex-wrap gap-1">
          {stats.form.map((r, i) => (
            <span key={i} className="font-stamp grid h-[18px] w-[18px] place-items-center text-[10px]"
              style={{ background: r === 'W' ? GREEN : r === 'D' ? '#8A7D63' : BRICK, color: CREAM, borderRadius: 2 }}>
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* standout results + venue splits */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {stats.biggestWin && (
          <div className="border px-3 py-2.5" style={{ borderColor: LINE, background: CREAM }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: GREEN }}>Biggest win</div>
            <div className="mt-0.5 text-[13px]" style={{ color: INK }}>
              <b>{stats.biggestWin.forGoals}–{stats.biggestWin.againstGoals}</b> {stats.biggestWin.home ? 'vs' : 'at'} {name(stats.biggestWin.oppId)}
            </div>
          </div>
        )}
        {stats.heaviestDefeat && (
          <div className="border px-3 py-2.5" style={{ borderColor: LINE, background: CREAM }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: BRICK }}>Heaviest defeat</div>
            <div className="mt-0.5 text-[13px]" style={{ color: INK }}>
              <b>{stats.heaviestDefeat.forGoals}–{stats.heaviestDefeat.againstGoals}</b> {stats.heaviestDefeat.home ? 'vs' : 'at'} {name(stats.heaviestDefeat.oppId)}
            </div>
          </div>
        )}
        <div className="border px-3 py-2.5" style={{ borderColor: LINE, background: CREAM }}>
          <div className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: SOFT }}>Home</div>
          <div className="mt-0.5 font-stamp text-[15px]" style={{ color: INK }}>{rec(stats.home)}</div>
        </div>
        <div className="border px-3 py-2.5" style={{ borderColor: LINE, background: CREAM }}>
          <div className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: SOFT }}>Away</div>
          <div className="mt-0.5 font-stamp text-[15px]" style={{ color: INK }}>{rec(stats.away)}</div>
        </div>
      </div>
    </div>
  );
}
