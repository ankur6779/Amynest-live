import { useCallback, useRef } from "react";

/** Debounce UI actions (menu, nav) — default 300ms for mobile PWA. */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delayMs = 300,
): T {
  const fnRef = useRef(fn);
  const lastRunRef = useRef(0);
  fnRef.current = fn;

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRunRef.current < delayMs) return;
      lastRunRef.current = now;
      try {
        fnRef.current(...args);
      } catch (err) {
        console.error("[amynest:nav] debounced callback failed", err);
      }
    }) as T,
    [delayMs],
  );
}
