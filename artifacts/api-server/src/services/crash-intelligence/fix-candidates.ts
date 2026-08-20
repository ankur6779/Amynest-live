import type { FixCandidate } from "./types.js";

/**
 * Engineer-reviewable fix candidates — read-only, never auto-applied.
 */
export const FIX_CANDIDATES: FixCandidate[] = [
  {
    readableFingerprint: "ChildForm|MaximumDepth|InfantEffect",
    issue: "Unconditional setValue in infant-normalize effect.",
    evidence: [
      "form.tsx:345 — setValue called when patches.educationStage is truthy without comparing current value",
      "infantFormNormalizationPatches returns patch when educationStage !== 'at_home'",
      "Effect deps [isInfant, watchDob, form] — form object identity triggers re-runs",
      "Hydration reset (form.tsx:449) can change educationStage, re-triggering infant effect",
      "Production stack: Maximum update depth exceeded at ChildForm",
    ],
    proposedFix:
      "Before setValue, compare form.getValues('educationStage') to patches.educationStage; skip when equal. Consider removing `form` from effect deps (use form.getValues/setValue stable ref). Keep infantFormNormalizationPatches as single source of patch truth.",
    confidence: 95,
    risk: "Low",
    minimalDiffHint:
      "if (form.getValues('educationStage') !== patches.educationStage) { form.setValue(...) }",
  },
  {
    readableFingerprint: "ChildForm|MaximumDepth|ChildForm",
    issue: "form.reset on every React Query refetch despite hydration key guard.",
    evidence: [
      "form.tsx:369-481 — hydration useEffect depends on child + parentCountry",
      "childFormResetValuesEqual exists but reset still fires when watchers churn",
      "buildChildHydrationKey uses childId:dob:parentCountry (stable)",
    ],
    proposedFix:
      "Early-return when childHydrationKeyRef matches hydrationKey before any setValue/reset. Use country-only patch path (lines 427-444) when only parentCountry changed.",
    confidence: 90,
    risk: "Low",
    minimalDiffHint: "if (childHydrationKeyRef.current === hydrationKey) return;",
  },
  {
    readableFingerprint: "Dashboard|ChunkLoad|LazyImport",
    issue: "Stale lazy chunk after deploy.",
    evidence: [
      "ChunkLoadError in message fingerprint class",
      "crash-recovery.ts L6 reload stage exists",
    ],
    proposedFix:
      "Ensure ChunkLoadError triggers single reload (max 3). Bump app-build-version meta on deploy.",
    confidence: 85,
    risk: "Low",
  },
  {
    readableFingerprint: "RoutineGenerator|Error|MealBuilder",
    issue: "Undefined meal slot access.",
    evidence: ["TypeError during MealBuilder mapping in routine generation"],
    proposedFix: "Null-guard slot reads; default empty slot object.",
    confidence: 70,
    risk: "Medium",
  },
  {
    readableFingerprint: "NotificationEngine|Network|NotificationEngine",
    issue: "Unhandled network timeout at dispatch boundary.",
    evidence: ["Failed to fetch in notification dispatch path"],
    proposedFix: "try/catch at dispatch guard; log + dedup, never throw to React.",
    confidence: 80,
    risk: "Low",
  },
];

export function getFixCandidateForFingerprint(
  readableFingerprint: string,
): FixCandidate | null {
  return (
    FIX_CANDIDATES.find((c) => c.readableFingerprint === readableFingerprint) ??
    null
  );
}
