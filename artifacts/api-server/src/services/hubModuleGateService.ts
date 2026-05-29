import {
  getUserFeatureStatus,
  isTrackedFeature,
  type ParentHubFeatureId,
} from "./featureUsageService.js";
import { getOrCreateSubscription, isPremiumNow } from "./subscriptionService.js";
import {
  getHubJourneyStatus,
  isHubJourneyFeatureLocked,
} from "./parentHubJourneyService.js";

/** Mirrors client `MAX_FREE_HUB_TILE_OPENS` in kidschedule feature-usage-limits.ts */
const MAX_FREE_HUB_TILE_OPENS = 2;

export type HubModuleGateResult =
  | { ok: true }
  | {
      ok: false;
      status: 402;
      error: "hub_feature_locked";
      feature: string;
      reason: "journey_locked" | "quota_exhausted";
      limit?: number;
      used?: number;
      message: string;
    };

function maxFreeOpens(featureId: string): number {
  return featureId.startsWith("hub_") ? MAX_FREE_HUB_TILE_OPENS : 1;
}

/**
 * Server-side mirror of kidschedule `useHubModuleGate` + Parent Hub `isHubLocked`.
 * Premium bypass → hub journey free period → bonus unlock → legacy tile quota.
 */
export async function assertHubModuleAccess(
  userId: string,
  featureId: ParentHubFeatureId,
  childId?: number | null,
): Promise<HubModuleGateResult> {
  if (!isTrackedFeature(featureId)) {
    return {
      ok: false,
      status: 402,
      error: "hub_feature_locked",
      feature: featureId,
      reason: "quota_exhausted",
      message: "Unknown hub feature.",
    };
  }

  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) return { ok: true };

  if (childId != null && childId > 0) {
    const journey = await getHubJourneyStatus(userId, childId);
    if (journey?.access) {
      if (journey.access.isFreePeriod) return { ok: true };
      if (
        !isHubJourneyFeatureLocked(
          featureId,
          journey.access,
          journey.bonusUnlocks,
        )
      ) {
        return { ok: true };
      }
      return {
        ok: false,
        status: 402,
        error: "hub_feature_locked",
        feature: featureId,
        reason: "journey_locked",
        message: "Upgrade to continue using this learning module.",
      };
    }
  }

  const statuses = await getUserFeatureStatus(userId);
  const row = statuses.find((f) => f.featureId === featureId);
  const used = row?.useCount ?? 0;
  const limit = maxFreeOpens(featureId);
  if (used >= limit) {
    return {
      ok: false,
      status: 402,
      error: "hub_feature_locked",
      feature: featureId,
      reason: "quota_exhausted",
      limit,
      used,
      message: "Free trial used. Upgrade to unlock unlimited access.",
    };
  }

  return { ok: true };
}

export function hubModuleGateFailureBody(
  gate: Extract<HubModuleGateResult, { ok: false }>,
): Record<string, unknown> {
  return {
    error: gate.error,
    feature: gate.feature,
    reason: gate.reason,
    message: gate.message,
    ...(gate.limit != null ? { limit: gate.limit, used: gate.used } : {}),
  };
}
