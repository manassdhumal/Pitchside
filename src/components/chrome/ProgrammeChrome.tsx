import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useFloodlights } from '../../state/useFloodlights';

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

export function FloodlightsToggle() {
  const [night, toggle] = useFloodlights();
  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle green night mode"
      className="flex cursor-pointer items-center gap-2 border-[1.5px] bg-transparent px-2.5 py-1 hover:border-[var(--brick)]"
      style={{ borderColor: 'var(--toggle-border)', color: 'var(--ink)' }}
    >
      <span className="font-stamp text-[9.5px] tracking-[0.08em]">
        {night ? 'FLOODLIGHTS ON' : 'FLOODLIGHTS OFF'}
      </span>
      <span
        className="relative inline-block h-[18px] w-[34px] border"
        style={{ background: 'var(--toggle-track)', borderColor: 'var(--toggle-border)' }}
      >
        <span
          className="absolute top-[1px] grid h-[14px] w-[14px] place-items-center text-[8px] leading-none transition-[left] duration-150"
          style={{ left: night ? 17 : 1, background: 'var(--knob-bg)' }}
        >
          {night ? '☾' : '☀'}
        </span>
      </span>
    </button>
  );
}

interface NavProps {
  /** Left side content (breadcrumb / back link). Defaults to the programme masthead line. */
  left?: ReactNode;
  /** Extra content rendered before the floodlights toggle on the right. */
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
        <FloodlightsToggle />
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
