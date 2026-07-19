// One-off: expand src/data/clubs.json with more top-flight clubs so the scraper can broaden coverage.
// Idempotent — skips ids that already exist. Run: node scripts/addClubs.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../src/data/clubs.json', import.meta.url);
const clubs = JSON.parse(readFileSync(path, 'utf8'));
const have = new Set(clubs.map((c) => c.id));

// [id, name, shortName, leagueId, wikiTitle, primary, secondary, crestIcon, tier]
const ADD = [
  // Premier League
  ['brighton-hove-albion', 'Brighton & Hove Albion', 'BHA', 'premier-league', 'Brighton & Hove Albion F.C.', '#0057B8', '#FFFFFF', 'shield', 2],
  ['brentford', 'Brentford', 'BRE', 'premier-league', 'Brentford F.C.', '#E30613', '#FFFFFF', 'shield', 3],
  ['nottingham-forest', 'Nottingham Forest', 'NFO', 'premier-league', 'Nottingham Forest F.C.', '#DD0000', '#FFFFFF', 'tower', 2],
  ['norwich-city', 'Norwich City', 'NOR', 'premier-league', 'Norwich City F.C.', '#FFF200', '#00A650', 'shield', 3],
  ['watford', 'Watford', 'WAT', 'premier-league', 'Watford F.C.', '#FBEE23', '#ED2127', 'shield', 3],
  ['stoke-city', 'Stoke City', 'STK', 'premier-league', 'Stoke City F.C.', '#E03A3E', '#FFFFFF', 'shield', 3],
  ['swansea-city', 'Swansea City', 'SWA', 'premier-league', 'Swansea City A.F.C.', '#000000', '#FFFFFF', 'shield', 3],
  ['burnley', 'Burnley', 'BUR', 'premier-league', 'Burnley F.C.', '#6C1D45', '#99D6EA', 'shield', 3],
  ['queens-park-rangers', 'Queens Park Rangers', 'QPR', 'premier-league', 'Queens Park Rangers F.C.', '#1D5BA4', '#FFFFFF', 'shield', 3],
  ['ipswich-town', 'Ipswich Town', 'IPS', 'premier-league', 'Ipswich Town F.C.', '#3A64A3', '#FFFFFF', 'shield', 3],

  // Bundesliga
  ['sc-freiburg', 'SC Freiburg', 'SCF', 'bundesliga', 'SC Freiburg', '#000000', '#E30613', 'shield', 2],
  ['union-berlin', 'Union Berlin', 'FCU', 'bundesliga', '1. FC Union Berlin', '#E30613', '#FFE500', 'shield', 3],
  ['augsburg', 'FC Augsburg', 'FCA', 'bundesliga', 'FC Augsburg', '#BA3733', '#46714D', 'shield', 3],
  ['hannover-96', 'Hannover 96', 'H96', 'bundesliga', 'Hannover 96', '#00679A', '#000000', 'shield', 3],
  ['kaiserslautern', '1. FC Kaiserslautern', 'FCK', 'bundesliga', '1. FC Kaiserslautern', '#E30613', '#FFFFFF', 'shield', 3],
  ['nurnberg', '1. FC Nürnberg', 'FCN', 'bundesliga', '1. FC Nürnberg', '#8B0000', '#FFFFFF', 'shield', 3],
  ['fortuna-dusseldorf', 'Fortuna Düsseldorf', 'F95', 'bundesliga', 'Fortuna Düsseldorf', '#E30613', '#FFFFFF', 'shield', 3],
  ['arminia-bielefeld', 'Arminia Bielefeld', 'DSC', 'bundesliga', 'Arminia Bielefeld', '#004E9E', '#FFFFFF', 'shield', 3],

  // La Liga
  ['osasuna', 'CA Osasuna', 'OSA', 'la-liga', 'CA Osasuna', '#0A346F', '#D91A21', 'shield', 3],
  ['rayo-vallecano', 'Rayo Vallecano', 'RAY', 'la-liga', 'Rayo Vallecano', '#FFFFFF', '#E53027', 'shield', 3],
  ['girona', 'Girona FC', 'GIR', 'la-liga', 'Girona FC', '#D5001C', '#FFFFFF', 'shield', 3],
  ['granada', 'Granada CF', 'GRA', 'la-liga', 'Granada CF', '#C4122E', '#FFFFFF', 'shield', 3],
  ['levante', 'Levante UD', 'LEV', 'la-liga', 'Levante UD', '#004C9F', '#B4023B', 'shield', 3],
  ['mallorca', 'RCD Mallorca', 'MLL', 'la-liga', 'RCD Mallorca', '#E30613', '#000000', 'shield', 3],
  ['deportivo-alaves', 'Deportivo Alavés', 'ALA', 'la-liga', 'Deportivo Alavés', '#004B9E', '#FFFFFF', 'shield', 3],
  ['las-palmas', 'UD Las Palmas', 'LPA', 'la-liga', 'UD Las Palmas', '#FEDD00', '#0055A4', 'shield', 3],

  // Serie A
  ['sassuolo', 'US Sassuolo', 'SAS', 'serie-a', 'U.S. Sassuolo Calcio', '#00A752', '#000000', 'shield', 3],
  ['lecce', 'US Lecce', 'LEC', 'serie-a', 'U.S. Lecce', '#EE2622', '#FFE500', 'shield', 3],
  ['empoli', 'Empoli FC', 'EMP', 'serie-a', 'Empoli F.C.', '#00579C', '#FFFFFF', 'shield', 3],
  ['palermo', 'Palermo FC', 'PAL', 'serie-a', 'Palermo F.C.', '#EC98B9', '#000000', 'shield', 3],
  ['brescia', 'Brescia Calcio', 'BRE', 'serie-a', 'Brescia Calcio', '#0A50A1', '#FFFFFF', 'shield', 3],
  ['monza', 'AC Monza', 'MON', 'serie-a', 'A.C. Monza', '#E30613', '#FFFFFF', 'shield', 3],
  ['salernitana', 'US Salernitana', 'SAL', 'serie-a', 'U.S. Salernitana 1919', '#6F1E23', '#FFFFFF', 'shield', 3],
  ['spezia', 'Spezia Calcio', 'SPE', 'serie-a', 'Spezia Calcio', '#000000', '#FFFFFF', 'shield', 3],

  // Ligue 1
  ['brest', 'Stade Brestois', 'BRE', 'ligue-1', 'Stade Brestois 29', '#E30613', '#FFFFFF', 'shield', 3],
  ['lorient', 'FC Lorient', 'LOR', 'ligue-1', 'FC Lorient', '#F58220', '#000000', 'shield', 3],
  ['metz', 'FC Metz', 'MET', 'ligue-1', 'FC Metz', '#8E1B2A', '#FFFFFF', 'shield', 3],
  ['auxerre', 'AJ Auxerre', 'AJA', 'ligue-1', 'AJ Auxerre', '#0055A4', '#FFFFFF', 'shield', 3],
  ['guingamp', 'EA Guingamp', 'GUI', 'ligue-1', 'En Avant Guingamp', '#E30613', '#000000', 'shield', 3],
  ['sochaux', 'FC Sochaux', 'SOC', 'ligue-1', 'FC Sochaux-Montbéliard', '#FFE500', '#004A99', 'shield', 3],
  ['caen', 'SM Caen', 'CAE', 'ligue-1', 'Stade Malherbe Caen', '#E30613', '#0055A4', 'shield', 3],
  ['troyes', 'ES Troyes AC', 'TRO', 'ligue-1', 'ES Troyes AC', '#00579C', '#FFFFFF', 'shield', 3],
];

let added = 0;
for (const [id, name, shortName, leagueId, wikiTitle, primary, secondary, crestIcon, tier] of ADD) {
  if (have.has(id)) continue;
  clubs.push({ id, name, shortName, leagueId, wikiTitle, colors: { primary, secondary }, crestIcon, tier });
  added += 1;
}

writeFileSync(path, JSON.stringify(clubs, null, 2) + '\n');
console.log(`Added ${added} clubs; total now ${clubs.length}.`);
