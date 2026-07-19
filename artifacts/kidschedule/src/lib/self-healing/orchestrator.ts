/**
 * Self-healing orchestrator — coordinates recovery levels 1–10.
 * Never modifies production source code.
 */

import type { QueryClient } from "@tanstack/react-query";
import {
  canAttemptAutoRecovery,
  navigateToSafeRoute,
  planCrashRecovery,
  type RecoveryStage,
} from "@/lib/crash-recovery";
import { reportCrash } from "@/lib/crash-report";
import { getCrashRouteContext } from "@/lib/crash-route-context";
import { isInfiniteRenderError } from "@/lib/runtime-crash-policy";
import { captureCrashIntelligence } from "@/lib/self-healing/crash-intelligence";
import { recordFingerprintSpike } from "@/lib/self-healing/feature-mitigation";
import { quarantineRoute } from "@/lib/self-healing/route-quarantine";
import { recoverComponentState } from "@/lib/self-healing/state-recovery";
import { getActiveQueryKeyLabels } from "@/lib/self-healing/query-recovery";
import { recordRecoveryEvent } from "@/lib/self-healing/recovery-stats";
import type { RecoveryLevel, RecoveryOutcome } from "@/lib/self-healing/types";

export type ComponentCrashInput = {
  error: Error;
  component: string;
  componentStack?: string;
  userId?: string | null;
  queryClient?: QueryClient;
};

export type ComponentCrashPlan = {
  stage: RecoveryStage;
  level: RecoveryLevel;
  outcome: RecoveryOutcome;
  errorReferenceId: string;
  readableFingerprint: string;
  mitigationApplied: string | null;
  skipAutoRecovery: boolean;
};

/** Level 9 + 10 intelligence, then derive recovery plan for AppErrorBoundary. */
export async function planComponentCrashRecovery(
  input: ComponentCrashInput,
): Promise<ComponentCrashPlan> {
  const queryKeys = input.queryClient
    ? getActiveQueryKeyLabels(input.queryClient)
    : undefined;

  const intelligence = captureCrashIntelligence({
    kind: "react.render",
    message: input.error.message,
    stack: input.error.stack,
    component: input.component,
    componentStack: input.componentStack,
    userId: input.userId,
    queryKeys,
  });

  const mitigationApplied = recordFingerprintSpike(intelligence.readableFingerprint);

  const reportWithOutcome = (recoveryOutcome: RecoveryOutcome) => {
    void reportCrash({
      kind: "react.render",
      message: input.error.message,
      stack: input.error.stack,
      component: input.component,
      componentStack: input.componentStack,
      userId: input.userId,
      errorId: intelligence.errorId,
      fingerprint: intelligence.fingerprint,
      readableFingerprint: intelligence.readableFingerprint,
      meta: {
        queryKeys: intelligence.queryKeys,
        recentActions: intelligence.recentActions,
        mitigationApplied,
        recoveryOutcome,
        selfHealing: true,
        ...getCrashRouteContext(),
      },
    });
  };

  if (isInfiniteRenderError(input.error)) {
    quarantineRoute(input.component, intelligence.readableFingerprint);
    const navigated = canAttemptAutoRecovery() && navigateToSafeRoute();
    reportWithOutcome(navigated ? "quarantined" : "manual_required");
    recordRecoveryEvent({
      level: 5,
      outcome: navigated ? "quarantined" : "manual_required",
      component: input.component,
      route: intelligence.route,
      fingerprint: intelligence.readableFingerprint,
      detail: "infinite_render",
    });
    return {
      stage: "manual",
      level: 5,
      outcome: navigated ? "quarantined" : "manual_required",
      errorReferenceId: intelligence.errorId,
      readableFingerprint: intelligence.readableFingerprint,
      mitigationApplied,
      skipAutoRecovery: true,
    };
  }

  if (!canAttemptAutoRecovery()) {
    reportWithOutcome("manual_required");
    recordRecoveryEvent({
      level: 1,
      outcome: "manual_required",
      component: input.component,
      fingerprint: intelligence.readableFingerprint,
    });
    return {
      stage: "manual",
      level: 1,
      outcome: "manual_required",
      errorReferenceId: intelligence.errorId,
      readableFingerprint: intelligence.readableFingerprint,
      mitigationApplied,
      skipAutoRecovery: true,
    };
  }

  const stage = planCrashRecovery(input.component);

  if (stage === "remount" && input.queryClient) {
    void recoverComponentState({
      component: input.component,
      queryClient: input.queryClient,
    });
  }

  if (stage === "navigate" && input.queryClient) {
    void recoverComponentState({
      component: input.component,
      queryClient: input.queryClient,
    });
  }

  const level: RecoveryLevel = stage === "remount" ? 1 : stage === "navigate" ? 2 : stage === "reload" ? 6 : 1;
  const outcome: RecoveryOutcome =
    stage === "manual" ? "manual_required" : "auto_recovered";
  reportWithOutcome(outcome);

  return {
    stage,
    level,
    outcome,
    errorReferenceId: intelligence.errorId,
    readableFingerprint: intelligence.readableFingerprint,
    mitigationApplied,
    skipAutoRecovery: false,
  };
}

export function recordRecoveryStageComplete(
  stage: RecoveryStage,
  component: string,
  success: boolean,
): void {
  const level: RecoveryLevel =
    stage === "remount" ? 1 : stage === "navigate" ? 2 : stage === "reload" ? 6 : 1;
  recordRecoveryEvent({
    level,
    outcome: success ? "auto_recovered" : "manual_required",
    component,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}
