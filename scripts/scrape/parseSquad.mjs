/** Finds the index of the first top-level `|` (attribute/content separator) outside [[..]] and {{..}}. */
function findAttributeSeparator(text) {
  let depthLink = 0;
  let depthTemplate = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[' && text[i + 1] === '[') { depthLink++; i++; continue; }
    if (text[i] === ']' && text[i + 1] === ']') { depthLink--; i++; continue; }
    if (text[i] === '{' && text[i + 1] === '{') { depthTemplate++; i++; continue; }
    if (text[i] === '}' && text[i + 1] === '}') { depthTemplate--; i++; continue; }
    if (text[i] === '|' && depthLink === 0 && depthTemplate === 0) return i;
  }
  return -1;
}

function cellContent(rawToken) {
  const idx = findAttributeSeparator(rawToken);
  return (idx !== -1 ? rawToken.slice(idx + 1) : rawToken).trim();
}

/** Splits a table into row-blocks (text between consecutive `|-` markers). */
function splitRows(tableBody) {
  return tableBody
    .split(/\n\|-[^\n]*/)
    .map((r) => r.trim())
    .filter(Boolean);
}

/**
 * Splits a row's inner text into cells at template/link depth 0. `||` always separates cells; on a
 * header line (`allowBang`) `!!` does too. Crucially `||` splits even on `!`-marked lines — some
 * tables write a header-styled Total cell as `! 36||0` (apps||goals), and treating that as one cell
 * garbles the value and shifts every column after it.
 */
function splitCellsDepthAware(text, allowBang) {
  const tokens = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const two = text.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; current += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; current += two; i++; continue; }
    if (depth === 0 && (two === '||' || (allowBang && two === '!!'))) { tokens.push(current); current = ''; i++; continue; }
    current += text[i];
  }
  tokens.push(current);
  return tokens;
}

/** Parses one row-block into an ordered list of cell text (still containing wikitext markup). */
function parseRowCells(rowBlock) {
  const cells = [];
  for (const rawLine of rowBlock.split('\n')) {
    const line = rawLine.trim();
    if (!line || (!line.startsWith('|') && !line.startsWith('!'))) continue;
    // A `|+` line is the table caption, not a data/header cell. Newer season articles add an
    // accessible `|+{{sronly|…}}` caption; counting it as a cell shifts every column index by one,
    // which misaligns Pos./Name/Apps and silently drops the whole table.
    if (line.startsWith('|+')) continue;
    const marker = line[0];
    const rest = line.slice(1);
    for (const token of splitCellsDepthAware(rest, marker === '!')) {
      cells.push(cellContent(token));
    }
  }
  return cells;
}

function extractLinkText(wikitext) {
  // {{sortname|First|Last}} / {{sortname|First|Last|link target}} / {{sortname||Mononym|...}}
  const sortname = wikitext.match(/\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)(?:\|[^}]*)?\}\}/i);
  if (sortname) {
    const name = [sortname[1].trim(), sortname[2].trim()].filter(Boolean).join(' ');
    if (name) return name;
  }
  // {{sort|sortkey|Display}} or {{sort|Display}} -> the displayed value (used pervasively for
  // apps/pos cells in the {{football season player stats}} template, e.g. {{sort|49.5|46(4)}}).
  const sortTmpl = wikitext.match(/\{\{\s*sort\s*\|([^|}]*)(?:\|([^}]*))?\}\}/i);
  if (sortTmpl && !/\{\{\s*sortname/i.test(wikitext)) {
    const disp = (sortTmpl[2] ?? sortTmpl[1] ?? '').trim();
    if (disp) return disp;
  }
  // {{Abbr|Pos|Position}} / {{Tooltip|Pos.|Position}} -> "Pos" (both common in header cells)
  const abbr = wikitext.match(/\{\{\s*(?:abbr|tooltip)\s*\|([^|}]*)/i);
  if (abbr && abbr[1].trim()) return abbr[1].trim();
  // {{colored link|#RRGGBB|Target|Display}} -> "Display" (newer group headers), or Target if 2-arg.
  const colored = wikitext.match(/\{\{\s*colou?red link\s*\|[^|}]*\|([^|}]*)(?:\|([^|}]*))?/i);
  if (colored) {
    const display = (colored[2] ?? colored[1] ?? '').trim();
    if (display) return display;
  }
  const m = wikitext.match(/\[\[([^\]]+)\]\]/);
  if (!m) return wikitext.replace(/\{\{efn[^}]*\}\}/gi, '').replace(/<ref[\s\S]*?<\/ref>/gi, '').trim();
  const inner = m[1];
  const pipeIdx = inner.indexOf('|');
  return (pipeIdx !== -1 ? inner.slice(pipeIdx + 1) : inner).trim();
}

