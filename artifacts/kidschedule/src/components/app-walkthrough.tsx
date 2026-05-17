/**
 * AppWalkthrough — disabled.
 *
 * The modal "Welcome to AmyNest" walkthrough was removed in favor of
 * SpotlightTour in layout.tsx (spotlight overlay on nav + Amy FAB).
 * We still mark amynest_walkthrough_seen so returning users never see a
 * stale modal if an older bundle is cached briefly.
 */

import { useEffect } from "react";

const STORAGE_KEY = "amynest_walkthrough_seen";

export function AppWalkthrough() {
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);
  return null;
}
