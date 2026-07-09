import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ProgrammeNav, ProgrammeFooter } from '../components/chrome/ProgrammeChrome';
import { RaffleDrum, LEAGUE_INKS } from '../components/chrome/RaffleDrum';
import { loadIndex } from '../data/historicalData';

const LEAGUE_BADGES = [
  { id: 'premier-league', code: 'EN', label: 'PREMIER' },
  { id: 'bundesliga', code: 'DE', label: 'BUNDES' },
  { id: 'la-liga', code: 'ES', label: 'LA LIGA' },
  { id: 'serie-a', code: 'IT', label: 'SERIE A' },
  { id: 'ligue-1', code: 'FR', label: 'LIGUE 1' },
];

const ACTS = [
  { n: '1', title: 'Spin the drum', body: 'The tombola lands on a real club-season — Barcelona 2014-15, Dortmund 2012-13, anyone.' },
  { n: '2', title: 'Draft one sticker', body: 'Pick a single player from that squad and stick him into a slot in your formation.' },
  { n: '3', title: 'Complete the XI', body: 'Eleven spins, eleven stickers. Fill the album page and name your side.' },
  { n: '4', title: 'Play the season', body: '38 fixtures, live xG and win odds. Chase the perfect, unbeaten year.' },
];

export default function Home() {
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  useEffect(() => {
    loadIndex().then((entries) => setTicketCount(entries.length)).catch(() => setTicketCount(null));
  }, []);

  return (
    <div className="flex min-h-svh flex-col">
      <ProgrammeNav />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 pb-10 pt-10 sm:px-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <div>
            <div
              className="font-stamp inline-flex -rotate-[1.5deg] items-center gap-2.5 border-[1.5px] px-3 py-1.5 text-xs"
              style={{ borderColor: 'var(--brick)', color: 'var(--brick)' }}
            >
              ★ SPIN · DRAFT · SIMULATE
            </div>
            <h1
              className="font-display mt-6 font-black leading-[0.95] tracking-[-0.015em]"
              style={{ fontSize: 'clamp(52px,7.5vw,104px)', color: 'var(--ink)' }}
            >
              Every squad
              <br />
              you never
              <br />
              <span className="font-medium italic" style={{ color: 'var(--brick)' }}>
                got to pick.
              </span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed" style={{ color: 'var(--text)' }}>
              Spin the drum, land on a real club-season from three decades of European football, and
              stick one of its players into your album. Eleven spins later — can your XI go 38 games
              unbeaten?
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link
                to="/setup"
                className="inline-flex items-center gap-4 px-5 py-4 pl-8 text-base font-bold uppercase tracking-[0.06em] no-underline transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5"
                style={{
                  background: 'var(--btn-bg)',
                  color: 'var(--btn-fg)',
                  boxShadow: '5px 5px 0 var(--btn-shadow)',
                }}
              >
                Gates open — take your seat
                <span
                  className="font-stamp border-l-[1.5px] border-dashed pl-4 text-sm"
                  style={{ borderColor: 'var(--btn-divider)' }}
                >
                  →
                </span>
              </Link>
              <span className="text-[12.5px]" style={{ color: 'var(--soft)' }}>
                Free · in your browser · one sitting
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <RaffleDrum
              size={300}
              idle
              topLabel="EST. 1990"
              label="SPIN"
              subLabel={ticketCount ? `${ticketCount.toLocaleString()} CLUB-SEASONS` : 'LOADING THE DRUM…'}
            />
            <div className="flex items-end gap-3.5">
              {LEAGUE_BADGES.map((b) => (
                <div key={b.id} className="flex flex-col items-center gap-1.5">
                  <span
                    className="font-stamp grid h-[47px] w-[40px] place-items-center pb-2 text-xs"
                    style={{
                      background: LEAGUE_INKS[b.id],
                      color: '#F6EFDF',
                      clipPath: 'polygon(0 0,100% 0,100% 68%,50% 100%,0 68%)',
                      boxSizing: 'border-box',
                    }}
                  >
                    {b.code}
                  </span>
                  <span className="text-[9.5px] tracking-[0.08em]" style={{ color: 'var(--soft)' }}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 border-t-[3px] pt-2.5 sm:mt-20" style={{ borderColor: 'var(--ink)', borderTopStyle: 'double' }}>
          <div
            className="mb-6 flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em]"
            style={{ color: 'var(--soft)' }}
          >
            <span>How the matchday runs</span>
            <span>Four acts</span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            {ACTS.map((act) => (
              <div
                key={act.n}
                className="border p-5"
                style={{
                  background: '#FDFAF1',
                  borderColor: '#D8CBAD',
                  boxShadow: '4px 4px 0 var(--card-shadow)',
                }}
              >
                <div className="font-stamp text-[26px]" style={{ color: '#A83E2C' }}>{act.n}</div>
                <div className="font-display my-1.5 text-[21px] font-bold" style={{ color: '#1D2B45' }}>
                  {act.title}
                </div>
                <p className="m-0 text-[13.5px] leading-relaxed" style={{ color: '#3C3325' }}>{act.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <ProgrammeFooter />
    </div>
  );
}
