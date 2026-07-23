import type { CupTie } from '../engine/cup';
import type { GoalEvent } from '../types';
import { MatchTimeline } from './MatchTimeline';

const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const GREEN = '#3E7A4E';

function OvrChip({ ovr, ink }: { ovr: number; ink: string }) {
  if (!ovr) return null;
  return <span className="font-stamp inline-block px-1.5 py-0.5 text-[12px] leading-none" style={{ background: ink, color: CREAM, borderRadius: 3 }}>{ovr}</span>;
}

/**
 * A knockout tie shown as a matchday card — from the user's perspective, with OVR chips, the score
 * (and penalties), the goal-by-goal timeline, and a result-coloured THROUGH/KNOCKED OUT footer.
 * Green when the user advances, brick when they go out. Shared by the domestic cup and the UCL.
 */
export function KnockoutTieCard({
  tie, userId, userName, teamNames, ovrOf, roundIndex, totalRounds, leagueInk,
}: {
  tie: CupTie;
  userId: string;
  userName: string;
  teamNames: Map<string, string>;
  ovrOf?: (id: string) => number | undefined;
  roundIndex: number;
  totalRounds: number;
  leagueInk: string;
}) {
  const r = tie.result;
  const userHome = tie.homeId === userId;
  const oppId = userHome ? tie.awayId : tie.homeId;
  const uG = userHome ? r.homeGoals : r.awayGoals;
  const oG = userHome ? r.awayGoals : r.homeGoals;
  const won = tie.winnerId === userId;
  const pens = r.penalties;
  const uP = pens ? (userHome ? pens.home : pens.away) : null;
  const oP = pens ? (userHome ? pens.away : pens.home) : null;
  const border = won ? GREEN : BRICK;
  const tint = won ? '#EAF3EC' : '#F8EAE5';
  const goals: GoalEvent[] = r.goals.map((g) => ({
    minute: g.minute, teamId: g.side === 'home' ? tie.homeId : tie.awayId,
    scorerId: g.scorerId, scorerName: g.scorerName, assistId: g.assistId, assistName: g.assistName,
  }));

  return (
    <div key={roundIndex} className="mb-6 w-full max-w-[560px]" style={{ background: tint, border: `2px solid ${border}`, boxShadow: '6px 6px 0 var(--card-shadow)', animation: 'ticketOut .35s cubic-bezier(.2,1.1,.4,1)' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: leagueInk, color: CREAM }}>
        <span className="font-stamp text-[12px] tracking-[0.1em]">{tie.round}{r.wentToExtraTime ? ' · AET' : ''}</span>
        <span className="text-[10px] tracking-[0.14em] opacity-85">round {roundIndex} / {totalRounds}</span>
      </div>
      <div className="grid items-center gap-3 px-5 py-7" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <div className="flex flex-col items-start gap-1 text-left">
          <span className="font-display text-[20px] font-extrabold leading-tight" style={{ color: BRICK }}>★ {userName}</span>
          <OvrChip ovr={ovrOf?.(userId) ?? 0} ink={BRICK} />
        </div>
        <div className="flex flex-col items-center">
          <span className="font-stamp text-[40px] leading-none" style={{ color: INK }}>{uG}–{oG}</span>
          {pens && <span className="mt-1 text-[10.5px]" style={{ color: '#3C3325' }}>pens {uP}–{oP}</span>}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="font-display text-[20px] font-extrabold leading-tight" style={{ color: INK }}>{teamNames.get(oppId)}</span>
          <OvrChip ovr={ovrOf?.(oppId) ?? 0} ink={leagueInk} />
        </div>
      </div>
      {goals.length > 0
        ? <MatchTimeline goals={goals} userTeamId={userId} />
        : <div className="mx-5 mb-1 mt-2 h-10 text-center text-[9.5px] italic leading-[2.6rem]" style={{ color: '#6B5F4A' }}>Goalless — settled without a goal.</div>}
      <div className="flex items-center justify-center border-t py-2.5" style={{ borderColor: border + '55' }}>
        <span className="font-stamp px-3 py-1 text-[14px]" style={{ background: border, color: CREAM, borderRadius: 3 }}>
          {won ? 'THROUGH' : 'KNOCKED OUT'}{pens ? ' · ON PENALTIES' : ''}
        </span>
      </div>
    </div>
  );
}

/** Play / pause / next / skip controls for a round-by-round reveal, matching the league ticker. */
export function RevealControls({ playing, onToggle, onNext, onSkip, atEnd, skipLabel = 'Skip to final ⏭' }: {
  playing: boolean;
  onToggle: () => void;
  onNext: () => void;
  onSkip: () => void;
  atEnd: boolean;
  skipLabel?: string;
}) {
  return (
    <div className="mt-5 flex items-center gap-2">
      <button type="button" onClick={onToggle} disabled={atEnd} className="cursor-pointer border px-3 py-1.5 text-[12px] font-bold uppercase disabled:opacity-40" style={{ borderColor: INK, color: INK }}>
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>
      <button type="button" onClick={onNext} disabled={atEnd} className="cursor-pointer border px-3 py-1.5 text-[12px] font-bold uppercase disabled:opacity-40" style={{ borderColor: INK, color: INK }}>
        Next round ▸
      </button>
      <button type="button" onClick={onSkip} disabled={atEnd} className="cursor-pointer border-0 px-3 py-1.5 text-[12px] font-bold uppercase disabled:opacity-40" style={{ background: BRICK, color: CREAM }}>
        {skipLabel}
      </button>
    </div>
  );
}
