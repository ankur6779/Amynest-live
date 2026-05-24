import {
  isHubFeatureExempt,
  isHubJourneyFeatureLocked as isHubJourneyFeatureLockedLib,
  type HubJourneyAccess,
} from "@workspace/parent-hub-journey";

export { isHubFeatureExempt, HUB_JOURNEY_EXEMPT_FEATURES } from "@workspace/parent-hub-journey";

export function isHubJourneyFeatureLocked(
  featureId: string,
  access: HubJourneyAccess,
  bonusUnlocks: string[],
): boolean {
  return isHubJourneyFeatureLockedLib(featureId, access, bonusUnlocks);
}
