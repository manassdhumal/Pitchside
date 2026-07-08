export interface FixturePair {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
}

const BYE = '__BYE__';

/** Circle method round-robin fixture generation (Section 5.1). */
export function generateRoundRobinFixtures(teamIds: string[], doubleRoundRobin: boolean): FixturePair[] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(BYE);

  const n = teams.length;
  const rounds = n - 1;
  const fixed = teams[0];
  let rotating = teams.slice(1);

  const fixtures: FixturePair[] = [];

  for (let round = 0; round < rounds; round++) {
    const roundTeams = [fixed, ...rotating];
    for (let i = 0; i < n / 2; i++) {
      const homeTeamId = roundTeams[i];
      const awayTeamId = roundTeams[n - 1 - i];
      if (homeTeamId !== BYE && awayTeamId !== BYE) {
        // Alternate home/away by round so the fixed team doesn't always play at home.
        const swapHome = round % 2 === 1 && i === 0;
        fixtures.push(
          swapHome
            ? { round, homeTeamId: awayTeamId, awayTeamId: homeTeamId }
            : { round, homeTeamId, awayTeamId },
        );
      }
    }
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  if (doubleRoundRobin) {
    const secondHalf = fixtures.map((f) => ({
      round: f.round + rounds,
      homeTeamId: f.awayTeamId,
      awayTeamId: f.homeTeamId,
    }));
    fixtures.push(...secondHalf);
  }

  return fixtures;
}
