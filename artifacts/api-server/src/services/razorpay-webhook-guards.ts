/**
 * Guards for Razorpay subscription lifecycle webhooks.
 *
 * Terminal events (cancelled / completed / expired / paused / halted) must never
 * mutate a row that is not the Razorpay subscription they describe. Without this
 * check, an abandoned or failed checkout for subscription B can wipe an active
 * RevenueCat or Razorpay subscription A that shares the same userId in notes.
 */

export type RazorpayTerminalGuardRow = {
  provider: string | null | undefined;
  providerSubscriptionId: string | null | undefined;
};

export type RazorpayTerminalGuardResult =
  | { apply: true }
  | { apply: false; reason: string };

export function shouldApplyRazorpayTerminalEvent(
  existing: RazorpayTerminalGuardRow | null | undefined,
  eventSubscriptionId: string | null | undefined,
): RazorpayTerminalGuardResult {
  if (!existing) {
    return { apply: false, reason: "no_subscription_row" };
  }

  // Store-managed premium must only change via RevenueCat webhooks / sync.
  if (existing.provider === "revenuecat") {
    return { apply: false, reason: "provider_is_revenuecat" };
  }

  // Lifetime / ops grants are not Razorpay-backed.
  if (existing.provider === "manual") {
    return { apply: false, reason: "provider_is_manual" };
  }

  // Abandoned checkout: create-subscription stamps notes.userId but never binds
  // providerSubscriptionId until /verify. Do not rewrite free/trial rows into
  // past_due / EXPIRED from that orphaned Razorpay subscription.
  if (existing.provider === "none" || !existing.provider) {
    return { apply: false, reason: "no_linked_razorpay_subscription" };
  }

  if (existing.provider !== "razorpay") {
    return { apply: false, reason: "provider_not_razorpay" };
  }

  if (!existing.providerSubscriptionId) {
    return { apply: false, reason: "missing_local_subscription_id" };
  }

  if (
    eventSubscriptionId &&
    existing.providerSubscriptionId !== eventSubscriptionId
  ) {
    return { apply: false, reason: "subscription_id_mismatch" };
  }

  return { apply: true };
}
