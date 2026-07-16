import type { CupTie } from '../engine/cup';

/** One knockout tie in the bracket: the two sides stacked, winner in bold, the user's side flagged. */
export function TieCard({ tie, userId, teamNames, seedById }: {
  tie: CupTie; userId: string; teamNames: Map<string, string>; seedById: Record<string, number>;
}) {
  const rows = [
    { id: tie.homeId, g: tie.result.homeGoals, p: tie.result.penalties?.home },
    { id: tie.awayId, g: tie.result.awayGoals, p: tie.result.penalties?.away },
  ];
  return (
    <div style={{ background: '#FDFAF1', border: `${tie.userInvolved ? 2 : 1}px solid ${tie.userInvolved ? '#A83E2C' : '#D8CBAD'}`, boxShadow: '2px 2px 0 var(--card-shadow)', borderRadius: 3 }}>
      {rows.map((r, i) => {
        const won = tie.winnerId === r.id;
        const you = r.id === userId;
        return (
          <div key={r.id} className="flex items-center gap-1.5 px-2 py-1.5" style={{ borderBottom: i === 0 ? '1px solid #EDE3CB' : 'none', opacity: won ? 1 : 0.62 }}>
            <span className="font-stamp text-[9px]" style={{ color: '#9A8C6E', minWidth: 14, textAlign: 'right' }}>{seedById[r.id]}</span>
            <span className="flex-1 truncate text-[12.5px] leading-tight" style={{ fontWeight: won ? 700 : 500, color: you ? '#A83E2C' : '#1D2B45' }}>
              {you ? '★ ' : ''}{teamNames.get(r.id) ?? r.id}
            </span>
            <span className="font-stamp text-[13px]" style={{ color: '#1D2B45' }}>{r.g}{tie.result.penalties ? ` (${r.p})` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

/** The seeded knockout bracket as horizontally-scrollable round columns, revealed left-to-right. */
export function CupBracket({ rounds, revealed, userId, teamNames, seedById }: {
  rounds: CupTie[][]; revealed: number; userId: string; teamNames: Map<string, string>; seedById: Record<string, number>;
}) {
  const shown = rounds.slice(0, Math.max(0, revealed));
  if (!shown.length) return null;
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="mx-auto flex w-max gap-4">
        {shown.map((round, ri) => (
          <div key={ri} className="flex flex-col" style={{ minWidth: 186 }}>
            <div className="font-stamp mb-2.5 pb-1 text-center text-[11px] tracking-[0.12em]" style={{ color: '#6B5F4A', borderBottom: '1px solid #D8CBAD' }}>
              {round[0].round}
            </div>
            <div className="flex flex-1 flex-col justify-around gap-2.5">
              {round.map((tie, ti) => (
                <TieCard key={ti} tie={tie} userId={userId} teamNames={teamNames} seedById={seedById} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
