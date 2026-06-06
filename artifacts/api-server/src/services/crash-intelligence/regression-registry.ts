import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CrashRegressionEntry } from "./types.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

/**
 * Static regression registry — links fingerprints to test files.
 * Synced to crash_regressions table on boot / audit; never auto-modifies source.
 */
export const CRASH_REGRESSION_REGISTRY: CrashRegressionEntry[] = [
  {
    readableFingerprint: "ChildForm|MaximumDepth|InfantEffect",
    status: "covered",
    rootCauseId: "child-form-infant-effect-loop",
    testPaths: [
      "artifacts/kidschedule/src/__tests__/child-form-infant-effect.test.ts",
      "artifacts/kidschedule/src/lib/child-form-hydration.test.ts",
      "artifacts/kidschedule/src/__tests__/child-form-render-loop.test.tsx",
      "artifacts/kidschedule/src/__tests__/child-dob-picker.test.tsx",
    ],
  },
  {
    readableFingerprint: "ChildForm|MaximumDepth|ChildForm",
    status: "covered",
    rootCauseId: "child-form-hydration-reset-loop",
    testPaths: [
      "artifacts/kidschedule/src/lib/child-form-hydration.test.ts",
      "artifacts/kidschedule/src/__tests__/child-form-render-loop.test.tsx",
    ],
  },
  {
    readableFingerprint: "Dashboard|ChunkLoad|LazyImport",
    status: "pending",
    rootCauseId: "dashboard-chunk-load",
    testPaths: [
      "artifacts/kidschedule/src/__tests__/crash-recovery.test.ts",
    ],
  },
  {
    readableFingerprint: "RoutineGenerator|Error|MealBuilder",
    status: "pending",
    rootCauseId: "routine-generator-type-error",
    testPaths: [],
  },
  {
    readableFingerprint: "NotificationEngine|Network|NotificationEngine",
    status: "pending",
    rootCauseId: "notification-engine-network",
    testPaths: [],
  },
];

export function getRegressionForFingerprint(
  readableFingerprint: string,
): CrashRegressionEntry | null {
  return (
    CRASH_REGRESSION_REGISTRY.find(
      (r) => r.readableFingerprint === readableFingerprint,
    ) ?? null
  );
}

export function verifyRegressionTestFiles(
  entry: CrashRegressionEntry,
): { ok: boolean; missing: string[] } {
  const missing = entry.testPaths.filter(
    (p) => !existsSync(join(REPO_ROOT, p)),
  );
  return { ok: missing.length === 0 && entry.testPaths.length > 0, missing };
}

export function listAllRegressions(): CrashRegressionEntry[] {
  return [...CRASH_REGRESSION_REGISTRY];
}
