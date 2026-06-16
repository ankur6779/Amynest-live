import { parseApiJson } from "@/lib/safe-json-response";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "./use-auth-fetch";
import { getApiUrl } from "@/lib/api";

export interface RealityDashboardData {
  dashboard: {
    recommendationsMade: number;
    actionsCompleted: number;
    outcomesImproved: number;
    interventionsWorked: number;
    interventionsFailed: number;
    topEffective: Array<{
      key: string;
      title: string;
      impactScore: number;
      confidence: number;
      responseType: string;
    }>;
    topFailed: Array<{
      key: string;
      title: string;
      failureCount: number;
    }>;
    recentValidations: Array<{
      title: string;
      scorecard: string;
      deltaSummary: string;
      confidence: number;
    }>;
    amyEvidenceAvailable: boolean;
  };
  strategyProfile: {
    preferences: Record<string, number>;
    globalBenchmarks: {
      routinePercentile: number;
      learningPercentile: number;
      cohortLabel: string;
    };
  } | null;
}

export function useRealityDashboard(enabled = true) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: ["reality-dashboard"],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<RealityDashboardData> => {
      const res = await authFetch(getApiUrl("/api/reality-validation/dashboard"));
      if (!res.ok) throw new Error("reality_dashboard_failed");
      return parseApiJson(res);
    },
  });
}

export async function askAmyEvidence(
  authFetch: ReturnType<typeof useAuthFetch>,
  question: string,
): Promise<{ answer: string; evidence: Array<{ delta: string; scorecard: string }> }> {
  const res = await authFetch(getApiUrl("/api/reality-validation/amy-evidence"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("amy_evidence_failed");
  return parseApiJson(res);
}
