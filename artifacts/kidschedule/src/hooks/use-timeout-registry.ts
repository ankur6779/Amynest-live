import { useCallback, useEffect, useRef } from "react";

/**
 * Tracks setTimeout / setInterval and clears all on unmount.
 * Prevents post-exit setState / onFinish after leaving a game mid-feedback.
 */
export function useTimeoutRegistry() {
  const timeouts = useRef<Set<number>>(new Set());
  const intervals = useRef<Set<number>>(new Set());

  const clearAll = useCallback(() => {
    for (const id of timeouts.current) window.clearTimeout(id);
    for (const id of intervals.current) window.clearInterval(id);
    timeouts.current.clear();
    intervals.current.clear();
  }, []);

  useEffect(() => clearAll, [clearAll]);

  const setTimeoutSafe = useCallback((fn: () => void, ms: number): number => {
    const id = window.setTimeout(() => {
      timeouts.current.delete(id);
      fn();
    }, ms);
    timeouts.current.add(id);
    return id;
  }, []);

  const setIntervalSafe = useCallback((fn: () => void, ms: number): number => {
    const id = window.setInterval(fn, ms);
    intervals.current.add(id);
    return id;
  }, []);

  const clearTimeoutSafe = useCallback((id: number | null | undefined) => {
    if (id == null) return;
    window.clearTimeout(id);
    timeouts.current.delete(id);
  }, []);

  const clearIntervalSafe = useCallback((id: number | null | undefined) => {
    if (id == null) return;
    window.clearInterval(id);
    intervals.current.delete(id);
  }, []);

  return {
    setTimeoutSafe,
    setIntervalSafe,
    clearTimeoutSafe,
    clearIntervalSafe,
    clearAll,
  };
}
