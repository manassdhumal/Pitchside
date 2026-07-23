import { useEffect, useRef, useState } from 'react';
import type { CupTie } from '../engine/cup';

const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const GREEN = '#3E7A4E';

export interface LiveGoal {
  minute: number;
  side: 'user' | 'opp';
  scorerName: string;
  assistName?: string;
}

export interface LiveMatchProps {
  roundLabel: string;
  userName: string;
  oppName: string;
  userOvr?: number;
  oppOvr?: number;
  goals: LiveGoal[];
  finalUser: number;
  finalOpp: number;
  pens?: { user: number; opp: number } | null;
  wentToExtraTime?: boolean;
  won: boolean;
  leagueInk: string;
  /** How long the match takes to "play out" (5–10s feel). */
  durationMs?: number;
  onDone: () => void;
}

/** Normalise a cup tie (from the user's perspective) into live-sim props. */
export function tieToLive(tie: CupTie, userId: string, oppName: string, userName: string, userOvr?: number, oppOvr?: number, leagueInk = INK): Omit<LiveMatchProps, 'onDone'> {
  const userHome = tie.homeId === userId;
  const r = tie.result;
  const goals: LiveGoal[] = r.goals
    .map((g) => ({ minute: g.minute, side: (g.side === 'home') === userHome ? 'user' as const : 'opp' as const, scorerName: g.scorerName, assistName: g.assistName }))
    .sort((a, b) => a.minute - b.minute);
  const pens = r.penalties ? { user: userHome ? r.penalties.home : r.penalties.away, opp: userHome ? r.penalties.away : r.penalties.home } : null;
  return {
    roundLabel: tie.round, userName, oppName, userOvr, oppOvr, goals,
    finalUser: userHome ? r.homeGoals : r.awayGoals,
    finalOpp: userHome ? r.awayGoals : r.homeGoals,
    pens, wentToExtraTime: r.wentToExtraTime, won: tie.winnerId === userId, leagueInk,
  };
}

function Chip({ ovr, ink }: { ovr?: number; ink: string }) {
  if (!ovr) return null;
  return <span className="font-stamp inline-block px-1.5 py-0.5 text-[12px] leading-none" style={{ background: ink, color: CREAM, borderRadius: 3 }}>{ovr}</span>;
}

/**
 * Plays a pre-computed match "live" over ~7s: the clock runs 0'→90' (→120' for extra time), the
 * score ticks up as each goal's minute is reached with a flashed commentary line, then the full-time
 * result lands (green THROUGH / brick KNOCKED OUT) and `onDone` fires so the parent can offer "Next".
 */
export function LiveMatchSim(props: LiveMatchProps) {
  const { roundLabel, userName, oppName, userOvr, oppOvr, goals, pens, wentToExtraTime, won, leagueInk, durationMs = 7000, onDone } = props;
  const maxMinute = wentToExtraTime ? 120 : 90;
  const [minute, setMinute] = useState(0);
  const [ft, setFt] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setMinute(Math.round(p * maxMinute));
      if (p < 1) raf = requestAnimationFrame(tick);
      else if (!doneRef.current) { doneRef.current = true; setFt(true); onDone(); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, maxMinute]);

  const shown = goals.filter((g) => g.minute <= minute);
  const uScore = shown.filter((g) => g.side === 'user').length;
  const oScore = shown.filter((g) => g.side === 'opp').length;
  const last = shown[shown.length - 1];
  const commentary = ft
    ? 'FULL TIME'
    : last && last.minute > minute - 4
      ? `${last.minute}'  ${last.side === 'user' ? '★ ' : ''}${last.scorerName}${last.assistName ? ` (${last.assistName})` : ''}`
      : minute === 0 ? 'KICK OFF' : minute >= 45 && minute <= 48 ? 'HALF TIME' : minute >= 90 && wentToExtraTime && minute <= 93 ? 'EXTRA TIME' : 'in play…';
  const border = ft ? (won ? GREEN : BRICK) : leagueInk;
  const tint = ft ? (won ? '#EAF3EC' : '#F8EAE5') : CREAM;

  return (
    <div className="mb-6 w-full max-w-[560px]" style={{ background: tint, border: `2px solid ${border}`, boxShadow: '6px 6px 0 var(--card-shadow)' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: leagueInk, color: CREAM }}>
        <span className="font-stamp text-[12px] tracking-[0.1em]">{roundLabel}{wentToExtraTime && ft ? ' · AET' : ''}</span>
        <span className="flex items-center gap-1.5 text-[11px] tracking-[0.14em]">
          {!ft && <span className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: '#e24b4a', animation: 'wobble 1s ease-in-out infinite' }} />}
          {ft ? 'FT' : `${minute}'`}
        </span>
      </div>

      <div className="grid items-center gap-3 px-5 py-6" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <div className="flex flex-col items-start gap-1 text-left">
          <span className="font-display text-[20px] font-extrabold leading-tight" style={{ color: BRICK }}>★ {userName}</span>
          <Chip ovr={userOvr} ink={BRICK} />
        </div>
        <div className="flex flex-col items-center">
          <span className="font-stamp text-[44px] leading-none tabular-nums" style={{ color: INK }}>{uScore}–{oScore}</span>
          {ft && pens && <span className="mt-1 text-[10.5px]" style={{ color: '#3C3325' }}>pens {pens.user}–{pens.opp}</span>}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="font-display text-[20px] font-extrabold leading-tight" style={{ color: INK }}>{oppName}</span>
          <Chip ovr={oppOvr} ink={leagueInk} />
        </div>
      </div>

      {/* the running clock with goal ticks */}
      <div className="relative mx-5 mb-2 h-2">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2" style={{ background: '#D8CBAD' }} />
        <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2" style={{ width: `${(minute / maxMinute) * 100}%`, background: INK, transition: 'width .08s linear' }} />
        {goals.map((g, i) => (
          <span key={i} className="absolute top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full border"
            style={{ left: `calc(${(g.minute / maxMinute) * 100}% - 5px)`, background: g.minute <= minute ? (g.side === 'user' ? GREEN : BRICK) : 'transparent', borderColor: g.side === 'user' ? GREEN : BRICK }} />
        ))}
      </div>

      <div className="px-5 pb-3 text-center">
        <span className="font-stamp text-[12.5px] tracking-[0.06em]" style={{ color: ft ? border : '#3C3325' }}>{commentary}</span>
      </div>

      {ft && (
        <div className="flex items-center justify-center border-t py-2.5" style={{ borderColor: border + '55' }}>
          <span className="font-stamp px-3 py-1 text-[14px]" style={{ background: border, color: CREAM, borderRadius: 3 }}>
            {won ? 'THROUGH' : 'KNOCKED OUT'}{pens ? ' · ON PENALTIES' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
