import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { q } from '../db';
import type { AuthedRequest } from '../auth';

export const seasonsRouter = Router();

const body = z.object({
  season: z.record(z.unknown()),
  teamId: z.string().optional(),
  // Denormalized bits for the history list — the client sends what it already knows.
  competition: z.string().optional(),
  position: z.number().optional(),
  played: z.number().optional(),
  points: z.number().optional(),
  summary: z.record(z.unknown()).optional(),
});

interface SeasonRow {
  id: string; user_id?: string; team_id: string | null; competition: string | null;
  position: number | null; played: number | null; points: number | null; summary: string | null;
  data: string; created_at: number;
}

seasonsRouter.get('/', (req: AuthedRequest, res) => {
  const rows = q.all<SeasonRow>(
    'SELECT id, team_id, competition, position, played, points, summary, created_at FROM seasons WHERE user_id = ? ORDER BY created_at DESC',
    req.userId!,
  );
  res.json(rows.map((r) => ({
    id: r.id, teamId: r.team_id, competition: r.competition, position: r.position,
    played: r.played, points: r.points, summary: r.summary ? JSON.parse(r.summary) : null, createdAt: r.created_at,
  })));
});

seasonsRouter.post('/', (req: AuthedRequest, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid season payload' });
    return;
  }
  const { season, teamId, competition, position, played, points, summary } = parsed.data;
  const id = (typeof season.id === 'string' && season.id) || randomUUID();

  const owner = q.get<SeasonRow>('SELECT user_id FROM seasons WHERE id = ?', id);
  if (owner && owner.user_id !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  q.run(`INSERT INTO seasons (id, user_id, team_id, competition, position, played, points, summary, data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET team_id = excluded.team_id, competition = excluded.competition,
      position = excluded.position, played = excluded.played, points = excluded.points,
      summary = excluded.summary, data = excluded.data`,
    id, req.userId!, teamId ?? null, competition ?? null, position ?? null, played ?? null,
    points ?? null, summary ? JSON.stringify(summary) : null, JSON.stringify({ ...season, id }), Date.now());
  res.json({ id });
});

seasonsRouter.get('/:id', (req: AuthedRequest, res) => {
  const r = q.get<SeasonRow>('SELECT data FROM seasons WHERE id = ? AND user_id = ?', req.params.id, req.userId!);
  if (!r) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ season: JSON.parse(r.data) });
});

seasonsRouter.delete('/:id', (req: AuthedRequest, res) => {
  q.run('DELETE FROM seasons WHERE id = ? AND user_id = ?', req.params.id, req.userId!);
  res.json({ ok: true });
});
