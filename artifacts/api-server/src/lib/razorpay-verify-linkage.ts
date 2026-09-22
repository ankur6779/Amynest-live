/**
 * Intent linkage on Razorpay verify must not violate
 * `subscriptions_free_provider_link_chk` (FREE ⇒ provider=none and
 * provider_subscription_id IS NULL). Never-trialed FREE rows (e.g. infant
 * parents under the age-trial floor) would 500 on an UPDATE that sets
 * provider=razorpay + providerSubscriptionId while leaving FREE, and the
 * client would abort webhook polling after a successful charge.
 *
 * Activation still lands via webhook `activateSubscription`, which writes
 * the full ACTIVE shape atomically.
 */
export function shouldPersistRazorpayVerifyProviderLinkage(
  subscriptionState: string | null | undefined,
): boolean {
  return subscriptionState !== "FREE";
}
