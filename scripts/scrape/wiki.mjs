const API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'PitchSideDataBot/0.1 (hobby fan-project squad data collection; contact: n/a)';
const MIN_DELAY_MS = 1200;
const MAX_RETRIES = 5;

let lastRequestAt = 0;

async function throttledFetch(url, attempt = 0) {
  const wait = MIN_DELAY_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 429 || res.status === 503) {
    if (attempt >= MAX_RETRIES) throw new Error(`HTTP ${res.status} for ${url} (exhausted retries)`);
    const retryAfterHeader = res.headers.get('retry-after');
    const backoffMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 2000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, backoffMs));
    return throttledFetch(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Generic tokens shared by many club names — not distinctive enough to confirm a title match.
// Includes the common national club-name prefixes (Real/Borussia/Stade/…) so that e.g. a search
// for "Real Valladolid" cannot be confirmed by a "Real Betis" article on the shared word "real".
const CLUB_STOPWORDS = new Set([
  'fc', 'afc', 'cf', 'sc', 'ac', 'ssc', 'ss', 'as', 'rc', 'rcd', 'cfc', 'vfl', 'vfb', 'tsg', 'sv',
  'fsv', 'ogc', 'losc', 'calcio', 'season', 'club', 'football', 'and', 'the',
  // National club-name prefixes: every club in clubs.json still has a distinctive town/name token
  // beyond these, so requiring a match on the distinctive token (not just the prefix) is safe.
  'real', 'borussia', 'athletic', 'atletico', 'olympique', 'stade', 'deportivo', 'sporting', 'racing',
]);

function clubTokens(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    // Only distinctive name tokens: alphabetic, 3+ chars (drops "F.C." → f/c, years, and numeric
    // suffixes like "05"/"1899" that could spuriously match across unrelated clubs).
    .filter((w) => w.length >= 3 && /^[a-z]+$/.test(w) && !CLUB_STOPWORDS.has(w));
}

/**
 * True if a resolved article title plausibly belongs to this club — i.e. shares a distinctive
 * name token with either the wiki title or the display name. Guards against the search fallback
 * accepting a completely different club's season article (e.g. "2011–12 Lens season" → Real Madrid)
 * when the club had no top-flight season that year.
 */
function titleMatchesClub(articleTitle, clubWikiTitle, clubName) {
  const want = new Set([...clubTokens(clubWikiTitle), ...clubTokens(clubName)]);
  const have = new Set(clubTokens(articleTitle));
  for (const t of want) if (have.has(t)) return true;
  return false;
}

/** Resolve the best-matching Wikipedia article title for a club-season, e.g. "2003-04 Arsenal F.C. season". */
export async function resolveSeasonArticleTitle(clubWikiTitle, season, clubName) {
  const seasonLabel = season.replace('-', '–'); // en dash, matches Wikipedia's convention
  const directTitle = `${seasonLabel} ${clubWikiTitle} season`;

  const directUrl = `${API}?action=query&titles=${encodeURIComponent(directTitle)}&redirects=1&format=json&formatversion=2`;
  const direct = await throttledFetch(directUrl);
  const directPage = direct.query?.pages?.[0];
  if (directPage && !directPage.missing) return directPage.title;

  const query = `${seasonLabel} ${clubName} season`;
  const searchUrl = `${API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&formatversion=2`;
  const search = await throttledFetch(searchUrl);
  const results = search.query?.search ?? [];
  // Only accept a search hit that is a season article AND actually names this club — otherwise a
  // club with no top-flight season that year would silently inherit a different club's squad.
  const match = results.find(
    (r) => r.title.startsWith(seasonLabel) && /season$/i.test(r.title) && titleMatchesClub(r.title, clubWikiTitle, clubName),
  );
  return match ? match.title : null;
}

export async function fetchWikitext(title) {
  const url = `${API}?action=parse&page=${encodeURIComponent(title)}&redirects=1&prop=wikitext&format=json&formatversion=2`;
  const data = await throttledFetch(url);
  if (data.error) return null;
  return { wikitext: data.parse.wikitext, canonicalTitle: data.parse.title };
}
