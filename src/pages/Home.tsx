import { Link } from 'react-router-dom';
import { LEAGUES } from '../data/leagues';

export default function Home() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center text-neutral-100">
      <span className="rounded-full border border-amber-700 bg-amber-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
        Unofficial fan draft game
      </span>
      <h1 className="mt-4 text-5xl font-bold tracking-tight">PitchSide</h1>
      <p className="mt-3 text-lg text-neutral-400">Every league. Every era. Every trophy.</p>
      <p className="mt-6 text-neutral-400">
        Spin a wheel to land on a real club from a real season, draft a real player from that squad into your
        formation, and repeat until your XI is complete. Then simulate a full season with a transparent win% / xG
        engine and see if you can go unbeaten.
      </p>
      <Link
        to="/setup"
        className="mt-8 rounded-lg bg-emerald-600 px-6 py-3 text-lg font-semibold text-white hover:bg-emerald-500"
      >
        Build your side →
      </Link>
      <div className="mt-10 flex flex-wrap justify-center gap-2 text-xs text-neutral-500">
        {LEAGUES.map((l) => (
          <span key={l.id} className="rounded-full border border-neutral-700 px-3 py-1">{l.name}</span>
        ))}
      </div>
    </div>
  );
}
