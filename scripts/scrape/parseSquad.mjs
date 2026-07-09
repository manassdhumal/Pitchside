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

/** Splits on a two-char separator (`||` or `!!`) only at template/link depth 0. */
function splitCellsDepthAware(text, sep) {
  const tokens = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const two = text.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; current += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; current += two; i++; continue; }
    if (two === sep && depth === 0) { tokens.push(current); current = ''; i++; continue; }
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
    const marker = line[0];
    const sep = marker + marker;
    const rest = line.slice(1);
    for (const token of splitCellsDepthAware(rest, sep)) {
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
  // {{Abbr|Pos|Position}} -> "Pos" (common in header cells)
  const abbr = wikitext.match(/\{\{\s*abbr\s*\|([^|}]*)/i);
  if (abbr && abbr[1].trim()) return abbr[1].trim();
  const m = wikitext.match(/\[\[([^\]]+)\]\]/);
  if (!m) return wikitext.replace(/\{\{efn[^}]*\}\}/gi, '').replace(/<ref[\s\S]*?<\/ref>/gi, '').trim();
  const inner = m[1];
  const pipeIdx = inner.indexOf('|');
  return (pipeIdx !== -1 ? inner.slice(pipeIdx + 1) : inner).trim();
}

function extractNationality(wikitext) {
  const m = wikitext.match(/\{\{\s*(?:Flag|flagicon|fb)\s*\|\s*([^}|]+)/i);
  return m ? m[1].trim() : '';
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

function parseAppsToken(token) {
  const m = (token ?? '').match(/(\d+)(?:\+(\d+))?/);
  if (!m) return 0;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) : 0);
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
 * appearances table. Markers only count at line starts, per MediaWiki syntax.
 */
function extractTableBlocks(wikitext) {
  const blocks = [];
  const stack = [];
  for (let i = 0; i < wikitext.length - 1; i++) {
    const atLineStart = i === 0 || wikitext[i - 1] === '\n';
    if (!atLineStart) continue;
    if (wikitext[i] === '{' && wikitext[i + 1] === '|') {
      stack.push(i);
    } else if (wikitext[i] === '|' && wikitext[i + 1] === '}') {
      const start = stack.pop();
      if (start !== undefined) blocks.push(wikitext.slice(start, i + 2));
    }
  }
  return blocks;
}

export function parseSquadTable(wikitext) {
  const tableBlocks = extractTableBlocks(wikitext);
  const candidates = [];

  for (const block of tableBlocks) {
    const rows = splitRows(block);
    if (rows.length < 2) continue;

    const headerRowIdx = rows.findIndex((r) => /Pos\.?/i.test(r) && /(Name|Player)/i.test(r));
    if (headerRowIdx === -1) continue;

    const headerCells = parseRowCells(rows[headerRowIdx]);
    const noIdx = headerCells.findIndex((c) => /^No\.?$/i.test(extractLinkText(c)));
    const posIdx = headerCells.findIndex((c) => /^Pos\.?$/i.test(extractLinkText(c)));
    const natIdx = headerCells.findIndex((c) => /^Nat\.?$/i.test(extractLinkText(c)));
    const nameIdx = headerCells.findIndex((c) => /^(Name|Player)$/i.test(extractLinkText(c)));
    if (posIdx === -1 || nameIdx === -1) continue;

    const leadColumns = Math.max(noIdx, posIdx, natIdx, nameIdx) + 1;
    const groupCells = headerCells.slice(leadColumns);
    const totalGroupIdx = groupCells.findIndex((c) => /^Total$/i.test(extractLinkText(c)));
    if (totalGroupIdx === -1) continue;

    // Read the sub-header row to check what the Total group's columns actually are. Pages carry
    // several structurally-identical tables (appearances, discipline/cards, goalscorers) — only
    // one whose first Total sub-column is Apps/Appearances is a real appearances table, and its
    // second sub-column decides whether goals data exists (some tables are Apps/Starts). Tables
    // with no such sub-header use one column per competition, ending in a single Total column.
    const subHeaderCells = headerRowIdx + 1 < rows.length ? parseRowCells(rows[headerRowIdx + 1]) : [];
    const looksLikeSubHeader = subHeaderCells.length > 0 && subHeaderCells.some((c) => /apps|appearances|goals|starts/i.test(c));

    let appsColIdx;
    let goalsColIdx;
    let appsVerified;
    let goalsAvailable;
    if (looksLikeSubHeader) {
      appsColIdx = leadColumns + totalGroupIdx * 2;
      goalsColIdx = appsColIdx + 1;
      const totalFirstLabel = subHeaderCells[totalGroupIdx * 2];
      const totalSecondLabel = subHeaderCells[totalGroupIdx * 2 + 1];
      appsVerified = totalFirstLabel !== undefined && /app/i.test(extractLinkText(totalFirstLabel));
      if (!appsVerified) continue; // discipline/cards/goalscorer table - skip
      goalsAvailable = totalSecondLabel === undefined || /goal/i.test(extractLinkText(totalSecondLabel));
    } else {
      // Single-column-per-competition layout (e.g. ranked Appearances tables): the Total column
      // holds total appearances; goals live in a separate table we don't consume.
      appsColIdx = leadColumns + totalGroupIdx;
      goalsColIdx = appsColIdx;
      appsVerified = false;
      goalsAvailable = false;
    }
    const expectedCells = looksLikeSubHeader ? undefined : headerCells.length;

    const players = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      let cells = parseRowCells(rows[i]);
      // Rowspan'd lead cells (e.g. a shared ranking number) drop the first cell on
      // continuation rows; realign by padding.
      if (expectedCells !== undefined && cells.length === expectedCells - 1) cells = ['', ...cells];
      if (cells.length <= Math.max(nameIdx, goalsColIdx)) continue;

      const position = normalizePosition(cells[posIdx]);
      const name = extractLinkText(cells[nameIdx]);
      if (!position || !name || /^\s*$/.test(name)) continue;
      // Nationality is either its own column, or a flag icon inline in the Name cell.
      const nationality = natIdx !== -1 ? extractNationality(cells[natIdx]) : extractNationality(cells[nameIdx]);

      players.push({
        name,
        nationality,
        broadPosition: position,
        shirtNumber: noIdx !== -1 ? leadingNumber(cells[noIdx]) : undefined,
        appearances: leadingNumber(cells[appsColIdx]),
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
export function extractClubSeasonSquad(wikitext) {
  const candidates = [
    parseSquadTable(wikitext),
    parseEfsTemplateSquad(wikitext),
    parseFsTemplateSquad(wikitext),
  ].filter(Boolean).map(dedupeByName);

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

  const leagueField = wikitext.match(/\|\s*league\s*=\s*([^\n|]*(?:\[\[[^\]]*\]\][^\n|]*)*)/i);
  const sample = leagueField ? leagueField[1] : wikitext.slice(0, 3000);

  if (patterns.reject.test(sample)) return 'lower-division';
  if (patterns.accept.test(sample)) return 'top-flight';
  return 'unknown';
}
