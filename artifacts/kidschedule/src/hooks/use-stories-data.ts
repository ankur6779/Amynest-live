import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetHubContentQueryKey } from "@workspace/api-client-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";

export interface StoryDto {
  id: number;
  driveFileId: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  streamUrl: string;
  positionSec?: number;
  playCount?: number;
  completed?: boolean;
}

export interface StoriesPayload {
  activeChildId: number;
  child: { id: number; name: string };
  catalogSize: number;
  rows: {
    continueWatching: StoryDto[];
    recommended: StoryDto[];
    trending: StoryDto[];
    allStories: StoryDto[];
  };
}

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

/**
 * Story Hub data hook. Lazy-syncs the catalog on first call (server side),
 * exposes categorised rows + a debounced progress writer.
 *
 * Multi-child safe: every state slice is wiped immediately when childId
 * changes so the previous child's continue-watching never flashes on screen.
 */
export function useStoriesData(childId: number | string | null): UseStoriesDataResult {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StoriesPayload | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const reqIdRef = useRef(0);
  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    if (childId === null || childId === undefined || childId === "") {
      setLoading(false);
      setData(null);
      return;
    }
    const myReq = ++reqIdRef.current;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null); // wipe old child's data immediately

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

  // Debounced progress: write at most every 8 seconds during active playback.
  const lastWriteRef = useRef<number>(0);
  const recordProgress = useCallback<UseStoriesDataResult["recordProgress"]>(
    (storyId, positionSec, options) => {
      if (childId === null || childId === undefined || childId === "") return;
      const now = Date.now();
      const force = options?.completed || options?.startedSession;
      if (!force && now - lastWriteRef.current < 8_000) return;
      lastWriteRef.current = now;

      void authFetch("/api/stories/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: typeof childId === "number" ? childId : Number(childId),
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
          // Invalidate the Parent Hub progressive-content query so any newly
          // unlocked items (early-unlock evaluator flips previewOnly → false)
          // re-render without a manual reload.
          if (r.ok && (options?.completed || options?.startedSession)) {
            const numericId =
              typeof childId === "number" ? childId : Number(childId);
            if (Number.isFinite(numericId)) {
              void queryClient.invalidateQueries({
                queryKey: getGetHubContentQueryKey({ childId: numericId }),
              });
            }
          }
        })
        .catch((err) => console.warn("[stories] progress write failed:", err));
    },
    [authFetch, childId, queryClient],
  );

  return { loading, error, data, refresh, recordProgress };
}

/** Format seconds → "12:34" or "1:02:34" for the duration badge. */
export function formatDuration(sec: number | null | undefined): string | null {
  if (!sec || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
