/**
 * Foreign-language roster backfill. A handful of genuine top-flight club-seasons (mostly older
 * mid-table French and Italian sides) have NO English Wikipedia article at all — the only public
 * record is the club's own-language wiki, and only as a squad roster (no per-match stats). This
 * tool fetches those and parses the native roster templates:
 *   - French `{{Feff joueur|prénom=|nom=|pos=G/D/M/A|nat=|num=}}`
 *   - Italian `{{Calciatore in rosa|n=|nazione=CODE|nome=[[..]]|ruolo=P/D/C/A}}`
 * Output is a stats-less squad (noStats → flat baseline ratings), exactly like the English
 * `{{fb si player}}` roster fallback. Run: `node scripts/scrape/backfillForeign.mjs`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveRatings } from './ratings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HIST = join(__dirname, '..', '..', 'public', 'data', 'historical');
const clubs = JSON.parse(readFileSync(join(__dirname, '..', '..', 'src', 'data', 'clubs.json'), 'utf8'));
const UA = { headers: { 'User-Agent': 'PitchSideDataBot/0.1 (hobby fan-project squad data; contact: n/a)' } };

const LANG_BY_LEAGUE = { 'ligue-1': 'fr', 'serie-a': 'it' };

// Genuine top-flight seasons with no English article (verified: club WAS in the top flight that
// year — lower-division years are deliberately excluded).
const TARGETS = [
  ['ligue-1', 'rennes', '2011-12'], ['ligue-1', 'rennes', '2012-13'], ['ligue-1', 'rennes', '2013-14'],
  ['ligue-1', 'nice', '2011-12'], ['ligue-1', 'nice', '2013-14'],
  ['ligue-1', 'montpellier', '2013-14'], ['ligue-1', 'bordeaux', '2011-12'], ['ligue-1', 'toulouse', '2011-12'],
  ['serie-a', 'genoa', '2011-12'], ['serie-a', 'genoa', '2013-14'],
  ['serie-a', 'cagliari', '2011-12'], ['serie-a', 'sampdoria', '2013-14'],
];

const FR_POS = { G: 'GK', D: 'DF', M: 'MF', A: 'FW' };
const IT_POS = { P: 'GK', D: 'DF', C: 'MF', A: 'FW' };
// Codes that differ from our 3-letter convention.
const NAT_FIX = { PRT: 'POR', DEU: 'GER', NLD: 'NED', GRC: 'GRE', DNK: 'DEN', HRV: 'CRO', CHE: 'SUI', SRB: 'SRB' };
const FR_COUNTRY = {
  france: 'FRA', italie: 'ITA', 'brésil': 'BRA', bresil: 'BRA', argentine: 'ARG', espagne: 'ESP',
  portugal: 'POR', allemagne: 'GER', belgique: 'BEL', 'pays-bas': 'NED', croatie: 'CRO', suisse: 'SUI',
  'sénégal': 'SEN', senegal: 'SEN', "côte d'ivoire": 'CIV', mali: 'MLI', cameroun: 'CMR', maroc: 'MAR',
  'algérie': 'ALG', tunisie: 'TUN', ghana: 'GHA', 'nigéria': 'NGA', serbie: 'SRB', pologne: 'POL',
  'suède': 'SWE', 'norvège': 'NOR', danemark: 'DEN', 'grèce': 'GRE', turquie: 'TUR', japon: 'JPN',
  'états-unis': 'USA', uruguay: 'URU', chili: 'CHI', colombie: 'COL', ukraine: 'UKR', russie: 'RUS',
  'autriche': 'AUT', 'écosse': 'SCO', angleterre: 'ENG', 'irlande': 'IRL', 'rép. tchèque': 'CZE',
  arménie: 'ARM', 'guinée': 'GUI', gabon: 'GAB', congo: 'CGO', 'bénin': 'BEN', comores: 'COM',
};

let lastReq = 0;
async function api(lang, params, attempt = 0) {
  const wait = 2000 - (Date.now() - lastReq);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReq = Date.now();
  const url = `https://${lang}.wikipedia.org/w/api.php?${params}&format=json&formatversion=2`;
  const res = await fetch(url, UA);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Rate-limited: the API returned a "You are making too many requests" body, not JSON.
    if (attempt >= 6) throw new Error('rate-limited (exhausted retries)');
    await new Promise((r) => setTimeout(r, 4000 * 2 ** attempt));
    return api(lang, params, attempt + 1);
  }
}
async function search(lang, q) {
  const d = await api(lang, `action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5`);
  return (d.query?.search ?? []).map((s) => s.title);
}
async function wikitext(lang, title) {
  const d = await api(lang, `action=parse&page=${encodeURIComponent(title)}&redirects=1&prop=wikitext`);
  return d.parse?.wikitext ?? null;
}

/** Balanced `{{name…}}` bodies (nested [[…]]/{{…}} aware). */
function templates(text, nameRe) {
  const out = [];
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] !== '{' || text[i + 1] !== '{') continue;
    let depth = 1, j = i + 2;
    for (; j < text.length - 1 && depth > 0; j++) {
      if (text[j] === '{' && text[j + 1] === '{') { depth++; j++; }
      else if (text[j] === '}' && text[j + 1] === '}') { depth--; j++; }
    }
    const body = text.slice(i + 2, j - 1);
    if (nameRe.test(body.slice(0, 24))) out.push(body);
    i = j - 1;
  }
  return out;
}
function fields(body) {
  const f = {};
  let depth = 0, cur = '';
  const parts = [];
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; cur += two; i++; continue; }
    if (body[i] === '|' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq !== -1) f[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return f;
}
function linkText(s) {
  s = (s || '').replace(/<ref[\s\S]*?(?:\/>|<\/ref>)/gi, '').replace(/'''?/g, '').trim();
  const m = s.match(/\[\[([^\]]+)\]\]/);
  if (m) { const inner = m[1]; const pipe = inner.indexOf('|'); return (pipe !== -1 ? inner.slice(pipe + 1) : inner).trim(); }
  return s.trim();
}
function frNat(s) {
  const key = (s || '').replace(/\[\[|\]\]/g, '').trim().toLowerCase();
  return FR_COUNTRY[key] ?? key.slice(0, 3).toUpperCase();
}

function parseFrench(wt) {
  const players = [];
  for (const body of templates(wt, /^\s*Feff joueur/i)) {
    const f = fields(body);
    const pos = FR_POS[(f['pos'] || '').trim().toUpperCase()[0]];
    const name = [f['prénom'], f['nom']].map((x) => (x || '').trim()).filter(Boolean).join(' ');
    if (!pos || !name) continue;
    players.push({ name, nationality: frNat(f['nat']), broadPosition: pos, shirtNumber: parseInt(f['num'], 10) || undefined, appearances: 0, goals: 0, noStats: true });
  }
  return players;
}
function parseItalian(wt) {
  const players = [];
  for (const body of templates(wt, /^\s*Calciatore in rosa/i)) {
    const f = fields(body);
    const pos = IT_POS[(f['ruolo'] || '').trim().toUpperCase()[0]];
    const name = linkText(f['nome']);
    if (!pos || !name) continue;
    const code = (f['nazione'] || '').trim().toUpperCase();
    players.push({ name, nationality: NAT_FIX[code] ?? code, broadPosition: pos, shirtNumber: parseInt((f['n'] || '').replace(/\D/g, ''), 10) || undefined, appearances: 0, goals: 0, noStats: true });
  }
  return players;
}

function playerId(name, nat) { return `${name}-${nat}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function sleepSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

async function run() {
  let ok = 0, fail = 0;
  for (const [leagueId, clubId, season] of TARGETS) {
    const out = join(HIST, leagueId, clubId, `${season}.json`);
    if (existsSync(out)) { console.log(`SKIP ${clubId}/${season}`); continue; }
    const lang = LANG_BY_LEAGUE[leagueId];
    const club = clubs.find((c) => c.id === clubId);
    const ys = season.slice(0, 4), ye = '20' + season.slice(5);
    // A distinctive club token (first 4 letters) so the season article is chosen over a league or
    // rugby article that merely shares the years (e.g. "Championnat de France ...", "rugby à XV").
    const tok = club.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
    try {
      const q = lang === 'fr' ? `Saison ${ys}-${ye} ${club.name}` : `${club.name} ${ys}-${ye}`;
      const titles = await search(lang, q);
      const title = titles.find((t) => {
        const low = t.toLowerCase();
        return low.includes(ys) && low.includes(ye) && low.includes(tok) &&
          !/championnat|rugby|serie [abc]\b|ligue [12]|coupe|campionato/.test(low);
      });
      if (!title) { fail++; console.log(`NF   ${clubId}/${season}`); continue; }
      const wt = await wikitext(lang, title);
      const rows = (lang === 'fr' ? parseFrench(wt) : parseItalian(wt)).filter((p, i, a) => a.findIndex((q) => q.name === p.name) === i);
      if (rows.length < 11) { fail++; console.log(`FEW  ${clubId}/${season} (${rows.length}) <- ${title}`); continue; }
      const maxApp = 20;
      const squad = rows.map((row) => {
        const seed = `${clubId}-${season}-${row.name}-${row.nationality}`;
        const { seasonRatings, primeRatings } = deriveRatings(seed, row.broadPosition, 0, 0, maxApp, true);
        return { id: playerId(row.name, row.nationality), name: row.name, nationality: row.nationality, broadPosition: row.broadPosition, shirtNumber: row.shirtNumber, stats: { appearances: 0, goals: 0 }, seasonRatings, primeRatings };
      });
      const doc = { leagueId, clubId, season, division: 'top-flight', squad, sourceUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`, scrapedAt: new Date().toISOString() };
      mkdirSync(dirname(out), { recursive: true });
      for (let a = 0; a < 20; a++) { try { writeFileSync(out, JSON.stringify(doc, null, 2)); break; } catch (e) { if (a === 19) throw e; sleepSync(800); } }
      ok++; console.log(`OK   ${clubId}/${season} (${squad.length}p roster) <- ${lang}:${title}`);
    } catch (e) { fail++; console.log(`ERR  ${clubId}/${season}: ${e.message.slice(0, 50)}`); }
  }
  console.log(`\nDONE ok=${ok} fail=${fail}`);
}
run();
