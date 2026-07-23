import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { SeasonStats, InsightTone, PlayerStatLine, GoldenBootEntry } from '../engine/seasonStats';
import { POSITION_TO_BROAD, type Position } from '../types';

const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const GREEN = '#3E7A4E';
const LINE = '#D8CBAD';
const SOFT = '#6B5F4A';
const GOLD = '#C7A63E';

const toneColor = (tone: InsightTone) => (tone === 'good' ? GREEN : tone === 'bad' ? BRICK : SOFT);

// Line colours matching the Draft album (GK amber / DF blue / MF green / FW brick).
const LINE_INK: Record<'GK' | 'DF' | 'MF' | 'FW', string> = { GK: '#B8860B', DF: '#2F5D8A', MF: GREEN, FW: BRICK };
const posInk = (pos: Position) => LINE_INK[POSITION_TO_BROAD[pos]];

function Tile({ label, value, sub, ink = INK }: { label: string; value: string | number; sub?: string; ink?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-3 text-center" style={{ border: `1px solid ${LINE}`, background: CREAM, boxShadow: `inset 0 3px 0 ${ink}22` }}>
      <div className="font-stamp text-[25px] leading-none tabular-nums" style={{ color: ink }}>{value}</div>
      <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: SOFT }}>{label}</div>
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
      {/* verdict banner */}
      {stats.verdict && (
        <div className="mb-4 border-l-[5px] px-4 py-3" style={{ borderColor: toneColor(stats.verdict.tone), background: CREAM, boxShadow: '3px 3px 0 var(--card-shadow, #E4D9BE)' }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: SOFT }}>The verdict</div>
          <div className="font-display text-[24px] font-extrabold leading-tight" style={{ color: toneColor(stats.verdict.tone) }}>{stats.verdict.title}</div>
          <div className="mt-0.5 text-[13px] italic" style={{ color: INK }}>{stats.verdict.blurb}</div>
        </div>
      )}

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

      {/* expected goals */}
      {stats.xgFor != null && stats.xgFor > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="xG for" value={stats.xgFor.toFixed(1)} sub={`${stats.goalsFor} scored`} />
          <Tile label="xG against" value={(stats.xgAgainst ?? 0).toFixed(1)} sub={`${stats.goalsAgainst} conceded`} />
          <Tile label="Finishing" value={`${stats.goalsFor - stats.xgFor >= 0 ? '+' : ''}${(stats.goalsFor - stats.xgFor).toFixed(1)}`} sub="vs xG" ink={stats.goalsFor - stats.xgFor >= 0 ? GREEN : BRICK} />
          <Tile label="Defending" value={`${(stats.xgAgainst ?? 0) - stats.goalsAgainst >= 0 ? '+' : ''}${((stats.xgAgainst ?? 0) - stats.goalsAgainst).toFixed(1)}`} sub="vs xG" ink={(stats.xgAgainst ?? 0) - stats.goalsAgainst >= 0 ? GREEN : BRICK} />
        </div>
      )}

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

      {/* player of the season */}
      {stats.playerOfSeason && <PlayerOfSeason p={stats.playerOfSeason} />}

      {/* top scorers + playmaker */}
      {stats.players && stats.players.length > 0 && <TopScorers players={stats.players} />}

      {/* league golden boot */}
      {stats.goldenBoot && stats.goldenBoot.length > 0 && <GoldenBoot rows={stats.goldenBoot} />}

      {/* narrative insights */}
      {stats.insights && stats.insights.length > 0 && (
        <>
          <div className="mb-3 mt-5 flex items-center gap-2.5">
            <span className="font-display text-[19px] font-bold" style={{ color: INK }}>How the season went</span>
            <span className="h-px flex-1" style={{ background: LINE }} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {stats.insights.map((ins, i) => (
              <div key={i} className="flex gap-2.5 border-l-[4px] px-3 py-2.5" style={{ borderColor: toneColor(ins.tone), background: CREAM }}>
                <div>
                  <div className="text-[13px] font-bold" style={{ color: toneColor(ins.tone) }}>{ins.title}</div>
                  <div className="mt-0.5 text-[12px]" style={{ color: INK }}>{ins.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Top goalscorers (up to 6) plus the standout creator, from the attributed player stats. */
function TopScorers({ players }: { players: PlayerStatLine[] }) {
  const scorers = players.filter((p) => p.goals > 0).slice(0, 6);
  const topAssister = [...players].sort((a, b) => b.assists - a.assists)[0];
  if (scorers.length === 0) return null;
  return (
    <>
      <div className="mb-3 mt-5 flex items-center gap-2.5">
        <span className="font-display text-[19px] font-bold" style={{ color: INK }}>Who did the damage</span>
        <span className="h-px flex-1" style={{ background: LINE }} />
      </div>
      <div style={{ background: CREAM, border: `1px solid ${LINE}` }}>
        <div className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: SOFT, borderBottom: `1px solid ${LINE}` }}>
          <span />
          <span>Player</span>
          <span className="w-8 text-center">Gls</span>
          <span className="w-8 text-center">Ast</span>
        </div>
        {scorers.map((p, i) => (
          <div key={p.playerId} className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 px-3 py-2" style={{ borderTop: i === 0 ? 'none' : `1px solid #EDE3CB` }}>
            <span className="font-stamp grid h-[20px] w-[20px] place-items-center text-[11px]" style={{ background: i === 0 ? GOLD : INK, color: CREAM, borderRadius: 3 }}>{i + 1}</span>
            <span className="flex items-center gap-2 truncate">
              <span className="text-[11px] font-bold uppercase" style={{ color: posInk(p.position) }}>{p.position}</span>
              <span className="truncate text-[13.5px] font-semibold" style={{ color: INK }}>{p.name}</span>
            </span>
            <span className="font-stamp w-8 text-center text-[15px]" style={{ color: BRICK }}>{p.goals}</span>
            <span className="w-8 text-center text-[13px]" style={{ color: SOFT }}>{p.assists}</span>
          </div>
        ))}
      </div>
      {topAssister && topAssister.assists > 0 && (
        <div className="mt-2 text-[11.5px]" style={{ color: SOFT }}>
          Chief creator: <b style={{ color: INK }}>{topAssister.name}</b> with {topAssister.assists} assist{topAssister.assists === 1 ? '' : 's'}.
        </div>
      )}
    </>
  );
}

/** Player of the Season — a highlighted foil-style card for the standout performer. */
function PlayerOfSeason({ p }: { p: PlayerStatLine }) {
  return (
    <div className="mt-5 flex items-center gap-4 border-l-[5px] px-4 py-3" style={{ borderColor: GOLD, background: 'linear-gradient(100deg, #FBF3DA, #FDFAF1)', boxShadow: '3px 3px 0 var(--card-shadow, #E4D9BE)' }}>
      <div className="font-stamp grid h-[42px] w-[42px] shrink-0 place-items-center text-[20px]" style={{ background: GOLD, color: '#3B2C08', borderRadius: 4 }}>★</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#8C6A1D' }}>Player of the season</div>
        <div className="font-display truncate text-[20px] font-extrabold leading-tight" style={{ color: INK }}>{p.name}</div>
        <div className="text-[11.5px]" style={{ color: SOFT }}>
          <span className="font-bold" style={{ color: posInk(p.position) }}>{p.position}</span> · {p.goals} goal{p.goals === 1 ? '' : 's'}, {p.assists} assist{p.assists === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}

/** League-wide golden boot: top scorers across every club, the user's own players highlighted. */
function GoldenBoot({ rows }: { rows: GoldenBootEntry[] }) {
  const userBest = rows.find((r) => r.isUser);
  const userRank = userBest ? rows.indexOf(userBest) + 1 : null;
  return (
    <>
      <div className="mb-3 mt-5 flex items-center gap-2.5">
        <span className="font-display text-[19px] font-bold" style={{ color: INK }}>The Golden Boot race</span>
        <span className="h-px flex-1" style={{ background: LINE }} />
      </div>
      <div style={{ background: CREAM, border: `1px solid ${LINE}` }}>
        {rows.map((r, i) => (
          <div key={`${r.teamId}:${r.playerId}`} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 px-3 py-2"
            style={{ borderTop: i === 0 ? 'none' : `1px solid #EDE3CB`, background: r.isUser ? '#FBF3DA' : undefined }}>
            <span className="font-stamp grid h-[20px] w-[20px] place-items-center text-[11px]" style={{ background: i === 0 ? GOLD : INK, color: CREAM, borderRadius: 3 }}>{i + 1}</span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-[11px] font-bold uppercase" style={{ color: posInk(r.position) }}>{r.position}</span>
              <span className="truncate text-[13.5px] font-semibold" style={{ color: INK }}>{r.isUser ? '★ ' : ''}{r.name}</span>
              <span className="truncate text-[11px]" style={{ color: SOFT }}>· {r.teamName}</span>
            </span>
            <span className="font-stamp text-right text-[15px]" style={{ color: BRICK }}>{r.goals}</span>
          </div>
        ))}
      </div>
      {userRank && userBest && (
        <div className="mt-2 text-[11.5px]" style={{ color: SOFT }}>
          Your top scorer <b style={{ color: INK }}>{userBest.name}</b> finished {userRank === 1 ? 'top of the scoring charts 🏆' : `${ordinalLabel(userRank)} in the race`} with {userBest.goals}.
        </div>
      )}
    </>
  );
}

const ordinalLabel = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
