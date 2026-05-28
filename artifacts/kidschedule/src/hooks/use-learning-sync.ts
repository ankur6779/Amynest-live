/**
 * Phase 6 — wires the learning sync engine to the auth-aware fetcher and the
 * shared reward celebration channel. Mount this once near the root.
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  configureLearningSync,
  subscribeLearningSync,
  type SyncDiagnostics,
} from "@/lib/learning-sync-engine";
import { publishRewardEvents } from "@/lib/learning-reward-bus";
import { startResilienceWatcher, type ResilienceReport } from "@/lib/resilience-recovery";
import { recordTelemetry } from "@/lib/telemetry-engine";

export function useLearningSyncBootstrap() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  useEffect(() => {
    configureLearningSync({
      fetcher: authFetch,
      getApiUrl,
      onRewards: (events) => {
        publishRewardEvents(events);
        void qc.invalidateQueries({ queryKey: ["learning-progress", "status"] });
      },
    });
    const stop = startResilienceWatcher({
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
  }, [authFetch, qc]);
}

export function useLearningResilienceReport(): ResilienceReport | null {
  const [report, setReport] = useState<ResilienceReport | null>(null);
  useEffect(() => startResilienceWatcher({ onReport: setReport }), []);
  return report;
}

export function useLearningSyncDiagnostics(): SyncDiagnostics | null {
  const [diag, setDiag] = useState<SyncDiagnostics | null>(null);
  useEffect(() => subscribeLearningSync(setDiag), []);
  return diag;
}
