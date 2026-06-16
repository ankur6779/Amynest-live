import { parseApiJson } from "@/lib/safe-json-response";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";

export interface ContinueJourneyData {
  engineVersion: string;
  hasUnfinished: boolean;
  topIntent: {
    intentId: string;
    title: string;
    subtitle: string;
    amyContinuationLine: string;
    href: string;
    actionTarget: string;
    progressPct: number;
    intentType: string;
    state: string;
  } | null;
  amyLine: string;
  allUnfinished: ContinueJourneyData["topIntent"][];
}

export function useContinueJourney(enabled = true) {
  const authFetch = useAuthFetch();
  return useQuery<ContinueJourneyData>({
    queryKey: ["continue-journey"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await authFetch(getApiUrl("/api/intent-recovery/continue-journey"));
      if (!r.ok) throw new Error("continue_journey_failed");
      return parseApiJson(r);
    },
  });
}

export function useIntentMutations() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["continue-journey"] });
  };

  const transition = useMutation({
    mutationFn: async ({ intentId, state }: { intentId: string; state: string }) => {
      const r = await authFetch(getApiUrl(`/api/intent-recovery/${intentId}/transition`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      if (!r.ok) throw new Error("transition_failed");
      return parseApiJson(r);
    },
    onSuccess: invalidate,
  });

  const interrupt = useMutation({
    mutationFn: async (intentId: string) => {
      const r = await authFetch(getApiUrl(`/api/intent-recovery/${intentId}/interrupt`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!r.ok) throw new Error("interrupt_failed");
      return parseApiJson(r);
    },
    onSuccess: invalidate,
  });

  const createIntent = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await authFetch(getApiUrl("/api/intent-recovery"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("create_intent_failed");
      return parseApiJson(r);
    },
    onSuccess: invalidate,
  });

  return { transition, interrupt, createIntent };
}
