import { useEffect, useState } from "react";
import { SLOW_LOAD_THRESHOLD_MS } from "@/lib/smart-route-loading";

/**
 * Returns true only after `active` has been true for at least `delayMs`.
 * Resets immediately when `active` becomes false.
 */
export function useDelayedLoadingUi(
  active: boolean,
  delayMs: number = SLOW_LOAD_THRESHOLD_MS,
): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }

    const timer = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return show;
}
