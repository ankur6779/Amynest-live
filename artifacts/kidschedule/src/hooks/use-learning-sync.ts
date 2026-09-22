/**
 * Phase 6 — wires the learning sync engine to the auth-aware fetcher and the
 * shared reward celebration channel. Mount this once near the root.
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  configureLearningSync,
  setLearningSyncUser,
  subscribeLearningSync,
  type SyncDiagnostics,
} from "@/lib/learning-sync-engine";
import { publishRewardEvents } from "@/lib/learning-reward-bus";
import { startResilienceWatcher, type ResilienceReport } from "@/lib/resilience-recovery";
import { recordTelemetry } from "@/lib/telemetry-engine";

export function useLearningSyncBootstrap() {
  const { userId, isSignedIn } = useAuth();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const boundUserId = isSignedIn ? (userId ?? null) : null;

  useEffect(() => {
    configureLearningSync({
      fetcher: authFetch,
      userId: boundUserId,
      getApiUrl,
      onRewards: (events) => {
        publishRewardEvents(events);
        void qc.invalidateQueries({ queryKey: ["learning-progress", "status"] });
      },
    });
    const stop = startResilienceWatcher({
      userId: boundUserId,
      onReport: (r) => {
        if (
          r.removedCorruptedPayload ||
          r.removedStaleEntries > 0 ||
          r.detectedRewardDesync ||
          r.flapping
        ) {
          recordTelemetry("queue_retry", r.removedStaleEntries, {
            stale: r.removedStaleEntries,
            duplicates: r.removedDuplicateEntries,
            corrupted: r.removedCorruptedPayload,
            desync: r.detectedRewardDesync,
            flapping: r.flapping,
          });
        }
      },
    });
    return () => {
      stop();
    };
  }, [authFetch, boundUserId, qc]);

  useEffect(() => {
    setLearningSyncUser(boundUserId);
  }, [boundUserId]);
}

export function useLearningResilienceReport(): ResilienceReport | null {
  const { userId, isSignedIn } = useAuth();
  const boundUserId = isSignedIn ? (userId ?? null) : null;
  const [report, setReport] = useState<ResilienceReport | null>(null);
  useEffect(
    () => startResilienceWatcher({ userId: boundUserId, onReport: setReport }),
    [boundUserId],
  );
  return report;
}

export function useLearningSyncDiagnostics(): SyncDiagnostics | null {
  const [diag, setDiag] = useState<SyncDiagnostics | null>(null);
  useEffect(() => subscribeLearningSync(setDiag), []);
  return diag;
}
