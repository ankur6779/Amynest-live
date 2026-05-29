/**
 * Subscription funnel feature flags — env-driven for staged rollout.
 */

function envFlag(key: string, defaultValue = true): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

/** Second+ paywall visit defaults to annual (six_month on first). */
export const FF_ANNUAL_DEFAULT_REPEAT =
  envFlag("VITE_FF_SUB_ANNUAL_DEFAULT_REPEAT", true);

/** Reorder plan cards annual → six_month → monthly. */
export const FF_ANNUAL_FIRST_PLAN_ORDER =
  envFlag("VITE_FF_SUB_ANNUAL_FIRST_PLAN_ORDER", true);

/** High-intent locks open paywall modal instead of /pricing. */
export const FF_PAYWALL_MODAL_FOR_LOCKS =
  envFlag("VITE_FF_SUB_PAYWALL_MODAL_LOCKS", true);

/** Post-onboarding /subscription-trial screen. */
export const FF_POST_ONBOARDING_TRIAL =
  envFlag("VITE_FF_SUB_POST_ONBOARDING_TRIAL", true);

/** Trial countdown banner + header chip. */
export const FF_TRIAL_STATUS_UI = envFlag("VITE_FF_SUB_TRIAL_STATUS_UI", true);

/** Win-back modal on app open for lapsed subscribers. */
export const FF_WINBACK_MODAL = envFlag("VITE_FF_SUB_WINBACK_MODAL", true);

/** Post-purchase annual upsell for monthly / 6mo. */
export const FF_POST_PURCHASE_ANNUAL_UPSELL =
  envFlag("VITE_FF_SUB_POST_PURCHASE_UPSELL", true);

/** Cancellation step-1 annual save offer. */
export const FF_CANCEL_ANNUAL_SAVE =
  envFlag("VITE_FF_SUB_CANCEL_ANNUAL_SAVE", true);

/** Sticky pricing page CTA bar. */
export const FF_PRICING_STICKY_CTA =
  envFlag("VITE_FF_SUB_PRICING_STICKY_CTA", true);

/** Show $/mo equivalent on annual card. */
export const FF_ANNUAL_PRICE_EQUIV =
  envFlag("VITE_FF_SUB_ANNUAL_PRICE_EQUIV", true);

/**
 * When true, Android wrapper shows RevenueCat dashboard paywall before the custom
 * React paywall. Default false — custom paywall first (Play policy + branding).
 */
export const FF_NATIVE_RC_PAYWALL_FIRST = envFlag(
  "VITE_FF_SUB_NATIVE_RC_PAYWALL",
  false,
);
