import type { GoalEvent } from '../types';

/**
 * A 0'→90' match clock for a single result: a hand sweeps across (~0.8s, faster than the reveal
 * cadence) while each goal pops in at its minute — the user's above the line (green), the opponent's
 * below (brick). Render it keyed by match id so it replays on every reveal.
 */
export function MatchTimeline({ goals, userTeamId }: { goals: GoalEvent[]; userTeamId: string }) {
  // 0'..~95' mapped across the track, clamped so end-of-game goals stay on screen.
  const pos = (min: number) => `${Math.min(97, Math.max(2, (min / 95) * 100))}%`;
  const delay = (min: number) => `${Math.min(0.78, (min / 95) * 0.8).toFixed(2)}s`;
  return (
    <div className="relative mx-5 mb-1 mt-2 h-10" data-testid="match-timeline">
      {/* the running clock line + the sweeping hand */}
      <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2" style={{ background: '#D8CBAD' }} />
      <div className="absolute top-1/2 h-[2px] -translate-y-1/2" style={{ left: 0, width: 0, background: '#1D2B45', animation: 'clockSweep .8s linear forwards' }} />
      {/* minute ticks */}
      <span className="absolute bottom-0 text-[8px] tracking-[0.1em]" style={{ left: 0, color: '#6B5F4A' }}>0'</span>
      <span className="absolute bottom-0 -translate-x-1/2 text-[8px]" style={{ left: '50%', color: '#6B5F4A' }}>HT</span>
      <span className="absolute bottom-0 text-[8px]" style={{ right: 0, color: '#6B5F4A' }}>FT</span>
      {goals.map((g, i) => {
        const isUser = g.teamId === userTeamId;
        const ink = isUser ? '#3E7A4E' : '#A83E2C';
        return (
          <div
            key={i}
            data-goal={isUser ? 'user' : 'opp'}
            className="absolute flex flex-col items-center"
            style={{ left: pos(g.minute), top: isUser ? 0 : 'auto', bottom: isUser ? 'auto' : 0, transform: 'translateX(-50%)', animation: `goalPop .2s ease-out ${delay(g.minute)} both` }}
            title={`${g.minute}' ${g.scorerName}${g.assistName ? ` (${g.assistName})` : ''}`}
          >
            <span className="grid h-[15px] w-[15px] place-items-center text-[9px]" style={{ background: ink, color: '#FDFAF1', borderRadius: '50%' }}>⚽</span>
            <span className="text-[8px] font-bold" style={{ color: ink }}>{g.minute}'</span>
          </div>
        );
      })}
    </div>
  );
}
