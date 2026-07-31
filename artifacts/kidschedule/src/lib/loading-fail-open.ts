import { useEffect, useState } from "react";

/** Default ceiling for route/auth loading shells — never block the app indefinitely. */
export const ROUTE_LOADING_FAIL_OPEN_MS = 12_000;

/**
 * After `ms`, flips to true so callers can fail-open instead of spinning forever.
 * Resets when `active` becomes false.
 */
export function useFailOpenAfter(
  active: boolean,
  ms: number = ROUTE_LOADING_FAIL_OPEN_MS,
): boolean {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!active) {
      setExpired(false);
      return;
    }
    setExpired(false);
    const timer = window.setTimeout(() => setExpired(true), ms);
    return () => window.clearTimeout(timer);
  }, [active, ms]);

  return active && expired;
}
