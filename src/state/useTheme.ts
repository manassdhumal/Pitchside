import { useCallback, useEffect, useState } from 'react';

export interface Theme {
  id: string;
  name: string;
  /** [paper, ink, accent] — a 3-stripe preview for the picker menu. */
  swatch: [string, string, string];
}

/** All UI themes. `matchday` is the default (the base `:root` palette, no attribute). Each other id
 * has a matching `:root[data-theme="<id>"]` block in index.css that overrides the colour variables. */
export const THEMES: Theme[] = [
  { id: 'matchday', name: 'Matchday', swatch: ['#f6efdf', '#1d2b45', '#a83e2c'] },
  { id: 'sepia', name: 'Sepia', swatch: ['#e8dcc2', '#3d2c1a', '#9c5a2c'] },
  { id: 'floodlights', name: 'Floodlights', swatch: ['#16301f', '#f2ead3', '#e0876b'] },
  { id: 'european', name: 'European', swatch: ['#0e1830', '#dfe6f2', '#7fb0e8'] },
  { id: 'chalkboard', name: 'Chalkboard', swatch: ['#22282b', '#eef2ee', '#e8b04a'] },
  { id: 'claret', name: 'Claret', swatch: ['#4a1f2b', '#f4e9dd', '#6fb7d6'] },
  { id: 'teletext', name: 'Teletext', swatch: ['#0a0a0a', '#ffcc00', '#33ff66'] },
  { id: 'neon', name: 'Neon', swatch: ['#0d0b1a', '#ff3d8b', '#22d3ee'] },
];

const STORAGE_KEY = 'pitchside-theme';
const LEGACY_KEY = 'pitchside-floodlights';

function readStored(): string {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t && THEMES.some((x) => x.id === t)) return t;
    if (localStorage.getItem(LEGACY_KEY) === 'on') return 'floodlights'; // migrate the old toggle
  } catch {
    /* storage unavailable */
  }
  return 'matchday';
}

/**
 * The active UI theme, applied as a `data-theme` root attribute so the CSS variables swap. Purely a
 * palette switch — no layout changes. Returns the current theme id, a setter, and a cycle helper.
 */
export function useTheme(): [string, (id: string) => void, () => void] {
  const [theme, setTheme] = useState(readStored);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'matchday') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* theme just won't persist */
    }
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((cur) => {
      const i = THEMES.findIndex((t) => t.id === cur);
      return THEMES[(i + 1) % THEMES.length].id;
    });
  }, []);

  return [theme, setTheme, cycle];
}