// Country name → common 3-letter code, for pages that use `[[File:Flag of X.svg]]` images instead
// of {{flagicon|CODE}} templates (older German-style squad tables). Cosmetic only — nationality is
// display data, never used in ratings — so the fallback (first three letters upper-cased) is fine
// for anything not listed here.
const COUNTRY_CODES = {
  germany: 'GER', spain: 'ESP', france: 'FRA', italy: 'ITA', england: 'ENG', brazil: 'BRA',
  argentina: 'ARG', netherlands: 'NED', portugal: 'POR', belgium: 'BEL', croatia: 'CRO',
  switzerland: 'SUI', austria: 'AUT', poland: 'POL', denmark: 'DEN', sweden: 'SWE', norway: 'NOR',
  serbia: 'SRB', 'the netherlands': 'NED', 'united states': 'USA', 'ivory coast': 'CIV',
  'south korea': 'KOR', japan: 'JPN', turkey: 'TUR', greece: 'GRE', 'czech republic': 'CZE',
  russia: 'RUS', ukraine: 'UKR', ghana: 'GHA', nigeria: 'NGA', senegal: 'SEN', cameroon: 'CMR',
  morocco: 'MAR', algeria: 'ALG', uruguay: 'URU', colombia: 'COL', chile: 'CHI', mexico: 'MEX',
  scotland: 'SCO', wales: 'WAL', ireland: 'IRL', slovenia: 'SVN', slovakia: 'SVK', hungary: 'HUN',
  romania: 'ROU', finland: 'FIN', iceland: 'ISL', 'bosnia and herzegovina': 'BIH', paraguay: 'PAR',
  peru: 'PER', ecuador: 'ECU', australia: 'AUS', canada: 'CAN', 'republic of ireland': 'IRL',
};

function countryToCode(country) {
  const key = country.trim().toLowerCase();
  if (COUNTRY_CODES[key]) return COUNTRY_CODES[key];
  return country.trim().slice(0, 3).toUpperCase();
}

/**
 * The descriptive "meaning" of a header cell: a `{{Tooltip|T App|Total appearances}}` or
 * `{{Abbr|…|…}}` cell's *second* argument (the full description), else the plain cell text. Lets a
 * flat per-stat table (no colspan "Total" group) expose its "Total appearances"/"Total goals"
 * columns for matching even when the visible label is a cryptic "T App" / "T ⚽".
 */
