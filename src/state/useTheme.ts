import { useCallback, useEffect, useState } from 'react';

export interface Theme {
  id: string;
  name: string;
}

/** All UI themes. `matchday` is the default (the base `:root` palette, no attribute). Each other id
 * has a matching `:root[data-theme="<id>"]` block in index.css that overrides the colour variables. */
export const THEMES: Theme[] = [
  { id: 'matchday', name: 'Matchday' },
  { id: 'floodlights', name: 'Floodlights' },
  { id: 'broadsheet', name: 'Broadsheet' },
  { id: 'european', name: 'European' },
  { id: 'teletext', name: 'Teletext' },
  { id: 'sepia', name: 'Sepia' },
  { id: 'contrast', name: 'High Contrast' },
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
