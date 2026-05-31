import { useCallback, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import type { OlympiadDifficulty } from "@workspace/olympiad";

export function useOlympiadHint(childId: number) {
  const authFetch = useAuthFetch();
  const [loading, setLoading] = useState(false);

  const fetchHint = useCallback(
    async (input: {
      question: string;
      options: string[];
      explanation: string;
      correctOption: string;
      difficulty: OlympiadDifficulty;
    }): Promise<{ hint: string; source: "ai" | "local" } | null> => {
      setLoading(true);
      try {
        const res = await authFetch("/api/olympiad/hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, ...input }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { ok: true; hint: string; source: "ai" | "local" };
        return { hint: data.hint, source: data.source };
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, childId],
  );

  return { fetchHint, loading };
}

export function useOlympiadInsight(childId: number) {
  const authFetch = useAuthFetch();
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [parentTip, setParentTip] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "template" | null>(null);

  const refresh = useCallback(
    async (payload: {
      totalPoints: number;
      streak: number;
      overallAccuracyPct: number;
      bySubject: Record<string, { correct: number; total: number }>;
    }) => {
      setLoading(true);
      try {
        const res = await authFetch("/api/olympiad/insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, ...payload }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: true;
          source: "ai" | "template";
          insight?: string;
          parentTip?: string;
        };
        setSource(data.source);
        if (data.source === "ai" && data.insight) {
          setInsight(data.insight);
          setParentTip(data.parentTip ?? null);
        }
      } catch {
        /* template fallback in UI */
      } finally {
        setLoading(false);
      }
    },
    [authFetch, childId],
  );

  return { refresh, loading, insight, parentTip, source };
}
