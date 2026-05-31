import { useCallback, useEffect, useRef } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  type ChildOlympiadStats,
  mergeStatsFromServer,
  parseRemoteStatsBlob,
  saveOlympiadStats,
} from "@/lib/olympiad-local-stats";

export function useOlympiadStatsSync(childId: number) {
  const authFetch = useAuthFetch();
  const syncing = useRef(false);

  const pull = useCallback(async (): Promise<ChildOlympiadStats | null> => {
    try {
      const res = await authFetch(`/api/olympiad/stats?childId=${childId}`);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        ok: true;
        stats: unknown;
        clientUpdatedAt: string | null;
      };
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
        const data = (await res.json()) as {
          ok: true;
          stats: unknown;
          clientUpdatedAt: string | null;
        };
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

export function useOlympiadStatsAutoSync(
  childId: number,
  stats: ChildOlympiadStats,
  setStats: (s: ChildOlympiadStats) => void,
) {
  const { push, hydrate } = useOlympiadStatsSync(childId);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void hydrate(stats).then((merged) => {
      if (merged !== stats) setStats(merged);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  useEffect(() => {
    const t = setTimeout(() => void push(stats), 800);
    return () => clearTimeout(t);
  }, [stats, push]);
}
