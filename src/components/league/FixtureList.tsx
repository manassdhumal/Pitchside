import type { Match } from '../../types';

interface Props {
  matches: Match[];
  teamNames: Map<string, string>;
}

export function FixtureList({ matches, teamNames }: Props) {
  return (
    <ul className="divide-y divide-neutral-800 text-sm">
      {matches.map((match) => (
        <li key={match.id} className="flex items-center justify-between py-2">
          <div className="flex-1 text-left">
            <div className="text-neutral-100">
              {teamNames.get(match.homeTeamId) ?? match.homeTeamId} {match.homeScore} - {match.awayScore}{' '}
              {teamNames.get(match.awayTeamId) ?? match.awayTeamId}
            </div>
            <div className="text-xs text-neutral-500">{match.round}</div>
          </div>
          <div className="text-right text-xs text-neutral-400">
            <div>xG {match.homeXG.toFixed(2)} - {match.awayXG.toFixed(2)}</div>
            <div>
              Win% {Math.round(match.homeWinProbability * 100)} / {Math.round(match.drawProbability * 100)} / {Math.round(match.awayWinProbability * 100)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
