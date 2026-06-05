import { useEffect, useState } from "react";

export const DASHBOARD_SHELL_MAX_WAIT_MS = 2_000;

/**
 * Unlocks the dashboard shell after 2s max, or immediately when stale cache exists.
 * Optional early unlock when primary queries have settled (success or fallback).
 */
export function useDashboardShellReady(options: {
  hasStaleCache: boolean;
  queriesSettled?: boolean;
}): boolean {
  const { hasStaleCache, queriesSettled = false } = options;
  const [deadlinePassed, setDeadlinePassed] = useState(hasStaleCache);

  useEffect(() => {
    if (hasStaleCache) {
      setDeadlinePassed(true);
      return;
    }
    const timer = window.setTimeout(() => setDeadlinePassed(true), DASHBOARD_SHELL_MAX_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [hasStaleCache]);

  useEffect(() => {
    if (queriesSettled) setDeadlinePassed(true);
  }, [queriesSettled]);

  return deadlinePassed || queriesSettled;
}
