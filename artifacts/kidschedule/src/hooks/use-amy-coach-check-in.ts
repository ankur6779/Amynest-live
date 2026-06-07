import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  type CoachCheckInHistoryEntry,
  type CoachCheckInViewModel,
  type CoachProgressViewModel,
  pickPrimaryCoachSession,
  resolveCoachCheckIn,
} from "@workspace/coach-journey";
import {
  formatLastCheckInLabel,
  getCoachCheckInSnoozedUntil,
  getLastCheckInAt,
  getLastCoachActivityAt,
  loadCoachCheckInHistory,
  saveCoachCheckInResponse,
  snoozeCoachCheckIn,
} from "@/lib/coach-check-in-state";
import { loadLocalCoachIntelligence, applyLocalCoachIntelligenceEvent } from "@/lib/coach-intelligence-state";
import {
  getGraduationForSession,
  isGoalInMaintenance,
  loadCoachGraduations,
} from "@/lib/coach-graduation-state";
import { withActiveChildId } from "@/lib/coach-age-nav";

export function useAmyCoachCheckIn() {
  const authFetch = useAuthFetch();
  const { userId } = useAuth();
  const [sessions, setSessions] = useState<CoachProgressViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [intelVersion, setIntelVersion] = useState(0);

  const localIntelligence = useMemo(
    () => (userId ? loadLocalCoachIntelligence(userId) : null),
    [userId, intelVersion],
  );

  const graduations = useMemo(
    () => loadCoachGraduations(userId ?? "anon"),
    [userId, refreshKey],
  );

  const maintenanceGoalIds = useMemo(
    () => graduations.filter((g) => g.maintenanceMode).map((g) => g.goalId),
    [graduations],
  );

  const primarySession = useMemo(
    () => pickPrimaryCoachSession(sessions, maintenanceGoalIds),
    [maintenanceGoalIds, sessions],
  );

  const checkInHistory = useMemo(
    () => loadCoachCheckInHistory(userId ?? "anon"),
    [userId, refreshKey],
  );

  const checkIn = useMemo((): CoachCheckInViewModel | null => {
    if (!primarySession) return null;
    const graduation = getGraduationForSession(userId ?? "anon", primarySession.sessionId);
    const maintenanceMode =
      graduation?.maintenanceMode === true ||
      isGoalInMaintenance(userId ?? "anon", primarySession.goalId) ||
      primarySession.progressPct >= 100;

    return resolveCoachCheckIn({
      session: primarySession,
      lastActivityAt:
        getLastCoachActivityAt(userId ?? "anon", primarySession.sessionId) ??
        primarySession.lastUpdated,
      lastCheckInAt: getLastCheckInAt(userId ?? "anon", primarySession.sessionId),
      snoozedUntil: getCoachCheckInSnoozedUntil(userId ?? "anon"),
      maintenanceMode,
      checkInHistory,
      intelligence: localIntelligence,
    });
  }, [checkInHistory, localIntelligence, primarySession, userId]);

  const lastCheckInLabel = useMemo(() => {
    if (!primarySession) return null;
    return formatLastCheckInLabel(getLastCheckInAt(userId ?? "anon", primarySession.sessionId));
  }, [primarySession, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [progressRes, intelRes] = await Promise.all([
          authFetch("/api/ai-coach/progress"),
          authFetch(
            `/api/ai-coach/intelligence?goalId=${encodeURIComponent(primarySession?.goalId ?? "")}`,
          ),
        ]);
        if (progressRes.ok) {
          const data = (await progressRes.json()) as { sessions: CoachProgressViewModel[] };
          if (!cancelled) setSessions(data.sessions ?? []);
        }
        if (intelRes.ok && userId) {
          const remote = await intelRes.json();
          const { syncCoachIntelligenceFromServer } = await import("@/lib/coach-intelligence-state");
          syncCoachIntelligenceFromServer(userId, remote);
          if (!cancelled) setIntelVersion((v) => v + 1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, primarySession?.goalId, refreshKey, userId]);

  const respond = useCallback(
    async (optionId: string, optionLabel: string, clarificationAnswer?: string) => {
      if (!checkIn) return;
      const at = new Date().toISOString();
      const entry: CoachCheckInHistoryEntry = {
        sessionId: checkIn.sessionId,
        goalId: checkIn.goalId,
        kind: checkIn.kind,
        optionId,
        optionLabel: clarificationAnswer ?? optionLabel,
        at,
        clarificationAnswer,
      };
      saveCoachCheckInResponse(userId ?? "anon", entry);

      const positive = ["better", "yes", "still_well", "a_little", "keep_pace", "mixed", "advanced"].includes(
        optionId,
      );
      if (userId && optionId !== "snooze") {
        applyLocalCoachIntelligenceEvent(userId, {
          type: "check_in",
          sessionId: checkIn.sessionId,
          goalId: checkIn.goalId,
          optionLabel: entry.optionLabel,
          positive,
        });
        setIntelVersion((v) => v + 1);
      }

      if (optionId === "snooze") {
        const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        snoozeCoachCheckIn(userId ?? "anon", until);
      }

      void authFetch("/api/ai-coach/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          withActiveChildId({
            sessionId: checkIn.sessionId,
            goalId: checkIn.goalId,
            kind: checkIn.kind,
            optionId,
            optionLabel: entry.optionLabel,
            clarificationAnswer,
          }),
        ),
      }).catch(() => {});

      setRefreshKey((k) => k + 1);
    },
    [authFetch, checkIn, userId],
  );

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  return {
    loading,
    primarySession,
    checkIn,
    lastCheckInLabel,
    checkInHistory,
    respond,
    refetch,
  };
}
