import type { MissingReference, ResolvedDecision } from "./types";

/** Process-local last snapshot — not persistence. Never for production shells. */
let lastSnapshot: ResolvedDecision | null = null;

export function rememberResolvedDecisionSnapshot(
  resolved: ResolvedDecision,
): ResolvedDecision {
  lastSnapshot = resolved;
  return resolved;
}

export function getResolvedDecisionSnapshot(): ResolvedDecision | null {
  return lastSnapshot;
}

export function clearResolvedDecisionSnapshotForTests(): void {
  lastSnapshot = null;
}

export function getMissingReferences(
  resolved: ResolvedDecision,
): ReadonlyArray<MissingReference> {
  return resolved.missingReferences;
}
