export const LEAGUE_INKS: Record<string, string> = {
  'premier-league': '#4A3070',
  'bundesliga': '#A83E2C',
  'la-liga': '#B4691E',
  'serie-a': '#2F5D8A',
  'ligue-1': '#3E7A4E',
};

export const POSITION_INKS: Record<string, string> = {
  GK: '#6B5F4A',
  DF: '#2F5D8A',
  MF: '#3E7A4E',
  FW: '#A83E2C',
};

interface DrumProps {
  size: number;
  label: string;
  subLabel: string;
  topLabel?: string;
  /** Accumulated rotation in degrees; transition applied while spinning. */
  rotation?: number;
  spinning?: boolean;
  idle?: boolean;
}

export function RaffleDrum({ size, label, subLabel, topLabel = 'CLUB · SEASON', rotation = 0, spinning = false, idle = false }: DrumProps) {
  const inset = Math.round(size * 0.105);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute left-1/2 z-[3] -translate-x-1/2"
        style={{
          top: -6,
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '20px solid #A83E2C',
          filter: 'drop-shadow(0 2px 0 rgba(29,43,69,.4))',
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(#4A3070 0 72deg,#A83E2C 72deg 144deg,#B4691E 144deg 216deg,#2F5D8A 216deg 288deg,#3E7A4E 288deg 360deg)',
          border: `${Math.max(8, Math.round(size * 0.035))}px solid var(--drum-rim)`,
          boxShadow: '0 14px 30px -10px rgba(0,0,0,.45), inset 0 0 0 4px #F6EFDF',
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 4.2s cubic-bezier(.12,.8,.16,1)' : 'none',
          animation: idle ? 'drumIdle 5s ease-in-out infinite' : undefined,
        }}
      />
      <div
        className="absolute flex flex-col items-center justify-center gap-0.5 rounded-full"
        style={{
          inset,
          background: 'radial-gradient(circle at 38% 32%,#FDFAF1,#EDE3CB 70%)',
          border: '2px solid #1D2B45',
        }}
      >
        <span className="text-[9px] tracking-[0.18em]" style={{ color: '#6B5F4A' }}>{topLabel}</span>
        <span className="font-stamp" style={{ fontSize: Math.round(size * 0.11), color: '#1D2B45' }}>{label}</span>
        <span className="text-[9.5px] tracking-[0.12em]" style={{ color: '#A83E2C' }}>{subLabel}</span>
      </div>
    </div>
  );
}
