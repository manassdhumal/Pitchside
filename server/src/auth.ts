import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { q } from './db';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me';
const COOKIE = 'ps_token';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === 'production';

const creds = z.object({
  username: z.string().trim().min(3, 'Username must be 3+ characters').max(24),
  password: z.string().min(6, 'Password must be 6+ characters').max(200),
});

export interface AuthedRequest extends Request {
  userId?: string;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
}

function issue(res: Response, userId: string): void {
  const token = jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' });
  // SameSite=None+Secure lets the cookie ride cross-origin (deployed API on another host); in dev the
  // Vite proxy makes it same-origin so Lax is fine.
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: THIRTY_DAYS,
  });
}

function userIdFromCookie(req: Request): string | null {
  const token = (req as AuthedRequest & { cookies?: Record<string, string> }).cookies?.[COOKIE];
  if (!token) return null;
  try {
    return (jwt.verify(token, JWT_SECRET) as { uid: string }).uid;
  } catch {
    return null;
  }
}

/** Gate for the data routes: 401 unless a valid session cookie is present. */
export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  const uid = userIdFromCookie(req);
  if (!uid) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  req.userId = uid;
  next();
}

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid details' });
    return;
  }
  const { username, password } = parsed.data;
  const existing = q.get<{ id: string }>('SELECT id FROM users WHERE username = ?', username);
  if (existing) {
    res.status(409).json({ error: 'That username is taken.' });
    return;
  }
  const id = randomUUID();
  q.run('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
    id, username, bcrypt.hashSync(password, 10), Date.now());
  issue(res, id);
  res.json({ user: { id, username } });
});

authRouter.post('/login', (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid credentials' });
    return;
  }
  const { username, password } = parsed.data;
  const row = q.get<UserRow>('SELECT id, username, password_hash FROM users WHERE username = ?', username);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: 'Wrong username or password.' });
    return;
  }
  issue(res, row.id);
  res.json({ user: { id: row.id, username: row.username } });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  const uid = userIdFromCookie(req);
  if (!uid) {
    res.json({ user: null });
    return;
  }
  const row = q.get<{ id: string; username: string }>('SELECT id, username FROM users WHERE id = ?', uid);
  res.json({ user: row ?? null });
});
