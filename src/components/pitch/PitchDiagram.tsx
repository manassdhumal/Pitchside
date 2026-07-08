import type { Formation } from '../../types';
import { FORMATION_SLOTS } from '../../data/formations';

export interface PitchSlotContent {
  label: string;
  sublabel?: string;
  filled: boolean;
  highlighted?: boolean;
}

interface Props {
  formation: Formation;
  /** One entry per slot, in FORMATION_SLOTS order. Defaults to showing the bare position label. */
  slotContent?: PitchSlotContent[];
  onSlotClick?: (slotIndex: number) => void;
}

export function PitchDiagram({ formation, slotContent, onSlotClick }: Props) {
  const slots = FORMATION_SLOTS[formation];

  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-neutral-700 bg-gradient-to-b from-green-800 to-green-900">
      <div className="absolute inset-0 border-2 border-white/20 m-3 rounded" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
      {slots.map((slot, i) => {
        const content = slotContent?.[i];
        const clickable = !!onSlotClick;
        return (
          <button
            key={i}
            type="button"
            disabled={!clickable}
            onClick={() => onSlotClick?.(i)}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 ${clickable ? 'cursor-pointer' : ''}`}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-[10px] font-bold shadow ${
                content?.filled
                  ? 'border-emerald-400 bg-emerald-500/90 text-white'
                  : content?.highlighted
                    ? 'border-amber-400 bg-amber-500/30 text-amber-200 animate-pulse'
                    : 'border-white/50 bg-black/40 text-white/90'
              }`}
            >
              {content?.label ?? slot.position}
            </span>
            {content?.sublabel && (
              <span className="max-w-[64px] truncate text-[9px] text-white/80">{content.sublabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
