import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme, THEMES } from '../../state/useTheme';
import { useAuth } from '../../state/AuthContext';

/** The manager's controls in the nav: history link, plus who they are — a signed-in username with
 * Sign out, or a Guest badge with a Sign in prompt. */
function UserMenu() {
  const { user, isGuest, logout, exitGuest } = useAuth();
  if (!user && !isGuest) return null;
  return (
    <div className="flex items-center gap-2.5">
      <Link to="/career" className="text-[11px] uppercase tracking-[0.12em] no-underline hover:text-[var(--brick)]" style={{ color: 'var(--ink)' }}>My Career</Link>
      <span className="opacity-40">·</span>
      {user ? (
        <>
          <span className="text-[11px] normal-case" style={{ color: 'var(--soft)' }} title={`Signed in as ${user.username}`}>{user.username}</span>
          <button
            type="button" onClick={() => void logout()}
            className="cursor-pointer border-[1.5px] bg-transparent px-2 py-0.5 text-[9.5px] uppercase tracking-[0.08em] hover:border-[var(--brick)]"
            style={{ borderColor: 'var(--toggle-border)', color: 'var(--ink)' }}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <span className="text-[11px]" style={{ color: 'var(--soft)' }}>Guest</span>
          <button
            type="button" onClick={exitGuest}
            className="cursor-pointer border-[1.5px] bg-transparent px-2 py-0.5 text-[9.5px] uppercase tracking-[0.08em] hover:border-[var(--brick)]"
            style={{ borderColor: 'var(--toggle-border)', color: 'var(--ink)' }}
          >
            Sign in
          </button>
        </>
      )}
    </div>
  );
}

/** The brand lockup: the "P" monogram mark + PitchSide wordmark, linking home. Shown in every nav. */
export function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2 no-underline" title="PitchSide — home">
      <img src="/favicon.svg" width={26} height={26} alt="PitchSide" style={{ display: 'block' }} />
      <span className="font-display text-[19px] font-extrabold leading-none" style={{ color: 'var(--ink)', textTransform: 'none', letterSpacing: '-0.01em' }}>
        PitchSide
      </span>
    </Link>
  );
}

/** A 3-stripe theme swatch: the paper colour with two accent bars, so the picker previews each
 * palette accurately (not just the currently-active one). */
function Swatch({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="inline-flex h-[18px] w-[28px] items-center justify-center gap-[3px] border" style={{ background: colors[0], borderColor: 'var(--toggle-border)' }} aria-hidden="true">
      <span className="h-[10px] w-[3px]" style={{ background: colors[1] }} />
      <span className="h-[10px] w-[3px]" style={{ background: colors[2] }} />
    </span>
  );
}

/** Theme picker: keeps the old control's shell, but opens a dropdown to pick any theme from a list,
 * each row previewed by its own swatch. Closes on outside click or Escape. */
export function ThemePicker() {
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${current.name}. Change theme`}
        title="Change theme"
        className="flex cursor-pointer items-center gap-2 border-[1.5px] bg-transparent px-2.5 py-1 hover:border-[var(--brick)]"
        style={{ borderColor: 'var(--toggle-border)', color: 'var(--ink)' }}
      >
        <span className="font-stamp text-[9.5px] tracking-[0.08em]">THEME · {current.name.toUpperCase()}</span>
        <Swatch colors={current.swatch} />
        <span className="text-[8px] leading-none" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose a theme"
          className="absolute right-0 z-50 mt-1 max-h-[70vh] w-[188px] overflow-y-auto border py-1"
          style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '4px 4px 0 var(--card-shadow)' }}
        >
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className="flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-3 py-1.5 text-left hover:bg-[var(--panel)]"
                style={{ color: 'var(--ink)' }}
              >
                <Swatch colors={t.swatch} />
                <span className="flex-1 text-[12px] font-semibold">{t.name}</span>
                {active && <span className="font-stamp text-[11px]" style={{ color: 'var(--brick)' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface NavProps {
  /** Left side content (breadcrumb / back link). Defaults to the programme masthead line. */
  left?: ReactNode;
  /** Extra content rendered before the theme picker on the right. */
  right?: ReactNode;
}

export function ProgrammeNav({ left, right }: NavProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2.5 border-b px-5 py-3 text-[11px] uppercase tracking-[0.16em] sm:px-8"
      style={{ borderColor: 'var(--line)', color: 'var(--soft)' }}
    >
      <div className="flex flex-wrap items-center gap-3.5">
        <BrandMark />
        {left && <span className="opacity-40">·</span>}
        {left ?? <span>Official Matchday Programme · № 001</span>}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {right}
        <UserMenu />
        <ThemePicker />
      </div>
    </div>
  );
}

export function ProgrammeFooter() {
  return (
    <footer
      className="flex flex-wrap justify-between gap-6 border-t px-5 py-3.5 text-[11.5px] leading-relaxed transition-colors duration-300 sm:px-8"
      style={{ borderColor: 'var(--line)', background: 'var(--paper-deep)', color: 'var(--soft)' }}
    >
      <span className="max-w-[84ch]">
        PitchSide is a fan-made game and is not affiliated with any league, club or player. Player
        ratings are original estimates. Historical squad data adapted from Wikipedia under CC BY-SA
        4.0.
      </span>
      <span className="font-stamp whitespace-nowrap text-[10px]">PROGRAMME № 001</span>
    </footer>
  );
}
