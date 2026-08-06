import { freezeDeep } from "./freeze";
import {
  AMY_DECISION_BRIDGE_VERSION,
  type DecisionBridgeHealth,
  type ResolvedDecision,
} from "./types";

/**
 * Bridge health from a ResolvedDecision — developer only.
 */
export function getBridgeHealth(
  resolved: ResolvedDecision,
): DecisionBridgeHealth {
  let missingFeatureCount = 0;
  let missingToolCount = 0;
  let missingRouteCount = 0;
  for (const m of resolved.missingReferences) {
    if (m.kind === "feature") missingFeatureCount += 1;
    else if (m.kind === "tool") missingToolCount += 1;
    else if (m.kind === "route") missingRouteCount += 1;
  }

  return freezeDeep({
    resolvedFeatureCount: resolved.resolvedFeatures.length,
    resolvedToolCount: resolved.resolvedTools.length,
    resolvedRouteCount: resolved.resolvedRoutes.length,
    missingFeatureCount,
    missingToolCount,
    missingRouteCount,
    bridgeVersion: AMY_DECISION_BRIDGE_VERSION,
  });
}
