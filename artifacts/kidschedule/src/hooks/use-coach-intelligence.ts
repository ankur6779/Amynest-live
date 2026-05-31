import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  getCoachIntelligenceForUi,
  loadLocalCoachIntelligence,
  syncCoachIntelligenceFromServer,
} from "@/lib/coach-intelligence-state";
import type { CoachIntelligencePublicView, CoachIntelligenceSnapshot } from "@workspace/coach-journey";

export function useCoachIntelligence(activeGoalId?: string) {
  const authFetch = useAuthFetch();
  const { userId } = useAuth();
  const [publicView, setPublicView] = useState<CoachIntelligencePublicView | null>(() =>
    userId ? getCoachIntelligenceForUi(userId) : null,
  );
  const [localSnapshot, setLocalSnapshot] = useState<CoachIntelligenceSnapshot | null>(() =>
    userId ? loadLocalCoachIntelligence(userId) : null,
  );
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const qs = activeGoalId ? `?goalId=${encodeURIComponent(activeGoalId)}` : "";
      const res = await authFetch(`/api/ai-coach/intelligence${qs}`);
      if (res.ok) {
        const remote = (await res.json()) as CoachIntelligencePublicView;
        const merged = syncCoachIntelligenceFromServer(userId, remote);
        setPublicView(merged);
        setLocalSnapshot(loadLocalCoachIntelligence(userId));
      }
    } finally {
      setLoading(false);
    }
  }, [activeGoalId, authFetch, userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    loading,
    publicView,
    localSnapshot,
    refetch,
    usedPhraseHashes: publicView?.usedPhraseHashes ?? [],
    familyReference: publicView?.familyReference ?? null,
    contentDensity: publicView?.contentDensity ?? "standard",
  };
}
