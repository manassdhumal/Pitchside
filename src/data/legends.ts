import type { Player } from '../types';

/**
 * Curated real-world historical players spanning pre-1970 through the 2010s, across every
 * confederation. Only public biographical facts (name, nationality, birth year, primary
 * position, era) are used. All ratings below are PitchSide-original estimates, independently
 * derived from general public knowledge of each player's reputation/style — not copied from
 * FIFA, Football Manager, or any other proprietary database.
 */
function legend(
  id: string,
  firstName: string,
  lastName: string,
  nationality: string,
  bornYear: number,
  position: Player['position'],
  era: Player['era'],
  ratings: Player['ratings'],
): Player {
  return {
    id,
    firstName,
    lastName,
    nationality,
    born: { year: bornYear },
    retired: true,
    position,
    era,
    ratings,
    ratingsHistory: [{ season: era, ratings }],
    isLegend: true,
    isProcedural: false,
    sourceNote: 'Ratings independently derived by PitchSide from public historical reputation; not sourced from any proprietary database.',
  };
}

export const LEGENDS: Player[] = [
  // --- pre-1970 ---
  legend('legend-pele', 'Edson', 'Nascimento', 'BRA', 1940, 'ST', 'pre-1970', { overall: 97, pace: 88, shooting: 95, passing: 88, dribbling: 96, defending: 30, physical: 75 }),
  legend('legend-garrincha', 'Manuel', 'dos Santos', 'BRA', 1933, 'RW', 'pre-1970', { overall: 92, pace: 90, shooting: 82, passing: 80, dribbling: 97, defending: 25, physical: 65 }),
  legend('legend-distefano', 'Alfredo', 'Di Stefano', 'ARG', 1926, 'ST', 'pre-1970', { overall: 94, pace: 82, shooting: 90, passing: 86, dribbling: 88, defending: 40, physical: 75 }),
  legend('legend-puskas', 'Ferenc', 'Puskas', 'HUN', 1927, 'ST', 'pre-1970', { overall: 93, pace: 75, shooting: 94, passing: 82, dribbling: 85, defending: 25, physical: 72 }),
  legend('legend-moore', 'Bobby', 'Moore', 'ENG', 1941, 'CB', 'pre-1970', { overall: 89, pace: 68, shooting: 45, passing: 78, dribbling: 65, defending: 92, physical: 74 }),
  legend('legend-charlton', 'Bobby', 'Charlton', 'ENG', 1937, 'CAM', 'pre-1970', { overall: 90, pace: 75, shooting: 88, passing: 85, dribbling: 82, defending: 40, physical: 70 }),
  legend('legend-eusebio', 'Eusebio', 'da Silva Ferreira', 'POR', 1942, 'ST', 'pre-1970', { overall: 93, pace: 88, shooting: 92, passing: 75, dribbling: 87, defending: 25, physical: 76 }),
  legend('legend-yashin', 'Lev', 'Yashin', 'URS', 1929, 'GK', 'pre-1970', { overall: 91, pace: 55, shooting: 20, passing: 60, dribbling: 40, defending: 55, physical: 75, goalkeeping: 93 }),
  legend('legend-fontaine', 'Just', 'Fontaine', 'FRA', 1933, 'ST', 'pre-1970', { overall: 88, pace: 82, shooting: 90, passing: 68, dribbling: 78, defending: 20, physical: 68 }),
  legend('legend-facchetti', 'Giacinto', 'Facchetti', 'ITA', 1942, 'LB', 'pre-1970', { overall: 87, pace: 78, shooting: 55, passing: 72, dribbling: 68, defending: 85, physical: 78 }),

  // --- 1970s ---
  legend('legend-cruyff', 'Johan', 'Cruyff', 'NED', 1947, 'CAM', '1970s', { overall: 96, pace: 85, shooting: 88, passing: 92, dribbling: 95, defending: 35, physical: 68 }),
  legend('legend-beckenbauer', 'Franz', 'Beckenbauer', 'GER', 1945, 'CB', '1970s', { overall: 94, pace: 78, shooting: 65, passing: 88, dribbling: 82, defending: 90, physical: 74 }),
  legend('legend-muller-g', 'Gerd', 'Muller', 'GER', 1945, 'ST', '1970s', { overall: 93, pace: 76, shooting: 96, passing: 65, dribbling: 78, defending: 20, physical: 74 }),
  legend('legend-keegan', 'Kevin', 'Keegan', 'ENG', 1951, 'ST', '1970s', { overall: 87, pace: 82, shooting: 84, passing: 72, dribbling: 80, defending: 25, physical: 65 }),
  legend('legend-zico', 'Arthur', 'Coimbra', 'BRA', 1953, 'CAM', '1970s', { overall: 92, pace: 78, shooting: 88, passing: 90, dribbling: 90, defending: 30, physical: 62 }),
  legend('legend-carlosalberto', 'Carlos', 'Alberto Torres', 'BRA', 1944, 'RB', '1970s', { overall: 88, pace: 84, shooting: 65, passing: 78, dribbling: 75, defending: 82, physical: 72 }),
  legend('legend-krol', 'Ruud', 'Krol', 'NED', 1949, 'CB', '1970s', { overall: 87, pace: 80, shooting: 55, passing: 75, dribbling: 70, defending: 86, physical: 74 }),
  legend('legend-neeskens', 'Johan', 'Neeskens', 'NED', 1951, 'CM', '1970s', { overall: 88, pace: 78, shooting: 78, passing: 82, dribbling: 78, defending: 75, physical: 78 }),

  // --- 1980s ---
  legend('legend-maradona', 'Diego', 'Maradona', 'ARG', 1960, 'CAM', '1980s', { overall: 97, pace: 84, shooting: 90, passing: 90, dribbling: 97, defending: 35, physical: 68 }),
  legend('legend-platini', 'Michel', 'Platini', 'FRA', 1955, 'CAM', '1980s', { overall: 93, pace: 74, shooting: 88, passing: 91, dribbling: 88, defending: 40, physical: 68 }),
  legend('legend-vanbasten', 'Marco', 'van Basten', 'NED', 1964, 'ST', '1980s', { overall: 94, pace: 78, shooting: 94, passing: 78, dribbling: 86, defending: 25, physical: 74 }),
  legend('legend-gullit', 'Ruud', 'Gullit', 'NED', 1962, 'CAM', '1980s', { overall: 92, pace: 80, shooting: 84, passing: 82, dribbling: 87, defending: 55, physical: 82 }),
  legend('legend-socrates', 'Socrates', 'Brasileiro', 'BRA', 1954, 'CM', '1980s', { overall: 89, pace: 68, shooting: 80, passing: 88, dribbling: 85, defending: 35, physical: 65 }),
  legend('legend-rossi', 'Paolo', 'Rossi', 'ITA', 1956, 'ST', '1980s', { overall: 88, pace: 80, shooting: 89, passing: 68, dribbling: 78, defending: 22, physical: 62 }),
  legend('legend-zoff', 'Dino', 'Zoff', 'ITA', 1942, 'GK', '1980s', { overall: 90, pace: 50, shooting: 15, passing: 55, dribbling: 35, defending: 50, physical: 70, goalkeeping: 92 }),
  legend('legend-shilton', 'Peter', 'Shilton', 'ENG', 1949, 'GK', '1980s', { overall: 89, pace: 48, shooting: 15, passing: 52, dribbling: 32, defending: 48, physical: 74, goalkeeping: 91 }),
  legend('legend-elkjaer', 'Preben', 'Elkjaer', 'DEN', 1957, 'ST', '1980s', { overall: 87, pace: 84, shooting: 86, passing: 68, dribbling: 82, defending: 20, physical: 76 }),
  legend('legend-kempes', 'Mario', 'Kempes', 'ARG', 1954, 'ST', '1980s', { overall: 89, pace: 82, shooting: 88, passing: 70, dribbling: 82, defending: 22, physical: 70 }),

  // --- 1990s ---
  legend('legend-ronaldo9', 'Ronaldo', 'Nazario', 'BRA', 1976, 'ST', '1990s', { overall: 96, pace: 96, shooting: 93, passing: 74, dribbling: 93, defending: 22, physical: 76 }),
  legend('legend-romario', 'Romario', 'de Souza Faria', 'BRA', 1966, 'ST', '1990s', { overall: 93, pace: 88, shooting: 92, passing: 70, dribbling: 90, defending: 20, physical: 62 }),
  legend('legend-baggio', 'Roberto', 'Baggio', 'ITA', 1967, 'CAM', '1990s', { overall: 93, pace: 78, shooting: 88, passing: 86, dribbling: 92, defending: 28, physical: 62 }),
  legend('legend-maldini', 'Paolo', 'Maldini', 'ITA', 1968, 'LB', '1990s', { overall: 93, pace: 80, shooting: 45, passing: 78, dribbling: 72, defending: 93, physical: 80 }),
  legend('legend-weah', 'George', 'Weah', 'LBR', 1966, 'ST', '1990s', { overall: 91, pace: 90, shooting: 88, passing: 72, dribbling: 86, defending: 25, physical: 82 }),
  legend('legend-stoichkov', 'Hristo', 'Stoichkov', 'BUL', 1966, 'LW', '1990s', { overall: 90, pace: 84, shooting: 87, passing: 76, dribbling: 88, defending: 25, physical: 68 }),
  legend('legend-klinsmann', 'Jurgen', 'Klinsmann', 'GER', 1964, 'ST', '1990s', { overall: 90, pace: 84, shooting: 89, passing: 72, dribbling: 80, defending: 25, physical: 74 }),
  legend('legend-matthaus', 'Lothar', 'Matthaus', 'GER', 1961, 'CM', '1990s', { overall: 92, pace: 76, shooting: 82, passing: 88, dribbling: 80, defending: 72, physical: 78 }),
  legend('legend-robertocarlos', 'Roberto', 'Carlos', 'BRA', 1973, 'LB', '1990s', { overall: 91, pace: 92, shooting: 82, passing: 76, dribbling: 84, defending: 78, physical: 82 }),
  legend('legend-bergkamp', 'Dennis', 'Bergkamp', 'NED', 1969, 'CAM', '1990s', { overall: 92, pace: 74, shooting: 84, passing: 90, dribbling: 90, defending: 30, physical: 65 }),
  legend('legend-batistuta', 'Gabriel', 'Batistuta', 'ARG', 1969, 'ST', '1990s', { overall: 92, pace: 82, shooting: 94, passing: 68, dribbling: 78, defending: 20, physical: 82 }),
  legend('legend-delpiero', 'Alessandro', 'Del Piero', 'ITA', 1974, 'CAM', '1990s', { overall: 91, pace: 78, shooting: 88, passing: 84, dribbling: 89, defending: 25, physical: 65 }),
  legend('legend-schmeichel', 'Peter', 'Schmeichel', 'DEN', 1963, 'GK', '1990s', { overall: 92, pace: 55, shooting: 18, passing: 60, dribbling: 35, defending: 52, physical: 84, goalkeeping: 93 }),

  // --- 2000s ---
  legend('legend-ronaldinho', 'Ronaldo', 'de Assis Moreira', 'BRA', 1980, 'LW', '2000s', { overall: 94, pace: 84, shooting: 84, passing: 88, dribbling: 96, defending: 25, physical: 70 }),
  legend('legend-henry', 'Thierry', 'Henry', 'FRA', 1977, 'ST', '2000s', { overall: 94, pace: 94, shooting: 90, passing: 80, dribbling: 90, defending: 25, physical: 74 }),
  legend('legend-zidane', 'Zinedine', 'Zidane', 'FRA', 1972, 'CAM', '2000s', { overall: 95, pace: 74, shooting: 85, passing: 91, dribbling: 93, defending: 42, physical: 72 }),
  legend('legend-kaka', 'Ricardo', 'Kaka', 'BRA', 1982, 'CAM', '2000s', { overall: 92, pace: 88, shooting: 84, passing: 85, dribbling: 88, defending: 30, physical: 72 }),
  legend('legend-cannavaro', 'Fabio', 'Cannavaro', 'ITA', 1973, 'CB', '2000s', { overall: 91, pace: 76, shooting: 42, passing: 72, dribbling: 65, defending: 93, physical: 76 }),
  legend('legend-drogba', 'Didier', 'Drogba', 'CIV', 1978, 'ST', '2000s', { overall: 91, pace: 82, shooting: 89, passing: 68, dribbling: 78, defending: 30, physical: 90 }),
  legend('legend-etoo', 'Samuel', 'Eto\'o', 'CMR', 1981, 'ST', '2000s', { overall: 91, pace: 90, shooting: 89, passing: 70, dribbling: 85, defending: 25, physical: 76 }),
  legend('legend-ballack', 'Michael', 'Ballack', 'GER', 1976, 'CM', '2000s', { overall: 90, pace: 74, shooting: 82, passing: 84, dribbling: 78, defending: 68, physical: 82 }),
  legend('legend-casillas', 'Iker', 'Casillas', 'ESP', 1981, 'GK', '2000s', { overall: 91, pace: 55, shooting: 18, passing: 60, dribbling: 35, defending: 52, physical: 72, goalkeeping: 92 }),
  legend('legend-xavi', 'Xavier', 'Hernandez', 'ESP', 1980, 'CM', '2000s', { overall: 93, pace: 65, shooting: 70, passing: 96, dribbling: 88, defending: 55, physical: 60 }),
  legend('legend-vieira', 'Patrick', 'Vieira', 'FRA', 1976, 'CDM', '2000s', { overall: 89, pace: 74, shooting: 62, passing: 76, dribbling: 72, defending: 84, physical: 88 }),

  // --- 2010s ---
  legend('legend-messi', 'Lionel', 'Messi', 'ARG', 1987, 'RW', '2010s', { overall: 97, pace: 87, shooting: 92, passing: 90, dribbling: 97, defending: 30, physical: 65 }),
  legend('legend-ronaldo7', 'Cristiano', 'Ronaldo', 'POR', 1985, 'ST', '2010s', { overall: 96, pace: 90, shooting: 95, passing: 80, dribbling: 90, defending: 30, physical: 84 }),
  legend('legend-modric', 'Luka', 'Modric', 'CRO', 1985, 'CM', '2010s', { overall: 91, pace: 74, shooting: 76, passing: 91, dribbling: 90, defending: 62, physical: 60 }),
  legend('legend-neymar', 'Neymar', 'da Silva Santos Jr', 'BRA', 1992, 'LW', '2010s', { overall: 92, pace: 90, shooting: 84, passing: 84, dribbling: 95, defending: 25, physical: 62 }),
  legend('legend-lewandowski', 'Robert', 'Lewandowski', 'POL', 1988, 'ST', '2010s', { overall: 93, pace: 80, shooting: 93, passing: 76, dribbling: 84, defending: 25, physical: 80 }),
  legend('legend-neuer', 'Manuel', 'Neuer', 'GER', 1986, 'GK', '2010s', { overall: 92, pace: 68, shooting: 22, passing: 74, dribbling: 48, defending: 58, physical: 78, goalkeeping: 93 }),
  legend('legend-zlatan', 'Zlatan', 'Ibrahimovic', 'SWE', 1981, 'ST', '2010s', { overall: 91, pace: 74, shooting: 90, passing: 76, dribbling: 86, defending: 25, physical: 88 }),
  legend('legend-kante', 'N\'Golo', 'Kante', 'FRA', 1991, 'CDM', '2010s', { overall: 89, pace: 80, shooting: 60, passing: 74, dribbling: 76, defending: 90, physical: 76 }),
  legend('legend-debruyne', 'Kevin', 'De Bruyne', 'BEL', 1991, 'CAM', '2010s', { overall: 93, pace: 76, shooting: 86, passing: 94, dribbling: 87, defending: 55, physical: 74 }),
  legend('legend-salah', 'Mohamed', 'Salah', 'EGY', 1992, 'RW', '2010s', { overall: 91, pace: 92, shooting: 88, passing: 78, dribbling: 90, defending: 30, physical: 66 }),
  legend('legend-mane', 'Sadio', 'Mane', 'SEN', 1992, 'LW', '2010s', { overall: 89, pace: 92, shooting: 84, passing: 74, dribbling: 88, defending: 32, physical: 72 }),
  legend('legend-sonheungmin', 'Son', 'Heung-min', 'KOR', 1992, 'LW', '2010s', { overall: 89, pace: 88, shooting: 86, passing: 76, dribbling: 87, defending: 30, physical: 68 }),
  legend('legend-ramos', 'Sergio', 'Ramos', 'ESP', 1986, 'CB', '2010s', { overall: 90, pace: 78, shooting: 62, passing: 76, dribbling: 72, defending: 90, physical: 84 }),
  legend('legend-buffon', 'Gianluigi', 'Buffon', 'ITA', 1978, 'GK', '2010s', { overall: 91, pace: 52, shooting: 18, passing: 58, dribbling: 34, defending: 52, physical: 76, goalkeeping: 92 }),
  legend('legend-pirlo', 'Andrea', 'Pirlo', 'ITA', 1979, 'CM', '2010s', { overall: 90, pace: 58, shooting: 78, passing: 93, dribbling: 84, defending: 55, physical: 62 }),
];

export function legendsByEra(era: Player['era'] | 'all'): Player[] {
  if (era === 'all') return LEGENDS;
  return LEGENDS.filter((p) => p.era === era);
}

export function legendsByPosition(position: Player['position'], era: Player['era'] | 'all' = 'all'): Player[] {
  return legendsByEra(era).filter((p) => p.position === position);
}
