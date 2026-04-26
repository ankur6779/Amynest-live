import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { StoriesPayload } from "@/services/storiesApi";

export interface UseStoriesDataResult {
  loading: boolean;
  error: string | null;
  data: StoriesPayload | null;
  refresh: () => void;
  recordProgress: (
    storyId: number,
    positionSec: number,
    options?: { durationSec?: number; completed?: boolean; startedSession?: boolean },
  ) => void;
}

export function useStoriesData(childId: number | null): UseStoriesDataResult {
  const authFetch = useAuthFetch();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StoriesPayload | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const reqIdRef = useRef(0);
  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    if (childId === null || childId === undefined) {
      setLoading(false);
      setData(null);
      return;
    }
    const myReq = ++reqIdRef.current;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const res = await authFetch(
          `/api/stories?childId=${encodeURIComponent(String(childId))}`,
        );
        if (cancelled || myReq !== reqIdRef.current) return;
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const payload = (await res.json()) as StoriesPayload;
        if (cancelled || myReq !== reqIdRef.current) return;
        setData(payload);
      } catch (err) {
        if (cancelled || myReq !== reqIdRef.current) return;
        console.warn("[stories] load failed:", err);
        setError(err instanceof Error ? err.message : "load_failed");
      } finally {
        if (!cancelled && myReq === reqIdRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authFetch, childId, refreshTick]);

  const lastWriteRef = useRef<number>(0);
  const recordProgress = useCallback<UseStoriesDataResult["recordProgress"]>(
    (storyId, positionSec, options) => {
      if (childId === null || childId === undefined) return;
      const now = Date.now();
      const force = options?.completed || options?.startedSession;
      if (!force && now - lastWriteRef.current < 8_000) return;
      lastWriteRef.current = now;

      void authFetch("/api/stories/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          storyId,
          positionSec: Math.floor(positionSec),
          ...(options?.durationSec !== undefined
            ? { durationSec: Math.floor(options.durationSec) }
            : {}),
          ...(options?.completed !== undefined ? { completed: options.completed } : {}),
          ...(options?.startedSession !== undefined
            ? { startedSession: options.startedSession }
            : {}),
        }),
      })
        .then((r) => {
          if (!r.ok) console.warn("[stories] progress write HTTP", r.status);
        })
        .catch((err) => console.warn("[stories] progress write failed:", err));
    },
    [authFetch, childId],
  );

  return { loading, error, data, refresh, recordProgress };
}
