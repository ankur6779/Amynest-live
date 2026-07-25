/**
 * Local recent place selections — independent of PlaceLookupPort provider.
 */

import type { PlaceLookupResult } from "../../domain/ports/place-lookup-port";

const RECENT_KEY = "amynest:birth-sky:recent-places:v1";

export function loadRecentPlaces(): PlaceLookupResult[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlaceLookupResult[];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function pushRecentPlace(place: PlaceLookupResult): void {
  try {
    const prev = loadRecentPlaces().filter((p) => p.label !== place.label);
    const next = [place, ...prev].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
