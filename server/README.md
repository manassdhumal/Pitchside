# PitchSide accounts API

A small Express + `node:sqlite` service that stores each manager's **teams** and **season
results** under a username/password account. It backs the login, the "My Career" history page,
and the delete-a-season feature. No native modules, no external database — a single
`pitchside.db` file.

## Run it locally

From the repo root:

```bash
npm run server:install   # one-time: install server deps (server/node_modules)
npm run dev:all          # runs the Vite frontend (5173) AND this API (3001) together
```

The frontend's Vite dev server proxies `/api` → `http://localhost:3001`, so the browser talks
same-origin and the session cookie just works. Open http://localhost:5173, create an account,
and your teams/seasons persist in `server/pitchside.db`.

Run the API alone with `npm run server` (or `cd server && npm run dev`).

## Endpoints

- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET/POST /api/teams`, `GET/DELETE /api/teams/:id` — teams (with their 11 players embedded)
- `GET/POST /api/seasons`, `GET/DELETE /api/seasons/:id` — season history

All data routes require the session cookie and are scoped to the signed-in user (another user's
id returns 404).

## Config (`server/.env`, see `.env.example`)

| var | default | notes |
|-----|---------|-------|
| `JWT_SECRET` | `dev-insecure-secret-change-me` | **set a long random value in production** |
| `PORT` | `3001` | API port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | frontend origin, for CORS when deployed separately |
| `DB_PATH` | `server/pitchside.db` | point at a persistent volume in production |
| `NODE_ENV` | – | set to `production` so the cookie is `Secure` + `SameSite=None` |

## Deploying for real cross-device sync

This runs out of the box locally. For accounts that follow you across devices you deploy the API
yourself — I can't create hosting accounts or enter your secrets:

1. Host `server/` on a Node 22+ host **with a persistent disk** (Render, Railway, Fly, a VPS…);
   point `DB_PATH` at that disk so the SQLite file survives restarts. (Or swap `node:sqlite` for
   a managed Postgres — the DB access in `src/db.ts` is thin and isolated.)
2. Set `JWT_SECRET`, `NODE_ENV=production`, and `CLIENT_ORIGIN` to your deployed frontend URL.
3. Build the static frontend with `VITE_API_URL=https://your-api-host` so it calls the deployed
   API instead of the dev proxy, and host the `dist/` on any static host.

Because the production cookie is `SameSite=None; Secure`, the API must be served over HTTPS.
