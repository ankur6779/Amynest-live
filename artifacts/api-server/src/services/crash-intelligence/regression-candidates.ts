import type { RegressionCandidate } from "./types.js";

/** Suggested regression tests — engineers implement; system never auto-writes tests. */
export const REGRESSION_CANDIDATES: RegressionCandidate[] = [
  {
    readableFingerprint: "ChildForm|MaximumDepth|InfantEffect",
    scenarios: [
      {
        name: "Edit infant",
        description: "Load /children/:id for infant (<12mo), verify no render loop",
        suggestedTestFile:
          "artifacts/kidschedule/src/__tests__/child-form-infant-effect.test.ts",
        assertions: [
          "infantFormNormalizationPatches returns null when already at_home",
          "effect does not call setValue when patch is null",
          "render count stable across 3 hydration cycles",
        ],
      },
      {
        name: "Refetch storm",
        description: "Simulate React Query refetch while infant form mounted",
        suggestedTestFile:
          "artifacts/kidschedule/src/__tests__/child-form-render-loop.test.tsx",
        assertions: [
          "form.reset skipped when values equal",
          "no Maximum update depth error",
          "useWatch subscribers <= 5 renders per refetch",
        ],
      },
      {
        name: "Change DOB",
        description: "Toggle DOB across infant/toddler boundary",
        suggestedTestFile:
          "artifacts/kidschedule/src/__tests__/child-dob-picker.test.tsx",
        assertions: [
          "infant effect runs once on boundary cross",
          "educationStage set to at_home only when needed",
        ],
      },
      {
        name: "Navigate between children",
        description: "Switch childId route param without loop",
        suggestedTestFile:
          "artifacts/kidschedule/src/lib/child-form-hydration.test.ts",
        assertions: [
          "hydrationKey changes reset form once",
          "childHydrationKeyRef prevents duplicate reset",
        ],
      },
    ],
  },
  {
    readableFingerprint: "ChildForm|MaximumDepth|ChildForm",
    scenarios: [
      {
        name: "Background refetch",
        description: "Query refetch with unchanged child record",
        suggestedTestFile:
          "artifacts/kidschedule/src/lib/child-form-hydration.test.ts",
        assertions: [
          "childFormResetValuesEqual prevents reset",
          "hydrationKey unchanged → early return",
        ],
      },
    ],
  },
  {
    readableFingerprint: "Dashboard|ChunkLoad|LazyImport",
    scenarios: [
      {
        name: "Chunk load recovery",
        description: "ChunkLoadError triggers single reload",
        suggestedTestFile: "artifacts/kidschedule/src/__tests__/crash-recovery.test.ts",
        assertions: [
          "planCrashRecovery returns reload for ChunkLoadError",
          "MAX_RECOVERY_ATTEMPTS respected",
        ],
      },
    ],
  },
];

export function getRegressionCandidateForFingerprint(
  readableFingerprint: string,
): RegressionCandidate | null {
  return (
    REGRESSION_CANDIDATES.find(
      (r) => r.readableFingerprint === readableFingerprint,
    ) ?? null
  );
}
