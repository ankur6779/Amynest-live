import { useCallback, useRef } from "react";

/**
 * Returns a wrapper that ignores re-entry for `cooldownMs` (menu / nav guards).
 */
export function useDebouncedAction(cooldownMs = 500) {
  const busyRef = useRef(false);

  return useCallback(
    (action: () => void) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        action();
      } finally {
        // PWA / SSR-safe — avoid touching window during non-browser builds.
        if (typeof window !== "undefined") {
          window.setTimeout(() => {
            busyRef.current = false;
          }, cooldownMs);
        } else {
          busyRef.current = false;
        }
      }
    },
    [cooldownMs],
  );
}
