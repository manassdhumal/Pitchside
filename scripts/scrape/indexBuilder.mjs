import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Best-XI mean overall in a 4-3-3, by broad position — a cheap proxy for `computeTeamOvr(buildBestXI(...))`
 * that the app uses, precomputed into the index so opponent selection can pick a club's strongest
 * season without loading every season file at runtime. Backfills short lines from the best leftovers.
 */
export function computeSquadStrength(squad) {
  const need = { GK: 1, DF: 4, MF: 3, FW: 3 };
  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of squad) (byPos[p.broadPosition] ?? byPos.MF).push(p.seasonRatings?.overall ?? 0);
  for (const k of Object.keys(byPos)) byPos[k].sort((a, b) => b - a);
  const xi = [];
  const leftovers = [];
  for (const line of ['GK', 'DF', 'MF', 'FW']) {
    const arr = byPos[line];
    for (let i = 0; i < arr.length; i++) (i < need[line] ? xi : leftovers).push(arr[i]);
  }
  leftovers.sort((a, b) => b - a);
  while (xi.length < 11 && leftovers.length) xi.push(leftovers.shift());
  if (xi.length < 11) return 0;
  return Math.round(xi.reduce((a, b) => a + b, 0) / xi.length);
}

/**
 * Rebuilds `<HIST_DIR>/index.json` from the club-season files on disk. Each entry carries `playerCount`,
 * `maxApps` (0 for a stats-less roster / partial season), and `strength` (best-XI OVR) so the app can
 * pick each club's strongest COMPLETE season for its league opponents.
 */
export function rebuildIndex(HIST_DIR, DATA_DIR) {
  const leagues = JSON.parse(readFileSync(join(DATA_DIR, 'leagues.json'), 'utf8'));
  const clubs = JSON.parse(readFileSync(join(DATA_DIR, 'clubs.json'), 'utf8'));
  const entries = [];
  for (const club of clubs) {
    const clubDir = join(HIST_DIR, club.leagueId, club.id);
    if (!existsSync(clubDir)) continue;
    for (const file of readdirSync(clubDir).filter((f) => f.endsWith('.json'))) {
      const data = JSON.parse(readFileSync(join(clubDir, file), 'utf8'));
      const maxApps = Math.max(0, ...data.squad.map((p) => p.stats?.appearances ?? 0));
      entries.push({
        leagueId: club.leagueId,
        clubId: club.id,
        season: file.replace('.json', ''),
        playerCount: data.squad.length,
        maxApps,
        strength: computeSquadStrength(data.squad),
      });
    }
  }
  writeFileSync(join(HIST_DIR, 'index.json'), JSON.stringify({ leagues, clubs, entries }, null, 2));
  return entries.length;
}
