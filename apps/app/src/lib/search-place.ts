import type { LatLng } from '@sidequest/api';
import { useEffect, useState } from 'react';

import { preferences } from './preferences';

/** A place chosen to search around instead of the device's position, e.g. on a computer. */
export type SearchPlace = LatLng & {
  /** How it's shown: the searched place's name, or empty for a spot picked on the map. */
  label: string;
};

const KEY = 'nearby.place';

function parse(stored: string | null): SearchPlace | null {
  if (!stored) return null;
  try {
    const place = JSON.parse(stored);
    return typeof place?.lat === 'number' && typeof place?.lng === 'number' ? place : null;
  } catch {
    return null;
  }
}

/** The chosen place (kept on the device), or null to use the device's position. */
export function useSearchPlace() {
  const [place, setPlace] = useState<SearchPlace | null>(null);
  useEffect(() => {
    let current = true;
    preferences.get(KEY).then((stored) => {
      if (current) setPlace(parse(stored));
    });
    return () => {
      current = false;
    };
  }, []);

  const update = (next: SearchPlace | null) => {
    setPlace(next);
    void (next ? preferences.set(KEY, JSON.stringify(next)) : preferences.remove(KEY));
  };
  return [place, update] as const;
}
