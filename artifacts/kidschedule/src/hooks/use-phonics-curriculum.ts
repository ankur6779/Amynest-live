import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const reqIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!childId) return;
    const myReq = ++reqIdRef.current;
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
      if (
        isMounted.current &&
        myReq === reqIdRef.current &&
        !("fallback" in res)
      ) {
        setData(res);
      }
    } catch (e) {
      if (isMounted.current && myReq === reqIdRef.current) {
        setError(e instanceof Error ? e.message : "curriculum_load_failed");
        setData(null);
      }
    } finally {
      if (isMounted.current && myReq === reqIdRef.current) setLoading(false);
    }
  }, [authFetch, childId, isMounted]);

  // Sibling chips reuse PhonicsJourneyHub / PhonicsLearning without remount.
  // Drop prior-child curriculum before passive sync effects can stamp A's
  // lastTestScore / curriculumLevel into B's habit+adaptive localStorage keys.
  useLayoutEffect(() => {
    reqIdRef.current += 1;
    setData(null);
    setError(null);
    if (childId) setLoading(true);
  }, [childId]);

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
