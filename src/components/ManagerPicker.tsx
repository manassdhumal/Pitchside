import { MANAGERS } from '../data/managers';

const line = (v: number) => (v > 0 ? `+${v}` : `${v}`);
const pct = (mult: number) => { const d = Math.round((mult - 1) * 100); return d === 0 ? '±0%' : d > 0 ? `+${d}%` : `${d}%`; };

/**
 * The gaffer picker, shared by the domestic season and the Champions League. Each card shows the
 * per-line rating deltas plus the tactical tempo (⚔ goals / 🛡 conceded) and a one-line trade-off, so
 * the choice is legible. Clicking the selected manager again clears it (kick off without one).
 */
export function ManagerPicker({ managerId, onSelect, heading = 'Appoint your gaffer' }: {
  managerId: string | null;
  onSelect: (id: string | null) => void;
  heading?: string;
}) {
  return (
    <div className="mx-auto mb-7 max-w-[640px]">
      <div className="mb-2.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: '#A83E2C' }}>{heading}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {MANAGERS.map((mgr) => {
          const sel = managerId === mgr.id;
          return (
            <button
              key={mgr.id}
              type="button"
              onClick={() => onSelect(sel ? null : mgr.id)}
              className="cursor-pointer border-[1.5px] px-3 py-2.5 text-left transition-transform hover:-translate-y-0.5"
              style={{ borderColor: sel ? '#A83E2C' : '#D8CBAD', background: sel ? '#F5E9C8' : '#FDFAF1', outline: sel ? '2px solid #A83E2C' : 'none', outlineOffset: 1 }}
            >
              <div className="font-display text-[15px] font-extrabold leading-tight" style={{ color: '#1D2B45' }}>{mgr.name}</div>
              <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: '#6B5F4A' }}>{mgr.style}</div>
              <div className="mt-1 flex gap-1.5 font-stamp text-[10px]">
                <span style={{ color: mgr.def >= 0 ? '#3E7A4E' : '#A83E2C' }}>DEF {line(mgr.def)}</span>
                <span style={{ color: mgr.mid >= 0 ? '#3E7A4E' : '#A83E2C' }}>MID {line(mgr.mid)}</span>
                <span style={{ color: mgr.atk >= 0 ? '#3E7A4E' : '#A83E2C' }}>ATK {line(mgr.atk)}</span>
              </div>
              {/* tactical tempo: how the match model itself bends (goals scored / conceded) */}
              <div className="mt-1 flex gap-1.5 font-stamp text-[9.5px]" title="How this style bends match tempo">
                <span style={{ color: mgr.shape.attack >= 1 ? '#3E7A4E' : '#A83E2C' }}>⚔ {pct(mgr.shape.attack)}</span>
                <span style={{ color: mgr.shape.concede <= 1 ? '#3E7A4E' : '#A83E2C' }}>🛡 {pct(mgr.shape.concede)}</span>
              </div>
              <div className="mt-0.5 text-[9.5px] italic leading-snug" style={{ color: '#6B5F4A' }}>{mgr.tradeoff}</div>
            </button>
          );
        })}
      </div>
      {!managerId && <p className="mt-2 text-[11px] italic" style={{ color: '#6B5F4A' }}>Pick a gaffer, or kick off without one.</p>}
    </div>
  );
}
