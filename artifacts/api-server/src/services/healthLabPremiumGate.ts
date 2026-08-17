/**
 * Health Lab progression/mutation authority — same isPremiumNow used by
 * canAccessHealthLab. Not a second entitlement system.
 */
import {
  getOrCreateSubscription,
  healStaleSubscriptionRecord,
  isPremiumNow,
} from "./subscriptionService.js";

export class HealthLabPremiumRequiredError extends Error {
  readonly status = 402;
  readonly code = "premium_required";
  constructor() {
    super("Health Lab practice continues with Premium.");
    this.name = "HealthLabPremiumRequiredError";
  }
}

export async function assertHealthLabPremium(userId: string): Promise<void> {
  let sub = await getOrCreateSubscription(userId);
  sub = await healStaleSubscriptionRecord(sub);
  if (!isPremiumNow(sub)) {
    throw new HealthLabPremiumRequiredError();
  }
}

/** Endpoint class for the Phase 4 protection matrix (tests + review). */
export const HEALTH_LAB_ENDPOINT_CLASS = {
  "GET /health-lab/profile/:childId": "progression_read",
  "GET /health-lab/dashboard/:childId": "progression_read",
  "GET /health-lab/history/:childId": "progression_read",
  "GET /admin/health-lab/metrics": "admin",
  "POST /health-lab/sync": "mutation",
  "POST /health-lab/session": "mutation",
  "POST /health-lab/quest": "mutation",
  "POST /health-lab/badge": "mutation",
  "POST /health-lab/streak": "mutation",
  "POST /health-lab/shop": "mutation",
} as const;

export type HealthLabEndpointClass =
  (typeof HEALTH_LAB_ENDPOINT_CLASS)[keyof typeof HEALTH_LAB_ENDPOINT_CLASS];