function cellMeaning(cell) {
  const lower = cell.toLowerCase();
  let i = lower.indexOf('{{tooltip');
  if (i < 0) i = lower.indexOf('{{abbr');
  if (i < 0) return extractLinkText(cell).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  let depth = 0;
  let j = i;
  for (; j < cell.length - 1; j++) {
    if (cell[j] === '{' && cell[j + 1] === '{') { depth++; j++; }
    else if (cell[j] === '}' && cell[j + 1] === '}') { depth--; j++; if (depth === 0) break; }
  }
  const parts = splitPipeAware(cell.slice(i + 2, j - 1)); // [name, display, title]
  const title = parts.length ? parts[parts.length - 1] : '';
  return title.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractNationality(wikitext) {
  const m = wikitext.match(/\{\{\s*(?:Flag|flagicon|fb)\s*\|\s*([^}|]+)/i);
  if (m) return m[1].trim();
  // Flag image form: [[File:Flag of Germany.svg|20px|German]] → GER.
  const file = wikitext.match(/\[\[\s*File:\s*Flag of ([A-Za-z .'-]+?)\.svg/i);
  if (file) return countryToCode(file[1]);
  return '';
}

function normalizePosition(raw) {
  const text = extractLinkText(raw).toUpperCase();
  if (text.includes('GK')) return 'GK';
  if (text.includes('DF')) return 'DF';
  if (text.includes('MF')) return 'MF';
  if (text.includes('FW')) return 'FW';
  return null;
}

function leadingNumber(raw) {
  const m = raw.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

/** Bracket-depth-aware split on top-level `|` (wikilinks/templates can contain their own `|`). */
function splitPipeAware(text) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[' && text[i + 1] === '[') { depth++; current += '[['; i++; continue; }
    if (text[i] === ']' && text[i + 1] === ']') { depth--; current += ']]'; i++; continue; }
    if (text[i] === '{' && text[i + 1] === '{') { depth++; current += '{{'; i++; continue; }
    if (text[i] === '}' && text[i + 1] === '}') { depth--; current += '}}'; i++; continue; }
    if (text[i] === '|' && depth === 0) { parts.push(current); current = ''; continue; }
    current += text[i];
  }
  if (current) parts.push(current);
  return parts;
}

function parseTemplateFields(templateInner) {
  const named = {};
  const positional = [];
  const parts = splitPipeAware(templateInner);
  // parts[0] is the template name itself (e.g. "Efs player"), not a field.
  for (const raw of parts.slice(1)) {
    const eqIdx = raw.indexOf('=');
    const key = eqIdx !== -1 ? raw.slice(0, eqIdx).trim() : '';
    if (eqIdx !== -1 && /^[a-zA-Z0-9_]+$/.test(key)) named[key] = raw.slice(eqIdx + 1).trim();
    else positional.push(raw.trim());
  }
  return { named, positional };
}

/**
 * Total appearances from an apps cell/token. Squad tables write appearances as "starts(subs)" —
 * e.g. "23(6)" = 23 starts + 6 substitute appearances = 29 — or occasionally "23+6". Counting only
 * the leading number drops every substitute appearance (and produces impossible rows like a
 * bench scorer with 0 apps / 2 goals), so sum both parts.
 */
function parseAppsToken(token) {
  const s = token ?? '';
  const m = s.match(/(\d+)\s*[(+]\s*(\d+)/);
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10);
  const n = s.match(/\d+/);
  return n ? parseInt(n[0], 10) : 0;
}

/**
 * Fallback for older club-season articles that list appearances via `{{Efs player|...}}`
 * templates (name/pos/nat as named params, then apps/goals pairs per competition as positional
 * params) instead of a wikitable.
 */
export function parseEfsTemplateSquad(wikitext) {
  const startMatch = wikitext.match(/\{\{\s*(?:Efs|Extended football squad) start\|([\s\S]*?)\}\}/i);
  if (!startMatch) return null;
  const competitionCount = splitPipeAware(startMatch[1]).length;

  const players = [];
  for (const m of wikitext.matchAll(/\{\{\s*(?:Efs|Extended football squad) player2?\s*\|([\s\S]*?)\}\}/gi)) {
    const { named, positional } = parseTemplateFields(m[0].slice(2, -2));
    const position = named.pos ? normalizePosition(named.pos) : null;
    const name = named.name ? extractLinkText(named.name) : '';
    if (!position || !name) continue;

    let appearances = 0;
    let goals = 0;
    for (let i = 0; i < competitionCount; i++) {
      appearances += parseAppsToken(positional[i * 2]);
      // Some articles record a keeper's SECOND value as goals conceded, written negative
      // (e.g. "37|-31" = 37 apps, 31 conceded). Real goals are never negative, so clamp.
      goals += Math.max(0, parseInt(positional[i * 2 + 1] ?? '0', 10) || 0);
    }

    players.push({
      name,
      nationality: named.nat ?? '',
      broadPosition: position,
      shirtNumber: named.no ? parseInt(named.no, 10) : undefined,
      appearances,
      goals,
    });
  }

  return players.length >= 11 ? players : null;
}

/** Extracts the inner text of every top-level `{{name…}}` template whose name matches `nameRe`,
 * with proper brace matching (these templates nest `{{sortname}}`/`{{Age}}`, which a non-greedy
 * regex would truncate at the first `}}`). */
function extractBalancedTemplates(wikitext, nameRe) {
  const results = [];
  for (let i = 0; i < wikitext.length - 1; i++) {
    if (wikitext[i] !== '{' || wikitext[i + 1] !== '{') continue;
    let depth = 1;
    let j = i + 2;
    for (; j < wikitext.length - 1 && depth > 0; j++) {
      if (wikitext[j] === '{' && wikitext[j + 1] === '{') { depth++; j++; }
      else if (wikitext[j] === '}' && wikitext[j + 1] === '}') { depth--; j++; }
    }
    const inner = wikitext.slice(i + 2, j - 1);
    if (nameRe.test(inner.slice(0, 24))) results.push(inner);
    i = j - 1;
  }
  return results;
}

/** Maps a specific position label (GK/CB/RB/CDM/CAM/LW/ST…) to the broad GK/DF/MF/FW bucket. */
function broadFromSpecific(pos) {
  const p = (pos || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!p) return null;
  if (p.includes('GK') || p === 'G') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'WB', 'SW', 'DF', 'D', 'RCB', 'LCB'].includes(p)) return 'DF';
  if (['CDM', 'CM', 'CAM', 'DM', 'AM', 'LM', 'RM', 'WM', 'MF', 'M', 'RCM', 'LCM'].includes(p)) return 'MF';
  if (['LW', 'RW', 'CF', 'SS', 'ST', 'FW', 'F', 'W', 'LF', 'RF'].includes(p)) return 'FW';
  // Keyword fallback for anything unusual.
  if (/GK/.test(p)) return 'GK';
  if (/B$|^D/.test(p)) return 'DF';
  if (/M/.test(p)) return 'MF';
  return 'FW';
}

/**
 * Roster fallback for articles whose only usable squad list is the `{{fb si player|…}}`
 * "squad information" template (name `p=`, specific position `pos=`, nationality `nb=`/`ni=`,
 * number `n=`). It carries no per-season appearance stats, so ratings fall back to the flat
 * baseline — but it guarantees a real, non-empty roster for top-flight seasons whose statistics
 * table uses a format none of the stat-bearing parsers handle (e.g. Real Madrid 2013-14).
 */
export function parseFbSiSquad(wikitext) {
  const players = [];
  for (const inner of extractBalancedTemplates(wikitext, /^\s*fb si player\b/i)) {
    const { named } = parseTemplateFields(inner);
    const broad = named.pos ? broadFromSpecific(named.pos) : null;
    const name = named.p ? extractLinkText(named.p) : '';
    if (!broad || !name || /^\s*$/.test(name)) continue;
    players.push({
      name,
      nationality: (named.nb || named.ni || '').trim(),
      broadPosition: broad,
      shirtNumber: named.n ? parseInt(named.n, 10) : undefined,
      appearances: 0,
      goals: 0,
      noStats: true,
    });
  }
  return players.length >= 11 ? players : null;
}

/**
 * Parses the `{{football season player stats|…}}` template layout used by many modern
 * (2015+) English club-season articles. The template *generates* the table header, so there's no
 * `{|`/header for `parseSquadTable` to find — but the data rows sit in the wikitext right after the
 * template call, up to the closing `|}`. Column order is fixed: `[No.,] Pos, Nat+Player`, then an
 * Apps/Goals pair per competition, then the **Total** Apps/Goals pair, then Yellow/Red cards. So
 * the Total and cards are read from the end, independent of how many competitions the page lists.
 */
export function parseFootballSeasonStatsTemplate(wikitext) {
  const text = stripComments(wikitext);
  const start = text.search(/\{\{\s*football season player stats/i);
  if (start === -1) return null;
  const tmplEnd = text.indexOf('}}', start);
  if (tmplEnd === -1) return null;
  const params = text.slice(start + 2, tmplEnd).split('|').map((s) => s.trim());
  const hasNo = params.some((p) => /^number\s*=\s*y/i.test(p));
  const posIdx = hasNo ? 1 : 0;
  const nameIdx = hasNo ? 2 : 1;

  const close = text.indexOf('\n|}', tmplEnd);
  const body = text.slice(tmplEnd + 2, close === -1 ? undefined : close);

  // First pass: collect the valid player rows and their cells (trailing empties trimmed).
  const rowsCells = [];
  for (const row of splitRows(body)) {
    const cells = parseRowCells(row);
    while (cells.length && /^\s*$/.test(cells[cells.length - 1])) cells.pop();
    if (cells.length < nameIdx + 5) continue;
    const position = normalizePosition(cells[posIdx]);
    const name = extractLinkText(cells[nameIdx]);
    if (!position || !name || /^\s*$/.test(name)) continue;
    rowsCells.push({ cells, position, name });
  }
  if (rowsCells.length < 11) return null;

  // Total Apps/Goals are the pair just before the two card columns. Anchor from the FRONT using the
  // *modal* row width, so a few rows carrying trailing <ref>/award cells don't shift the read (those
  // extra cells are always at the end; reading from the end would misalign them).
  const counts = {};
  for (const r of rowsCells) counts[r.cells.length] = (counts[r.cells.length] || 0) + 1;
  const modalC = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
  const totalAppsCol = modalC - 4;
  const totalGoalsCol = modalC - 3;
  if (totalAppsCol <= nameIdx) return null;

  const players = rowsCells.map(({ cells, position, name }) => ({
    name,
    nationality: extractNationality(cells[nameIdx]),
    broadPosition: position,
    shirtNumber: hasNo ? leadingNumber(extractLinkText(cells[0])) : undefined,
    appearances: parseAppsToken(extractLinkText(cells[totalAppsCol] ?? '')),
    goals: Math.max(0, leadingNumber(extractLinkText(cells[totalGoalsCol] ?? ''))),
  }));
  return players.length >= 11 ? players : null;
}

/**
 * Last-resort fallback: a plain squad listing with no appearance stats, via `{{Fs player|...}}`
 * or the equivalent `{{football squad player|...}}` template.
 */
export function parseFsTemplateSquad(wikitext) {
  const players = [];
  for (const m of wikitext.matchAll(/\{\{\s*(?:Fs player|football squad player)\|([\s\S]*?)\}\}/gi)) {
    const { named } = parseTemplateFields(m[0].slice(2, -2));
    const position = named.pos ? normalizePosition(named.pos) : null;
    const name = named.name ? extractLinkText(named.name) : '';
    if (!position || !name) continue;

    players.push({
      name,
      nationality: named.nat ?? '',
      broadPosition: position,
      shirtNumber: named.no ? parseInt(named.no, 10) : undefined,
      appearances: 0,
      goals: 0,
      noStats: true,
    });
  }

  return players.length >= 11 ? players : null;
}

/**
 * Finds the squad/appearances wikitable in a club-season article and extracts one row per
 * player: name, nationality, broad position, shirt number, and total appearances/goals.
 * Returns null if no table matching the expected shape is found.
 */
/**
 * Extracts every wikitable block (including tables nested inside other tables) with a proper
 * open/close stack. A non-greedy regex mis-pairs `{|`/`|}` as soon as a page nests tables,
 * silently swallowing later tables — which is exactly where many season pages keep their
 * appearances table. Markers only count at line starts, per MediaWiki syntax. The stack is reset
 * at each `==Section==` heading: a wikitable never spans a section boundary, so an earlier
 * *unclosed* `{|` (malformed markup, or one opened inside a template) can't consume a later
 * section's real appearances table.
 */
function extractTableBlocks(wikitext) {
  const blocks = [];
  let stack = [];
  for (let i = 0; i < wikitext.length - 1; i++) {
    const atLineStart = i === 0 || wikitext[i - 1] === '\n';
    if (!atLineStart) continue;
    if (wikitext[i] === '=' && stack.length) stack = [];
    if (wikitext[i] === '{' && wikitext[i + 1] === '|') {
      stack.push(i);
    } else if (wikitext[i] === '|' && wikitext[i + 1] === '}') {
      const start = stack.pop();
      if (start !== undefined) blocks.push(wikitext.slice(start, i + 2));
    }
  }
  return blocks;
}

/**
 * Removes HTML comments. Newer season articles wrap their appearances table opener inline after a
 * comment (`<!--Total-->{| class="wikitable"...`) and scatter `<!--Premier League-->` markers
 * between cells; the comment before `{|` pushes it off the line start so `extractTableBlocks`
 * never sees the table. Stripping comments first makes the markup line-oriented again.
 */
function stripComments(wikitext) {
  return wikitext.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Parses a header row-block into top-level cells with their `colspan`, so column positions can be
 * mapped exactly even when a table mixes rowspan lead cells, multi-column competition groups, and
 * trailing single rowspan columns (e.g. a "Notes" column). A width-by-division estimate skews on
 * those; cumulative colspan does not.
 */
function parseHeaderCells(rowBlock) {
  const cells = [];
  for (const rawLine of rowBlock.split('\n')) {
    const line = rawLine.trim();
    if (!line || (!line.startsWith('|') && !line.startsWith('!'))) continue;
    if (line.startsWith('|+')) continue;
    const marker = line[0];
    for (const token of splitCellsDepthAware(line.slice(1), marker === '!')) {
      const idx = findAttributeSeparator(token);
      const attrs = idx !== -1 ? token.slice(0, idx) : '';
      const text = (idx !== -1 ? token.slice(idx + 1) : token).trim();
      const cs = attrs.match(/colspan\s*=\s*"?(\d+)/i);
      cells.push({ text, colspan: cs ? Math.max(1, parseInt(cs[1], 10)) : 1 });
    }
  }
  return cells;
}

export function parseSquadTable(wikitext) {
  const tableBlocks = extractTableBlocks(stripComments(wikitext));
  const candidates = [];

  for (const block of tableBlocks) {
    const rows = splitRows(block);
    if (rows.length < 2) continue;

    const headerRowIdx = rows.findIndex((r) => /Pos\.?/i.test(r) && /(Name|Player)/i.test(r));
    if (headerRowIdx === -1) continue;

    // Header label text with wiki-links/templates resolved and stray HTML tags (e.g. a `<br>` in
    // "TOTALS<br>All competitions") flattened, for tolerant matching across article eras.
    const headerText = (c) => extractLinkText(c).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    // Colspan-aware header: `colStart[i]` is the data-column index where header cell i begins.
    const headerFull = parseHeaderCells(rows[headerRowIdx]);
    const headerCells = headerFull.map((c) => c.text);
    const colStart = [];
    let totalCols = 0;
    for (const c of headerFull) { colStart.push(totalCols); totalCols += c.colspan; }

    const noIdx = headerCells.findIndex((c) => /^No\.?$/i.test(headerText(c)));
    const posIdx = headerCells.findIndex((c) => /^Pos\.?$/i.test(headerText(c)));
    const natIdx = headerCells.findIndex((c) => /^Nat\.?$/i.test(headerText(c)));
    // Accept "Name", "Player", and the older "Player name".
    const nameIdx = headerCells.findIndex((c) => /^(name|player(?:\s*name)?)$/i.test(headerText(c)));
    if (posIdx === -1 || nameIdx === -1) continue;

    // Accept "Total", "Totals", "TOTALS All competitions" — the group after the identity columns.
    const leadMaxIdx = Math.max(noIdx, posIdx, natIdx, nameIdx);
    const totalCellIdx = headerCells.findIndex((c, i) => i > leadMaxIdx && /^totals?\b/i.test(headerText(c)));

    // Flat per-stat layout (no colspan "Total" group): each stat is its own column, exposed via a
    // tooltip description — find the "Total appearances" and "Total goals" columns directly.
    let flatAppsIdx = -1;
    let flatGoalsIdx = -1;
    if (totalCellIdx === -1) {
      flatAppsIdx = headerCells.findIndex((c, i) => i > leadMaxIdx && /total appearances/i.test(cellMeaning(c)));
      flatGoalsIdx = headerCells.findIndex((c, i) => i > leadMaxIdx && /total goals/i.test(cellMeaning(c)));
      if (flatAppsIdx === -1) continue;
    }

    // Data-column indices (colspan-aware) for each field.
    const posCol = colStart[posIdx];
    const nameCol = colStart[nameIdx];
    const natCol = natIdx !== -1 ? colStart[natIdx] : -1;
    const noCol = noIdx !== -1 ? colStart[noIdx] : -1;
    const totalStart = totalCellIdx !== -1 ? colStart[totalCellIdx] : colStart[flatAppsIdx];
    const totalWidth = totalCellIdx !== -1 ? headerFull[totalCellIdx].colspan : 1;

    const subHeaderCells = headerRowIdx + 1 < rows.length ? parseRowCells(rows[headerRowIdx + 1]) : [];
    const looksLikeSubHeader = subHeaderCells.length > 0 && subHeaderCells.some((c) => /apps|appearances|goals|starts/i.test(c));

    // A "Rank" column with no Apps sub-header is a goalscorer ranking (Total = goals), not an
    // appearances table — reading its Total as appearances would corrupt the data, so skip it.
    const hasRank = headerCells.some((c) => /^rank$/i.test(headerText(c)));
    if (hasRank && !looksLikeSubHeader) continue;

    let appsColIdx = totalStart;
    let goalsColIdx = totalStart;
    let appsVerified = false;
    let goalsAvailable = false;

    if (totalCellIdx === -1) {
      // Flat layout: individual Total-appearances / Total-goals columns.
      appsColIdx = colStart[flatAppsIdx];
      goalsAvailable = flatGoalsIdx !== -1;
      goalsColIdx = goalsAvailable ? colStart[flatGoalsIdx] : appsColIdx;
      appsVerified = true;
    } else if (looksLikeSubHeader) {
      // Map every data column that sits under a multi-column group to its sub-header label. Sub-header
      // cells fill, left to right, only the columns spanned by colspan>1 groups; rowspan lead/Notes
      // cells (colspan 1) consume none — so a trailing "Notes" column no longer skews alignment.
      const subByCol = {};
      let subPtr = 0;
      for (let i = 0; i < headerFull.length; i++) {
        if (headerFull[i].colspan > 1) {
          for (let k = 0; k < headerFull[i].colspan; k++) subByCol[colStart[i] + k] = subHeaderCells[subPtr++] ?? '';
        }
      }
      appsVerified = /app/i.test(extractLinkText(subByCol[totalStart] ?? ''));
      if (!appsVerified) continue; // discipline/cards/goalscorer table - skip

      // Goals is the Total sub-column whose header says "Goal(s)" or is a soccerball/goal icon; fall
      // back to the second column for a plain Apps/Goals table. Never treat Starts/Assists as goals.
      let goalsCol = -1;
      for (let col = totalStart; col < totalStart + totalWidth; col++) {
        if (/goals?|soccer/i.test(subByCol[col] ?? '')) { goalsCol = col; break; }
      }
      if (goalsCol === -1 && totalWidth >= 2) {
        const second = extractLinkText(subByCol[totalStart + 1] ?? '');
        if (!/^\s*(starts?|assists?|clean|conceded|minutes|mins)\b/i.test(second)) goalsCol = totalStart + 1;
      }
      goalsAvailable = goalsCol >= 0;
      goalsColIdx = goalsAvailable ? goalsCol : appsColIdx;
    }
    // else: single-column-per-competition layout — Total holds total appearances only, no goals.

    const expectedDataCols = looksLikeSubHeader ? -1 : totalCols;

    const players = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      let cells = parseRowCells(rows[i]);
      // Rowspan'd lead cells (e.g. a shared ranking number) drop the first cell on
      // continuation rows; realign by padding.
      if (expectedDataCols !== -1 && cells.length === expectedDataCols - 1) cells = ['', ...cells];
      if (cells.length <= Math.max(nameCol, goalsColIdx)) continue;

      const position = normalizePosition(cells[posCol]);
      const name = extractLinkText(cells[nameCol]);
      if (!position || !name || /^\s*$/.test(name)) continue;
      // Nationality is either its own column, or a flag icon inline in the Name cell.
      const nationality = natCol !== -1 ? extractNationality(cells[natCol]) : extractNationality(cells[nameCol]);

      players.push({
        name,
        nationality,
        broadPosition: position,
        shirtNumber: noCol !== -1 ? leadingNumber(cells[noCol]) : undefined,
        appearances: parseAppsToken(extractLinkText(cells[appsColIdx])),
        goals: goalsAvailable ? leadingNumber(cells[goalsColIdx]) : 0,
      });
    }

    if (players.length >= 11) candidates.push({ players, appsVerified });
  }

  if (candidates.length === 0) return null;
  // Prefer verified-apps tables, then the one with the most convincing appearance data.
  candidates.sort((a, b) => {
    if (a.appsVerified !== b.appsVerified) return a.appsVerified ? -1 : 1;
    return maxApps(b.players) - maxApps(a.players);
  });
  return candidates[0].players;
}

function maxApps(players) {
  return Math.max(...players.map((p) => p.appearances), 0);
}

// Position-group divider labels used by the German-style squad table (English + German words).
const GROUP_POSITIONS = [
  [/goalkeep|torh|torw/i, 'GK'],
  [/defender|defence|abwehr/i, 'DF'],
  [/midfield|mittelfeld/i, 'MF'],
  [/forward|striker|attack|sturm|angriff/i, 'FW'],
];

function groupPosition(text) {
  for (const [re, pos] of GROUP_POSITIONS) if (re.test(text)) return pos;
  return null;
}

/**
 * Parses the German-style squad table used by some Bundesliga club-season articles (e.g. Bayern):
 * position comes from `colspan` divider rows (Goalkeepers/Defenders/…) rather than a Pos. column,
 * and each competition contributes a *matches* and a *goals* column (BL/Cup/CL …) with no Total
 * group — so appearances and goals are the row-wise sums across those columns.
 */
export function parseGermanGroupSquad(wikitext) {
  for (const block of extractTableBlocks(stripComments(wikitext))) {
    const rows = splitRows(block);

    // Header row: names the columns, including repeated "… matches"/"… goals" (or German "Spiele"/
    // "Tore") plus a Player/Name column. It's a plain `|`-cell row here, not `!` headers.
    let headerIdx = -1;
    let labels = [];
    for (let i = 0; i < rows.length; i++) {
      const cells = parseRowCells(rows[i]).map((c) => extractLinkText(c).toLowerCase());
      const joined = cells.join(' | ');
      if (/matches|apps|spiele|einsätze/.test(joined) && /goals|tore/.test(joined) && /player|name|nat/.test(joined)) {
        headerIdx = i;
        labels = cells;
        break;
      }
    }
    if (headerIdx === -1) continue;
    // The genuine German format takes position ONLY from divider rows — it has no Pos column. A
    // table WITH a Pos column is a standard/career table `parseSquadTable` should own; matching it
    // here would wrongly sum multiple competition columns into an inflated apps total.
    if (labels.some((l) => /^pos\.?$|position/.test(l.trim()))) continue;

    const nameCol = labels.findIndex((l) => /player|name/.test(l));
    const noCol = labels.findIndex((l) => /^no\.?$|number|shirt/.test(l.trim()));
    const natCol = labels.findIndex((l) => /nat\.?|country/.test(l));
    const matchCols = [];
    const goalCols = [];
    labels.forEach((l, idx) => {
      // Skip any "total"/"gesamt" column: apps/goals are the sum of the per-competition columns, so
      // including a pre-summed total (some tables carry one) would double-count. Also skip cumulative
      // "career/all-time" columns, which would blow the season figure up to hundreds.
      if (/total|gesamt|ges\.|summe|career|all[- ]?time|gesamtkarriere/.test(l)) return;
      if (/matches|apps|spiele|einsätze/.test(l)) matchCols.push(idx);
      else if (/goals|tore/.test(l)) goalCols.push(idx);
    });
    if (nameCol === -1 || matchCols.length === 0) continue;

    const players = [];
    let currentPos = null;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const cells = parseRowCells(rows[i]);
      const rowText = cells.map((c) => extractLinkText(c)).join(' ');
      // A short row naming a position group is a divider, not a player.
      const asGroup = groupPosition(rowText);
      if (asGroup && cells.length <= 2) { currentPos = asGroup; continue; }
      if (!currentPos) continue;
      if (cells.length <= Math.max(nameCol, ...matchCols, ...goalCols)) continue;

      const name = extractLinkText(cells[nameCol]);
      if (!name || /^\s*$/.test(name)) continue;

      let appearances = 0;
      let goals = 0;
      for (const mc of matchCols) appearances += parseAppsToken(extractLinkText(cells[mc]));
      for (const gc of goalCols) goals += Math.max(0, parseInt(extractLinkText(cells[gc]) || '0', 10) || 0);

      players.push({
        name,
        nationality: natCol !== -1 ? extractNationality(cells[natCol]) : '',
        broadPosition: currentPos,
        shirtNumber: noCol !== -1 ? leadingNumber(cells[noCol]) : undefined,
        appearances,
        goals,
      });
    }

    if (players.length >= 11) return players;
  }
  return null;
}

/** Collapses duplicate rows for the same player (some pages list a player in several sections). */
function dedupeByName(players) {
  const byKey = new Map();
  for (const p of players) {
    const key = p.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = byKey.get(key);
    if (!existing || p.appearances > existing.appearances) byKey.set(key, p);
  }
  return Array.from(byKey.values());
}

/**
 * Tries every known Wikipedia squad-listing format and returns the most stat-complete result:
 * a real appearances table beats template lists, and any source with actual appearance numbers
 * beats a stats-free squad listing.
 */
// No player makes more than this many competitive appearances for a club in a single season
// (the real ceiling is ~60-63). A parse exceeding it has latched onto the wrong table — a
// career/all-time or cumulative one — so the whole candidate is discarded as garbage.
const MAX_PLAUSIBLE_SEASON_APPS = 68;

export function extractClubSeasonSquad(wikitext) {
  const candidates = [
    parseSquadTable(wikitext),
    parseFootballSeasonStatsTemplate(wikitext),
    parseGermanGroupSquad(wikitext),
    parseEfsTemplateSquad(wikitext),
    parseFsTemplateSquad(wikitext),
    parseFbSiSquad(wikitext),
  ].filter(Boolean).map(dedupeByName).filter((c) => maxApps(c) <= MAX_PLAUSIBLE_SEASON_APPS);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => maxApps(b) - maxApps(a));
  return candidates[0];
}

// Accepted top-flight league names per league id (current + historical), and second-tier names
// whose presence must veto a match (e.g. "2. Bundesliga" contains "Bundesliga").
const TOP_FLIGHT_PATTERNS = {
  'premier-league': { accept: /premier league|football league first division/i, reject: /championship|league one|league two|football league second division/i },
  'bundesliga': { accept: /bundesliga/i, reject: /2\.\s*bundesliga|2\.\s*fu(ß|ss)ball[- ]bundesliga|3\.\s*liga|regionalliga|oberliga/i },
  'la-liga': { accept: /la liga|primera divisi(ó|o)n/i, reject: /segunda|tercera/i },
  'serie-a': { accept: /serie a/i, reject: /serie b|serie c|serie d/i },
  'ligue-1': { accept: /ligue 1|french division 1|division 1\b/i, reject: /ligue 2|division 2|championnat national/i },
};

/**
 * Checks whether a club-season article describes a top-flight season for the given league.
 * Reads the season infobox's league field; falls back to the article lead. Returns
 * 'top-flight', 'lower-division', or 'unknown' (when the page gives no usable signal).
 */
export function detectDivision(wikitext, leagueId) {
  const patterns = TOP_FLIGHT_PATTERNS[leagueId];
  if (!patterns) return 'unknown';

  // Strip `{{nowrap|…}}` (and stray template braces) around the league value first — otherwise the
  // field regex stops at the `|` inside `{{nowrap|[[Segunda División]]}}` and reads only "{{nowrap",
  // so a second-tier season slips through as 'unknown' instead of being rejected.
  const unwrapped = wikitext.replace(/\{\{\s*nowrap\s*\|/gi, '');
  const leagueField = unwrapped.match(/\|\s*league\s*=\s*([^\n|]*(?:\[\[[^\]]*\]\][^\n|]*)*)/i);
  const sample = leagueField ? leagueField[1] : unwrapped.slice(0, 3000);

  if (patterns.reject.test(sample)) return 'lower-division';
  if (patterns.accept.test(sample)) return 'top-flight';
  return 'unknown';
}
