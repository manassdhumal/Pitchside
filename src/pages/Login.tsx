import { useState, type FormEvent } from 'react';
import { useAuth } from '../state/AuthContext';
import { ApiError } from '../api/client';

const CREAM = '#FDFAF1';
const INK = '#1D2B45';
const BRICK = '#A83E2C';
const LINE = '#D8CBAD';
const SOFT = '#6B5F4A';

/** The sign-in / sign-up gate. Shown by App when there's no logged-in user; on success the
 * AuthContext user flips and App renders the game. */
export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(username.trim(), password);
      else await register(username.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong — is the server running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-5" style={{ background: 'var(--paper, #F6EFDF)' }}>
      <div className="mb-6 flex items-center gap-3">
        <img src="/favicon.svg" width={46} height={46} alt="PitchSide" />
        <span className="font-display text-[34px] font-extrabold" style={{ color: INK }}>PitchSide</span>
      </div>

      <form onSubmit={submit} className="w-full max-w-[380px]" style={{ background: CREAM, border: `1px solid ${LINE}`, boxShadow: '6px 6px 0 var(--card-shadow, #E4D9BE)' }}>
        <div className="border-b-[3px] px-6 py-4" style={{ borderColor: INK, borderBottomStyle: 'double' }}>
          <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: SOFT }}>Your manager account</div>
          <div className="font-display text-[24px] font-extrabold" style={{ color: INK }}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </div>
        </div>

        <div className="flex flex-col gap-3.5 px-6 py-6">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: SOFT }}>Username</span>
            <input
              value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
              className="border px-3 py-2.5 text-[14px] outline-none focus:border-[color:var(--brick,#A83E2C)]"
              style={{ borderColor: LINE, background: '#fff', color: INK }} placeholder="e.g. gaffer_guardiola"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: SOFT }}>Password</span>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="border px-3 py-2.5 text-[14px] outline-none focus:border-[color:var(--brick,#A83E2C)]"
              style={{ borderColor: LINE, background: '#fff', color: INK }} placeholder="6+ characters"
            />
          </label>

          {error && <div className="text-[12.5px] font-semibold" style={{ color: BRICK }}>{error}</div>}

          <button
            type="submit" disabled={busy || !username || !password}
            className="font-stamp mt-1 cursor-pointer px-5 py-3 text-[14px] uppercase tracking-[0.1em] hover:brightness-110 disabled:opacity-50"
            style={{ background: INK, color: CREAM, border: 'none' }}
          >
            {busy ? 'One moment…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>

          <button
            type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
            className="cursor-pointer border-0 bg-transparent text-center text-[12px]" style={{ color: SOFT }}
          >
            {mode === 'login'
              ? <>New here? <b style={{ color: BRICK }}>Create an account</b></>
              : <>Already have one? <b style={{ color: BRICK }}>Sign in</b></>}
          </button>
        </div>
      </form>

      <p className="mt-5 max-w-[380px] text-center text-[11px] italic" style={{ color: SOFT }}>
        Your drafted teams and season results are saved to your account.
      </p>
    </div>
  );
}
