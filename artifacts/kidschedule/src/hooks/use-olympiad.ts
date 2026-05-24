import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import type { OlympiadAgeBand, OlympiadRunType, OlympiadTrackId } from "@workspace/olympiad";

export interface OlympiadLeaderboardEntry {
  rank: number;
  childId: number;
  name: string;
  points: number;
  isMe: boolean;
}

export interface OlympiadLeaderboardResponse {
  weekStart: string;
  top: OlympiadLeaderboardEntry[];
  me: { rank: number; points: number; total: number };
}

export function useSubmitOlympiadScore() {
  const authFetch = useAuthFetch();

  return useCallback(
    async (payload: {
      childId: number;
      ageBand: OlympiadAgeBand;
      runType: OlympiadRunType;
      trackId?: OlympiadTrackId;
      questionsAttempted: number;
      questionsCorrect: number;
      durationSec: number;
    }) => {
      try {
        const res = await authFetch("/api/olympiad/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { ok: true; id: number; score: number };
        return data;
      } catch {
        return null;
      }
    },
    [authFetch],
  );
}

export function useOlympiadLeaderboard(
  scope: "family" | "global",
  ageBand: OlympiadAgeBand,
  childId: number,
) {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<OlympiadLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const limit = scope === "global" ? 20 : 10;
      const res = await authFetch(
        `/api/olympiad/leaderboard/${scope}?ageBand=${encodeURIComponent(ageBand)}&childId=${childId}&limit=${limit}`,
      );
      if (!res.ok) throw new Error(`lb_${res.status}`);
      const json = (await res.json()) as { ok: true } & OlympiadLeaderboardResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "lb_failed");
    } finally {
      setLoading(false);
    }
  }, [authFetch, scope, ageBand, childId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
