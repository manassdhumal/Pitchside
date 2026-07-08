import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppContext';
import { getTeam, getPlayers, putSeason } from '../storage/cache';
import { generateOpponentTeams } from '../data/teamGenerator';
import { putTeam, putPlayers } from '../storage/cache';
import { StandingsTable } from '../components/league/StandingsTable';
import { FixtureList } from '../components/league/FixtureList';
import { ResultCard } from '../components/shareCard/ResultCard';
import type { Team, Player, Match, StandingsRow, EraRuleConfig } from '../types';
import type { SimulateLeagueRequest, SimulateLeagueResponse } from '../workers/simWorker';

const NEUTRAL_ERA_RULES: EraRuleConfig = {
  awayGoalsRule: false,
  goldenGoal: false,
  extraTimeMinutes: 0,
  penaltyShootout: false,
};
const POINTS_SYSTEM = { win: 3, draw: 1, loss: 0 };
const COMPETITION_ID = 'league-single-division';

export default function Season() {
  const navigate = useNavigate();
  const { currentTeamId } = useAppState();

  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());
  const [startingXIByTeam, setStartingXIByTeam] = useState<Map<string, Player[]> | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [table, setTable] = useState<StandingsRow[]>([]);
  const [showCard, setShowCard] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const setupDone = useRef(false);

  useEffect(() => {
    if (!currentTeamId) {
      navigate('/setup');
      return;
    }
    if (setupDone.current) return;
    setupDone.current = true;

    (async () => {
      const team = await getTeam(currentTeamId);
      if (!team) {
        navigate('/setup');
        return;
      }
      const userPlayers = await getPlayers(team.squad);

      const opponents = generateOpponentTeams(19, [55, 85]);
      await Promise.all(
        opponents.map(async ({ team: t, players }) => {
          await putPlayers(players);
          await putTeam(t);
        }),
      );

      const names = new Map<string, string>();
      names.set(team.id, team.name);
      for (const { team: t } of opponents) names.set(t.id, t.name);

      const xiMap = new Map<string, Player[]>();
      xiMap.set(team.id, userPlayers.slice(0, 11));
      for (const { team: t, players } of opponents) {
        xiMap.set(t.id, players.slice(0, 11));
      }

      setUserTeam(team);
      setTeamNames(names);
      setStartingXIByTeam(xiMap);
    })();
  }, [currentTeamId, navigate]);

  const handleSimulate = () => {
    if (!userTeam || !startingXIByTeam) return;
    setSimulating(true);

    const worker = new Worker(new URL('../workers/simWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<SimulateLeagueResponse>) => {
      const { matches: resultMatches, table: resultTable } = event.data;
      setMatches(resultMatches);
      setTable(resultTable);
      setSimulating(false);
      worker.terminate();

      putSeason({
        id: `season-${Date.now()}`,
        year: new Date().getFullYear(),
        competitionInstances: [
          {
            templateId: COMPETITION_ID,
            teams: Array.from(startingXIByTeam.keys()),
            matches: resultMatches,
            table: resultTable,
          },
        ],
      });
    };

    const request: SimulateLeagueRequest = {
      type: 'SIMULATE_LEAGUE',
      competitionId: COMPETITION_ID,
      teams: Array.from(startingXIByTeam.entries()).map(([teamId, startingXI]) => ({ teamId, startingXI })),
      doubleRoundRobin: true,
      pointsSystem: POINTS_SYSTEM,
      eraRules: NEUTRAL_ERA_RULES,
    };
    worker.postMessage(request);
  };

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  if (!userTeam) {
    return <div className="px-4 py-10 text-center text-neutral-400">Loading…</div>;
  }

  const userRow = table.find((r) => r.teamId === userTeam.id);
  const userPosition = table.findIndex((r) => r.teamId === userTeam.id) + 1;
  const userMatches = matches.filter((m) => m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id);
  const isPerfectSeason = !!userRow && userRow.played > 0 && userRow.won === userRow.played;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 text-neutral-100">
      <h1 className="text-3xl font-bold">{userTeam.name} — Season</h1>
      <p className="mt-2 text-neutral-400">A 20-team single division, double round-robin (38 games).</p>

      {matches.length === 0 && (
        <button
          type="button"
          onClick={handleSimulate}
          disabled={simulating || !startingXIByTeam}
          className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {simulating ? 'Simulating…' : 'Simulate season'}
        </button>
      )}

      {matches.length > 0 && (
        <>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-xl font-semibold">Final table</h2>
              <StandingsTable table={table} teamNames={teamNames} highlightTeamId={userTeam.id} />
            </div>
            <div>
              <h2 className="mb-2 text-xl font-semibold">{userTeam.name} fixtures</h2>
              <div className="max-h-[420px] overflow-y-auto pr-2">
                <FixtureList matches={userMatches} teamNames={teamNames} />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowCard((s) => !s)}
              className="rounded-lg bg-neutral-700 px-4 py-2 font-semibold text-neutral-100 hover:bg-neutral-600"
            >
              {showCard ? 'Hide result card' : 'Share result card'}
            </button>
          </div>

          {showCard && userRow && (
            <div className="mt-6">
              <ResultCard
                teamName={userTeam.name}
                primaryColor={userTeam.colors.primary}
                position={userPosition}
                totalTeams={table.length}
                played={userRow.played}
                won={userRow.won}
                drawn={userRow.drawn}
                lost={userRow.lost}
                points={userRow.points}
                isPerfectSeason={isPerfectSeason}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
