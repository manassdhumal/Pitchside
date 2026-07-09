import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pitchside-floodlights';

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

/** Floodlights = the design system's green night mode. Applied as a root attribute so CSS vars flip. */
export function useFloodlights(): [boolean, () => void] {
  const [night, setNight] = useState(readStored);

  useEffect(() => {
    document.documentElement.setAttribute('data-floodlights', night ? 'on' : 'off');
    try {
      localStorage.setItem(STORAGE_KEY, night ? 'on' : 'off');
    } catch {
      // storage unavailable; theme just won't persist
    }
  }, [night]);

  const toggle = useCallback(() => setNight((n) => !n), []);
  return [night, toggle];
}
