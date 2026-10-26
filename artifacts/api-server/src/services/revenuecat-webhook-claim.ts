/**
 * RevenueCat webhook idempotency claim decisions.
 *
 * Unlike Razorpay (claim+mutate in one transaction), RC webhooks persist the
 * event row before applying subscription mutations. A naive
 * `onConflictDoNothing → duplicate:true` ACK permanently drops events that
 * failed or crashed mid-processing — RevenueCat retries, we ACK, premium never
 * applies.
 */

/** Pending rows older than this may be reclaimed after a crash/OOM. */
export const REVENUECAT_WEBHOOK_STALE_PENDING_MS = 5 * 60 * 1000;

export type RevenueCatWebhookClaimAction =
  | "process"
  | "duplicate"
  | "reclaim"
  | "in_progress";

export type RevenueCatWebhookClaimDecision = {
  action: RevenueCatWebhookClaimAction;
  reason: string;
};

/**
 * Decide how to handle a RevenueCat webhook delivery given insert/claim state.
 *
 * - New insert → process
 * - Already processed/ignored → duplicate (safe ACK)
 * - failed → reclaim and reprocess
 * - pending but stale → reclaim (crash left the row claimed)
 * - pending and fresh → in_progress (return 5xx; do NOT ACK)
 */
export function decideRevenueCatWebhookClaim(input: {
  inserted: boolean;
  processingStatus?: string | null;
  receivedAt?: Date | null;
  now?: Date;
  stalePendingMs?: number;
}): RevenueCatWebhookClaimDecision {
  if (input.inserted) {
    return { action: "process", reason: "new_event" };
  }

  const status = input.processingStatus ?? null;
  if (status === "processed" || status === "ignored") {
    return { action: "duplicate", reason: `already_${status}` };
  }

  if (status === "failed") {
    return { action: "reclaim", reason: "prior_failure" };
  }

  if (status === "pending") {
    const nowMs = (input.now ?? new Date()).getTime();
    const receivedMs = input.receivedAt?.getTime();
    const staleMs = input.stalePendingMs ?? REVENUECAT_WEBHOOK_STALE_PENDING_MS;
    if (
      typeof receivedMs === "number" &&
      Number.isFinite(receivedMs) &&
      nowMs - receivedMs >= staleMs
    ) {
      return { action: "reclaim", reason: "stale_pending" };
    }
    return { action: "in_progress", reason: "pending_inflight" };
  }

  // Missing / unknown status — refuse to ACK so the provider retries.
  return { action: "in_progress", reason: status ? `unknown_${status}` : "missing_row" };
}
