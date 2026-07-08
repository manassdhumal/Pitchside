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
  const seasonPrefix = seasonLabel;
  const match = results.find((r) => r.title.startsWith(seasonPrefix) && /season$/i.test(r.title));
  return match ? match.title : null;
}

export async function fetchWikitext(title) {
  const url = `${API}?action=parse&page=${encodeURIComponent(title)}&redirects=1&prop=wikitext&format=json&formatversion=2`;
  const data = await throttledFetch(url);
  if (data.error) return null;
  return { wikitext: data.parse.wikitext, canonicalTitle: data.parse.title };
}
