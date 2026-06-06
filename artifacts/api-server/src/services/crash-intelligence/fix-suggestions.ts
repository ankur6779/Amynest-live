import type { FixSuggestion } from "./types.js";

/**
 * Read-only fix recommendations — engineers approve before merge.
 * Never auto-applied to production source.
 */
export const FIX_SUGGESTIONS: FixSuggestion[] = [
  {
    readableFingerprint: "ChildForm|MaximumDepth|InfantEffect",
    issue: "Unconditional setValue in infant ageBand effect.",
    whyItHappens:
      "setValue on every effect run triggers RHF re-render subscribers, which re-fire the effect when query hydration also resets the form.",
    minimalFix:
      "Guard setValue with field equality comparison (skip when ageBand already matches target). Stabilize hydration effect deps (exclude updatedAt/name from hydrationKey).",
    regressionRisk: "Low",
    testsRequired: [
      "Edit infant child profile",
      "Edit toddler child profile",
      "React Query refetch storms",
      "Verify render count stable (<5 per hydration)",
    ],
  },
  {
    readableFingerprint: "ChildForm|MaximumDepth|ChildForm",
    issue: "form.reset on every React Query refetch.",
    whyItHappens:
      "Hydration useEffect depends on unstable child record fields, so background refetches re-trigger full form reset.",
    minimalFix:
      "Use stable hydrationKey (child id + version). Skip reset when form values already match server snapshot.",
    regressionRisk: "Low",
    testsRequired: [
      "Background refetch does not reset dirty form",
      "Initial load hydrates correctly",
      "Country-only patch without full reset",
    ],
  },
  {
    readableFingerprint: "Dashboard|ChunkLoad|LazyImport",
    issue: "Stale lazy chunk after deploy.",
    whyItHappens:
      "Browser caches old index.html referencing removed chunk hashes after OTA or CDN deploy.",
    minimalFix:
      "Trigger single controlled reload on ChunkLoadError (L6 recovery). Ensure deploy meta version bump invalidates HTML cache.",
    regressionRisk: "Low",
    testsRequired: [
      "Simulate ChunkLoadError → one reload",
      "No reload loop after 3 attempts",
    ],
  },
  {
    readableFingerprint: "RoutineGenerator|Error|MealBuilder",
    issue: "Undefined meal slot access during routine assembly.",
    whyItHappens:
      "Generated routine payload missing expected meal slot keys for certain age bands.",
    minimalFix:
      "Null-guard meal slot reads; default empty slot before MealBuilder mapping.",
    regressionRisk: "Medium",
    testsRequired: [
      "Generate routine for each age band",
      "MealBuilder with partial slots",
    ],
  },
  {
    readableFingerprint: "NotificationEngine|Network|NotificationEngine",
    issue: "Unhandled network timeout in notification dispatch.",
    whyItHappens:
      "Fetch rejection propagates to UI layer without try/catch at dispatch boundary.",
    minimalFix:
      "Catch and log at dispatch guard; surface silent retry, never throw to React tree.",
    regressionRisk: "Low",
    testsRequired: [
      "Simulate network timeout",
      "Verify no user-visible crash",
      "Dedup fingerprint stable",
    ],
  },
];

export function getFixSuggestionForFingerprint(
  readableFingerprint: string,
): FixSuggestion | null {
  return (
    FIX_SUGGESTIONS.find(
      (s) => s.readableFingerprint === readableFingerprint,
    ) ?? null
  );
}
