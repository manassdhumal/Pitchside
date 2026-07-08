import type { Team, Formation, Player } from '../types';
import { buildBlendedSquad, type EraFilter } from './squadBuilder';

const CITY_WORDS = [
  'Riverside', 'Northgate', 'Ashford', 'Kingsley', 'Fairview', 'Brookfield', 'Sterling', 'Marlow',
  'Elmwood', 'Hartley', 'Westbrook', 'Oakland', 'Redcliff', 'Summerhill', 'Dunmore', 'Castleview',
];
const CLUB_SUFFIXES = ['United', 'City', 'Athletic', 'Rovers', 'Town', 'Wanderers', 'FC', 'Albion'];
const FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2'];
const CREST_ICONS = ['shield', 'lion', 'star', 'eagle', 'wolf', 'crown'];
const COLOR_PALETTE = ['#dc2626', '#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#0891b2', '#db2777', '#65a30d'];

let counter = 0;

export function generateOpponentTeam(potentialRange: [number, number] = [55, 85], eraFilter: EraFilter = 'all'): { team: Team; players: Player[] } {
  counter += 1;
  const city = CITY_WORDS[Math.floor(Math.random() * CITY_WORDS.length)];
  const suffix = CLUB_SUFFIXES[Math.floor(Math.random() * CLUB_SUFFIXES.length)];
  const name = `${city} ${suffix}`;
  const primary = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];

  const players = buildBlendedSquad(eraFilter, potentialRange);

  const team: Team = {
    id: `team-cpu-${Date.now().toString(36)}-${counter}`,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    country: 'ENG',
    crest: {
      shape: 'shield',
      primaryColor: primary,
      secondaryColor: '#111827',
      icon: CREST_ICONS[Math.floor(Math.random() * CREST_ICONS.length)],
    },
    colors: { primary, secondary: '#111827' },
    squad: players.map((p) => p.id),
    formation: FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)],
    isUserCreated: false,
    isProcedural: true,
  };

  return { team, players };
}

export function generateOpponentTeams(count: number, potentialRange: [number, number] = [55, 85], eraFilter: EraFilter = 'all'): { team: Team; players: Player[] }[] {
  return Array.from({ length: count }, () => generateOpponentTeam(potentialRange, eraFilter));
}
