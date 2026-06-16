import { parseApiJson } from "@/lib/safe-json-response";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import type { HubDashboardData } from "@/components/family-executive-dashboard/types";
import { HUB_EXECUTIVE_PERF_BUDGET } from "@/lib/hub-executive-analytics";

export function useHubDashboard(enabled = true) {
  const authFetch = useAuthFetch();

  return useQuery<HubDashboardData>({
    queryKey: ["amy-hub-dashboard"],
    enabled,
    staleTime: HUB_EXECUTIVE_PERF_BUDGET.staleTimeMs,
    queryFn: async () => {
      const started = performance.now();
      const res = await authFetch(getApiUrl("/api/amy/hub-dashboard"));
      if (!res.ok) {
        throw new Error(`hub_dashboard_${res.status}`);
      }
      const data = (await parseApiJson<HubDashboardData>(res));
      const elapsed = performance.now() - started;
      const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
      if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
        if (elapsed > HUB_EXECUTIVE_PERF_BUDGET.p95FetchMs) {
          console.warn("[hub-executive] fetch exceeded budget", { elapsed, bytes });
        }
        if (bytes > HUB_EXECUTIVE_PERF_BUDGET.maxJsonBytes) {
          console.warn("[hub-executive] payload exceeded budget", { bytes });
        }
      }
      return data;
    },
  });
}
