/**
 * RevenueCat dashboard paywall (optional). Default: custom React paywall first on
 * iOS and Android; checkout uses nativeBilling.purchase() → App Store / Play.
 *
 * Set VITE_FF_SUB_NATIVE_RC_PAYWALL=true to restore RC-native UI before custom.
 */

import { isCapacitorIOS } from "@/lib/native-push-bridge";
import { getNativeBilling, isWrapperPresent, probeBillingAvailability } from "@/lib/native-billing";
import { FF_NATIVE_RC_PAYWALL_FIRST } from "@/lib/subscription-feature-flags";

export const RC_ENTITLEMENT_ID = "premium";

export type NativeRCPaywallOutcome = {
  /** True when a native paywall was shown (or skipped because user already premium). */
  handled: boolean;
  purchased: boolean;
  restored: boolean;
  cancelled: boolean;
  error?: boolean;
  reason?: string;
};

type PaywallResultPayload = { result?: string; error?: string };

function mapPaywallResult(payload: PaywallResultPayload | null | undefined): NativeRCPaywallOutcome {
  const result = payload?.result ?? "";
  return {
    handled: true,
    purchased: result === "PURCHASED",
    restored: result === "RESTORED",
    cancelled: result === "CANCELLED" || result === "NOT_PRESENTED",
    error: result === "ERROR",
    reason: payload?.error,
  };
}

/** True only when FF_NATIVE_RC_PAYWALL_FIRST is enabled and billing is ready. */
export async function canPresentNativeRCPaywall(): Promise<boolean> {
  if (!FF_NATIVE_RC_PAYWALL_FIRST) return false;
  // iOS: always custom paywall (App Review 3.1.2 — price, terms, privacy links).
  if (isCapacitorIOS()) return false;
  if (isWrapperPresent()) {
    const billing = await probeBillingAvailability();
    return billing === true;
  }
  return false;
}

/**
 * Show the RevenueCat dashboard paywall. Returns handled=false when custom
 * paywall should be used instead.
 */
export async function presentNativeRCPaywall(options?: {
  userId?: string;
  ifNeeded?: boolean;
  entitlementId?: string;
}): Promise<NativeRCPaywallOutcome> {
  if (!(await canPresentNativeRCPaywall())) {
    return { handled: false, purchased: false, restored: false, cancelled: false };
  }

  const entitlementId = options?.entitlementId ?? RC_ENTITLEMENT_ID;
  const ifNeeded = options?.ifNeeded ?? false;

  const ready = await probeBillingAvailability();
  if (ready !== true) {
    return { handled: false, purchased: false, restored: false, cancelled: false };
  }
  const billing = getNativeBilling();
  if (!billing?.presentPaywall) {
    return { handled: false, purchased: false, restored: false, cancelled: false };
  }
  if (options?.userId) {
    const login = await billing.setUserId(options.userId);
    if (login && typeof login === "object" && "ok" in login && login.ok === false) {
      return {
        handled: false,
        purchased: false,
        restored: false,
        cancelled: false,
        error: true,
        reason: "Could not link your account to Google Play billing.",
      };
    }
  }
  const res = await billing.presentPaywall({ ifNeeded, entitlementId });
  if (!res.ok) {
    return {
      handled: false,
      purchased: false,
      restored: false,
      cancelled: false,
      error: true,
      reason: res.error,
    };
  }
  return mapPaywallResult(res.data);
}
