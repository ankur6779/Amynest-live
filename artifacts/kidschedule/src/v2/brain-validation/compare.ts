/**
 * compareLegacyWithBrain — pure dimension compare.
 * Never executes. Never mutates Legacy or Brain.
 */

import type { ResolvedDecision } from "@/v2/decision-bridge/types";
import { freezeDeep } from "./freeze";
import { buildBrainSnapshot, buildLegacySnapshot } from "./snapshots";
import type {
  BrainValidationComparison,
  BrainValidationComparisonEntry,
  BrainValidationStatus,
  LegacyProductRecommendation,
} from "./types";

function setEqual(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  if (sa.size !== a.length) {
    // allow multisets via sorted join
    return [...a].sort().join("\0") === [...b].sort().join("\0");
  }
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

function setOverlap(
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>,
): { onlyA: string[]; onlyB: string[]; both: string[] } {
  const sa = new Set(a);
  const sb = new Set(b);
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  const both: string[] = [];
  for (const x of sa) {
    if (sb.has(x)) both.push(x);
    else onlyA.push(x);
  }
  for (const x of sb) {
    if (!sa.has(x)) onlyB.push(x);
  }
  return { onlyA, onlyB, both };
}

function experienceStatus(
  legacyId: string | null,
  brainId: string | null,
): BrainValidationStatus {
  if (legacyId == null && brainId == null) return "MATCH";
  if (legacyId == null || brainId == null) return "UNKNOWN";
  return legacyId === brainId ? "MATCH" : "MISMATCH";
}

function idSetStatus(
  legacyIds: ReadonlyArray<string>,
  brainIds: ReadonlyArray<string>,
): BrainValidationStatus {
  if (legacyIds.length === 0 && brainIds.length === 0) return "MATCH";
  if (legacyIds.length === 0 || brainIds.length === 0) {
    // One side empty — soft unknown unless both empty handled above
    return "UNKNOWN";
  }
  if (setEqual(legacyIds, brainIds)) return "MATCH";
  const { both } = setOverlap(legacyIds, brainIds);
  if (both.length > 0) return "PARTIAL_MATCH";
  return "MISMATCH";
}

function aggregateStatus(
  entries: ReadonlyArray<BrainValidationComparisonEntry>,
): BrainValidationStatus {
  if (entries.length === 0) return "UNKNOWN";
  let hasMismatch = false;
  let hasPartial = false;
  let hasUnknown = false;
  let hasMatch = false;
  for (const e of entries) {
    if (e.status === "MISMATCH") hasMismatch = true;
    else if (e.status === "PARTIAL_MATCH") hasPartial = true;
    else if (e.status === "UNKNOWN") hasUnknown = true;
    else if (e.status === "MATCH") hasMatch = true;
  }
  if (hasMismatch) return "MISMATCH";
  if (hasPartial) return "PARTIAL_MATCH";
  if (hasUnknown && hasMatch) return "PARTIAL_MATCH";
  if (hasUnknown && !hasMatch) return "UNKNOWN";
  return "MATCH";
}

export type CompareLegacyWithBrainOptions = Readonly<{
  suppressedExperienceIds?: ReadonlyArray<string>;
}>;

/**
 * Compare Legacy Product Recommendation with ResolvedDecision.
 * Pure · deterministic · never throws.
 */
export function compareLegacyWithBrain(
  legacy: LegacyProductRecommendation,
  resolved: ResolvedDecision,
  options: CompareLegacyWithBrainOptions = {},
): BrainValidationComparison {
  const legacySnap = buildLegacySnapshot(legacy);
  const brainSnap = buildBrainSnapshot(
    resolved,
    options.suppressedExperienceIds ?? [],
  );

  const entries: BrainValidationComparisonEntry[] = [];

  const push = (
    dimension: BrainValidationComparisonEntry["dimension"],
    status: BrainValidationStatus,
    legacyValue: unknown,
    brainValue: unknown,
    note: string | null,
  ) => {
    entries.push(
      freezeDeep({
        dimension,
        status,
        legacyValue,
        brainValue,
        note,
      }),
    );
  };

  push(
    "primary_experience",
    experienceStatus(
      legacySnap.primaryExperienceId,
      brainSnap.primaryExperienceId,
    ),
    legacySnap.primaryExperienceId,
    brainSnap.primaryExperienceId,
    null,
  );

  push(
    "secondary_experience",
    experienceStatus(
      legacySnap.secondaryExperienceId,
      brainSnap.secondaryExperienceId,
    ),
    legacySnap.secondaryExperienceId,
    brainSnap.secondaryExperienceId,
    null,
  );

  push(
    "passive_experience",
    experienceStatus(
      legacySnap.passiveExperienceId,
      brainSnap.passiveExperienceId,
    ),
    legacySnap.passiveExperienceId,
    brainSnap.passiveExperienceId,
    null,
  );

  const featureStatus = idSetStatus(
    legacySnap.featureIds,
    brainSnap.featureIds,
  );
  const featureOverlap = setOverlap(
    legacySnap.featureIds,
    brainSnap.featureIds,
  );
  push(
    "resolved_feature",
    featureStatus,
    legacySnap.featureIds,
    brainSnap.featureIds,
    featureStatus === "MATCH"
      ? null
      : `onlyLegacy=${featureOverlap.onlyA.join(",")};onlyBrain=${featureOverlap.onlyB.join(",")}`,
  );

  const toolStatus = idSetStatus(legacySnap.toolIds, brainSnap.toolIds);
  push(
    "resolved_tool",
    toolStatus,
    legacySnap.toolIds,
    brainSnap.toolIds,
    null,
  );

  // Routes: legacy may use path or routeId; brain snapshot unions both.
  const routeStatus = (() => {
    if (legacySnap.routeIds.length === 0 && brainSnap.routeIds.length === 0) {
      return "MATCH" as const;
    }
    if (legacySnap.routeIds.length === 0) return "UNKNOWN" as const;
    const brainSet = new Set(brainSnap.routeIds);
    const hits = legacySnap.routeIds.filter((r) => brainSet.has(r));
    if (hits.length === legacySnap.routeIds.length) return "MATCH" as const;
    if (hits.length > 0) return "PARTIAL_MATCH" as const;
    return "MISMATCH" as const;
  })();
  push(
    "resolved_route",
    routeStatus,
    legacySnap.routeIds,
    brainSnap.routeIds,
    null,
  );

  const availStatus = idSetStatus(
    legacySnap.unavailableFeatureIds,
    brainSnap.unavailableFeatureIds,
  );
  push(
    "availability",
    availStatus,
    legacySnap.unavailableFeatureIds,
    brainSnap.unavailableFeatureIds,
    null,
  );

  const capStatus = idSetStatus(
    legacySnap.capabilityBlockedFeatureIds,
    brainSnap.capabilityBlockedFeatureIds,
  );
  push(
    "capability",
    capStatus,
    legacySnap.capabilityBlockedFeatureIds,
    brainSnap.capabilityBlockedFeatureIds,
    null,
  );

  const premiumStatus = idSetStatus(
    legacySnap.premiumLockedFeatureIds,
    brainSnap.premiumLockedFeatureIds,
  );
  push(
    "premium_restriction",
    premiumStatus,
    legacySnap.premiumLockedFeatureIds,
    brainSnap.premiumLockedFeatureIds,
    null,
  );

  const suppressedStatus = idSetStatus(
    legacySnap.suppressedExperienceIds,
    brainSnap.suppressedExperienceIds,
  );
  push(
    "suppressed_experiences",
    suppressedStatus,
    legacySnap.suppressedExperienceIds,
    brainSnap.suppressedExperienceIds,
    null,
  );

  // Missing references: Brain soft failures.
  // Only diverge when Legacy claimed an id that Brain could not resolve.
  const legacyClaimed = new Set<string>([
    ...legacySnap.featureIds,
    ...legacySnap.toolIds,
    ...legacySnap.routeIds,
  ]);
  const conflictingMissing = brainSnap.missingReferences.filter((m) =>
    legacyClaimed.has(m.id),
  );
  const missingStatus: BrainValidationStatus =
    conflictingMissing.length > 0
      ? "PARTIAL_MATCH"
      : "MATCH";
  push(
    "missing_references",
    missingStatus,
    conflictingMissing.map((m) => `${m.kind}:${m.id}:${m.reason}`),
    brainSnap.missingReferences.map((m) => `${m.kind}:${m.id}:${m.reason}`),
    brainSnap.missingReferences.length === 0
      ? null
      : conflictingMissing.length > 0
        ? `${conflictingMissing.length} missing ref(s) claimed by Legacy`
        : `${brainSnap.missingReferences.length} soft missing ref(s) (not claimed by Legacy)`,
  );

  return freezeDeep({
    status: aggregateStatus(entries),
    entries: Object.freeze(entries),
  });
}
