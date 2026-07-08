import type { StandingsRow } from '../../types';

interface Props {
  table: StandingsRow[];
  teamNames: Map<string, string>;
  highlightTeamId?: string;
}

export function StandingsTable({ table, teamNames, highlightTeamId }: Props) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-700 text-left text-neutral-400">
          <th className="py-2 pr-2">#</th>
          <th className="py-2 pr-2">Team</th>
          <th className="px-2 py-2 text-center">P</th>
          <th className="px-2 py-2 text-center">W</th>
          <th className="px-2 py-2 text-center">D</th>
          <th className="px-2 py-2 text-center">L</th>
          <th className="px-2 py-2 text-center">GD</th>
          <th className="px-2 py-2 text-center">Pts</th>
        </tr>
      </thead>
      <tbody>
        {table.map((row, index) => (
          <tr
            key={row.teamId}
            className={`border-b border-neutral-800 ${row.teamId === highlightTeamId ? 'bg-emerald-500/10 font-semibold text-emerald-300' : 'text-neutral-200'}`}
          >
            <td className="py-1.5 pr-2">{index + 1}</td>
            <td className="py-1.5 pr-2">{teamNames.get(row.teamId) ?? row.teamId}</td>
            <td className="px-2 py-1.5 text-center">{row.played}</td>
            <td className="px-2 py-1.5 text-center">{row.won}</td>
            <td className="px-2 py-1.5 text-center">{row.drawn}</td>
            <td className="px-2 py-1.5 text-center">{row.lost}</td>
            <td className="px-2 py-1.5 text-center">{row.goalsFor - row.goalsAgainst}</td>
            <td className="px-2 py-1.5 text-center">{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
