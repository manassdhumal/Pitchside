import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { q } from '../db';
import type { AuthedRequest } from '../auth';

export const teamsRouter = Router();

// The team blob and its 11 player objects, stored together so a team rehydrates fully on any device.
const body = z.object({ team: z.record(z.unknown()), players: z.array(z.unknown()).default([]) });

interface TeamRow { id: string; name: string; data: string; created_at: number; user_id: string }

teamsRouter.get('/', (req: AuthedRequest, res) => {
  const rows = q.all<TeamRow>('SELECT id, name, data, created_at FROM teams WHERE user_id = ? ORDER BY created_at DESC', req.userId!);
  res.json(rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, team: JSON.parse(r.data).team })));
});

teamsRouter.post('/', (req: AuthedRequest, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid team payload' });
    return;
  }
  const { team, players } = parsed.data;
  const id = (typeof team.id === 'string' && team.id) || randomUUID();
  const name = (typeof team.name === 'string' && team.name) || 'Untitled XI';

  const owner = q.get<TeamRow>('SELECT user_id FROM teams WHERE id = ?', id);
  if (owner && owner.user_id !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  q.run(`INSERT INTO teams (id, user_id, name, data, created_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data`,
    id, req.userId!, name, JSON.stringify({ team: { ...team, id }, players }), Date.now());
  res.json({ id });
});

teamsRouter.get('/:id', (req: AuthedRequest, res) => {
  const r = q.get<TeamRow>('SELECT data FROM teams WHERE id = ? AND user_id = ?', req.params.id, req.userId!);
  if (!r) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(JSON.parse(r.data)); // { team, players }
});

teamsRouter.delete('/:id', (req: AuthedRequest, res) => {
  q.run('DELETE FROM teams WHERE id = ? AND user_id = ?', req.params.id, req.userId!);
  q.run('DELETE FROM seasons WHERE team_id = ? AND user_id = ?', req.params.id, req.userId!);
  res.json({ ok: true });
});
