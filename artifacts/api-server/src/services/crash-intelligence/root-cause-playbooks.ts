import type { RootCauseChain } from "./types.js";

/**
 * Evidence-backed root cause chains — no speculation.
 * Updated when engineers confirm a production crash root cause.
 */
export const ROOT_CAUSE_PLAYBOOKS: RootCauseChain[] = [
  {
    id: "child-form-infant-effect-loop",
    readableFingerprint: "ChildForm|MaximumDepth|InfantEffect",
    component: "ChildForm",
    hook: "useEffect (infant educationStage normalization)",
    dependency: "educationStage field + RHF watch subscribers",
    stateMutation: "unconditional form.setValue('educationStage', …)",
    chain: [
      "React Query refetch (children query)",
      "ChildForm hydration useEffect",
      "form.reset with unstable dependency key",
      "RHF watch / useWatch subscribers",
      "infant educationStage useEffect",
      "setValue without equality guard",
      "Maximum update depth exceeded",
    ],
    evidence: [
      "artifacts/kidschedule/src/pages/children/form.tsx",
      "artifacts/kidschedule/src/lib/child-form-hydration.ts",
      "artifacts/kidschedule/src/lib/self-healing/orchestrator.ts",
    ],
  },
  {
    id: "child-form-hydration-reset-loop",
    readableFingerprint: "ChildForm|MaximumDepth|ChildForm",
    component: "ChildForm",
    hook: "useEffect (child hydration)",
    dependency: "hydrationKey including updatedAt/name",
    stateMutation: "form.reset on every query refetch",
    chain: [
      "React Query background refetch",
      "hydration useEffect fires",
      "form.reset",
      "RHF field subscriptions",
      "child field effects",
      "render loop",
    ],
    evidence: [
      "artifacts/kidschedule/src/lib/child-form-hydration.ts",
      "artifacts/kidschedule/src/pages/children/form.tsx",
    ],
  },
  {
    id: "dashboard-chunk-load",
    readableFingerprint: "Dashboard|ChunkLoad|LazyImport",
    component: "Dashboard",
    hook: "React.lazy / dynamic import",
    dependency: "stale deploy chunk hash",
    stateMutation: "failed module fetch",
    chain: [
      "Route navigation to /dashboard",
      "React.lazy import",
      "ChunkLoadError (stale bundle)",
      "error boundary recovery",
    ],
    evidence: [
      "artifacts/kidschedule/src/lib/crash-recovery.ts",
      "artifacts/kidschedule/src/lib/self-healing/orchestrator.ts",
    ],
  },
  {
    id: "routine-generator-type-error",
    readableFingerprint: "RoutineGenerator|Error|MealBuilder",
    component: "RoutineGenerator",
    hook: "meal builder integration",
    dependency: "routine payload shape",
    stateMutation: "invalid meal slot access",
    chain: [
      "Routine generation request",
      "MealBuilder slot mapping",
      "TypeError on undefined slot",
      "component crash",
    ],
    evidence: ["artifacts/kidschedule/src/pages/routines/"],
  },
  {
    id: "notification-engine-network",
    readableFingerprint: "NotificationEngine|Network|NotificationEngine",
    component: "NotificationEngine",
    hook: "dispatch / fetch",
    dependency: "network timeout",
    stateMutation: "unhandled fetch rejection",
    chain: [
      "Notification dispatch",
      "API fetch timeout",
      "Failed to fetch",
      "unhandled rejection → crash overlay",
    ],
    evidence: ["lib/notification-engine/src/delivery/"],
  },
];

export function getRootCauseForFingerprint(
  readableFingerprint: string,
): RootCauseChain | null {
  return (
    ROOT_CAUSE_PLAYBOOKS.find(
      (p) => p.readableFingerprint === readableFingerprint,
    ) ?? null
  );
}
