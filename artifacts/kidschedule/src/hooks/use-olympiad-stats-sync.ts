import { parseApiJson } from "@/lib/safe-json-response";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  type ChildOlympiadStats,
  mergeStatsFromServer,
  parseRemoteStatsBlob,
  saveOlympiadStats,
} from "@/lib/olympiad-local-stats";

/** Never-edited local snapshot — unsafe to auto-push (can LWW-wipe server progress). */
export function isVirginOlympiadStats(stats: ChildOlympiadStats): boolean {
  return (
    stats.clientUpdatedAt == null &&
    stats.totalPoints === 0 &&
    stats.streak === 0 &&
    Object.keys(stats.daily).length === 0 &&
    Object.keys(stats.weekly).length === 0
  );
}

export function useOlympiadStatsSync(childId: number) {
  const authFetch = useAuthFetch();
  const syncing = useRef(false);

  const pull = useCallback(async (): Promise<ChildOlympiadStats | null> => {
    try {
      const res = await authFetch(`/api/olympiad/stats?childId=${childId}`);
      if (!res.ok) return null;
      const data = await parseApiJson<{
        ok: true;
        stats: unknown;
        clientUpdatedAt: string | null;
        }>(res);
      return data.stats ? (parseRemoteStatsBlob(data.stats) as ChildOlympiadStats) : null;
    } catch {
      return null;
    }
  }, [authFetch, childId]);

  const push = useCallback(
    async (stats: ChildOlympiadStats) => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        const stamped = saveOlympiadStats(childId, stats);
        await authFetch("/api/olympiad/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            stats: stamped,
            clientUpdatedAt: stamped.clientUpdatedAt,
          }),
        });
      } catch {
        /* offline — local copy is fine */
      } finally {
        syncing.current = false;
      }
    },
    [authFetch, childId],
  );

  const hydrate = useCallback(
    async (local: ChildOlympiadStats): Promise<ChildOlympiadStats> => {
      try {
        const res = await authFetch(`/api/olympiad/stats?childId=${childId}`);
        if (!res.ok) return local;
        const data = await parseApiJson<{
          ok: true;
          stats: unknown;
          clientUpdatedAt: string | null;
        }>(res);
        if (!data.stats) return local;
        const remote = parseRemoteStatsBlob(data.stats);
        const merged = mergeStatsFromServer(local, remote, data.clientUpdatedAt);
        saveOlympiadStats(childId, { ...merged, lastSyncedAt: new Date().toISOString() });
        return merged;
      } catch {
        return local;
      }
    },
    [authFetch, childId],
  );

  return { pull, push, hydrate };
}

/**
 * Keep auto-push behind a completed hydrate for this childId.
 * Otherwise an empty/fresh local snapshot stamped with `now` can LWW-wipe
 * richer server progress (slow GET, failed hydrate, or child switch).
 */
export function useOlympiadStatsAutoSync(
  childId: number,
  stats: ChildOlympiadStats,
  setStats: (s: ChildOlympiadStats) => void,
) {
  const { push, hydrate } = useOlympiadStatsSync(childId);
  const [hydrateReady, setHydrateReady] = useState(false);
  const hydrateGen = useRef(0);

  useEffect(() => {
    const gen = ++hydrateGen.current;
    setHydrateReady(false);
    const local = stats;
    void hydrate(local).then((merged) => {
      if (gen !== hydrateGen.current) return;
      // Apply non-virgin merges so the push effect sees server progress via props.
      // Skip virgin apply — setStats stamps clientUpdatedAt and would make empty pushable.
      if (!isVirginOlympiadStats(merged)) setStats(merged);
      setHydrateReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  useEffect(() => {
    if (!hydrateReady) return;
    if (isVirginOlympiadStats(stats)) return;
    const t = setTimeout(() => void push(stats), 800);
    return () => clearTimeout(t);
  }, [stats, push, hydrateReady]);
}
