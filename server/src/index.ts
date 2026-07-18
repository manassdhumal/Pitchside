import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import './db'; // opens the DB + creates tables on boot
import { authRouter, authMiddleware } from './auth';
import { teamsRouter } from './routes/teams';
import { seasonsRouter } from './routes/seasons';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
// The static frontend's origin, for CORS when the API is deployed on a different host. In local dev
// the Vite proxy makes requests same-origin, so this is only exercised in production.
const ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/teams', authMiddleware, teamsRouter);
app.use('/api/seasons', authMiddleware, seasonsRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PitchSide API listening on http://localhost:${PORT}`);
});
