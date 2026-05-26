import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useMountedRef } from "@/hooks/use-safe-async";
import { safeAuthFetchJson } from "@/lib/safe-auth-fetch-json";
import type { PhonicsDailyPlan, ChildCurriculumProgress } from "@workspace/phonics-curriculum";

export interface CurriculumApiResponse {
  [key: string]: unknown;
  plan: PhonicsDailyPlan;
  completionPct: number;
  progress: ChildCurriculumProgress;
  levels: { level: number; name: string; skills: string[]; content: string[] }[];
}

export function usePhonicsCurriculum(childId: number | null) {
  const authFetch = useAuthFetch();
  const isMounted = useMountedRef();
  const [data, setData] = useState<CurriculumApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await safeAuthFetchJson<CurriculumApiResponse>(
        authFetch,
        "/api/phonics/curriculum/daily-plan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId }),
        },
      );
      if (isMounted.current && !("fallback" in res)) setData(res);
    } catch (e) {
      if (isMounted.current) {
        setError(e instanceof Error ? e.message : "curriculum_load_failed");
        setData(null);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [authFetch, childId, isMounted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const completeActivity = useCallback(
    async (activityId: string) => {
      if (!childId) return;
      await safeAuthFetchJson(
        authFetch,
        "/api/phonics/curriculum/complete-activity",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, activityId }),
        },
      );
      await refresh();
    },
    [authFetch, childId, refresh],
  );

  return { data, loading, error, refresh, completeActivity };
}
