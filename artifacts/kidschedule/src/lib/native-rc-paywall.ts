/**
 * Presents the RevenueCat dashboard-designed paywall on native shells:
 *   iOS Capacitor  → RevenueCatUI Capacitor plugin
 *   Android wrapper → BillingBridge.presentPaywall (PaywallActivityLauncher)
 *
 * Web / PWA callers get handled=false and should show the custom paywall modal.
 */

import { isCapacitorIOS } from "@/lib/native-push-bridge";
import { getNativeBilling, isWrapperPresent, probeBillingAvailability } from "@/lib/native-billing";
import { initIOSBilling } from "@/lib/native-billing-ios";

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

type RevenueCatUIPlugin = {
  presentPaywall: (options?: {
    presentationConfiguration?: { ios?: string; android?: string };
  }) => Promise<PaywallResultPayload>;
  presentPaywallIfNeeded: (options: {
    requiredEntitlementIdentifier: string;
    presentationConfiguration?: { ios?: string; android?: string };
  }) => Promise<PaywallResultPayload>;
};

function getCapacitorRevenueCatUI(): RevenueCatUIPlugin | null {
  if (typeof window === "undefined") return null;
  return (window.Capacitor?.Plugins?.RevenueCatUI as RevenueCatUIPlugin | undefined) ?? null;
}

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

/** True when the current shell can show RevenueCat's native paywall UI. */
export async function canPresentNativeRCPaywall(): Promise<boolean> {
  if (isCapacitorIOS()) return getCapacitorRevenueCatUI() != null;
  if (isWrapperPresent()) {
    const billing = await probeBillingAvailability();
    return billing === true;
  }
  return false;
}

/**
 * Show the RevenueCat dashboard paywall. Returns handled=false on web so callers
 * can fall back to the custom React paywall modal.
 */
export async function presentNativeRCPaywall(options?: {
  userId?: string;
  ifNeeded?: boolean;
  entitlementId?: string;
}): Promise<NativeRCPaywallOutcome> {
  const entitlementId = options?.entitlementId ?? RC_ENTITLEMENT_ID;
  const ifNeeded = options?.ifNeeded ?? false;
  const fullscreen = {
    presentationConfiguration: { ios: "FULL_SCREEN", android: "FULL_SCREEN" },
  };

  // ── iOS Capacitor ───────────────────────────────────────────────────────
  if (isCapacitorIOS()) {
    const ui = getCapacitorRevenueCatUI();
    if (!ui) {
      return { handled: false, purchased: false, restored: false, cancelled: false };
    }
    if (options?.userId) {
      const init = await initIOSBilling(options.userId);
      if (!init.ok) {
        return {
          handled: false,
          purchased: false,
          restored: false,
          cancelled: false,
          error: true,
          reason: init.reason,
        };
      }
    }
    try {
      const payload = ifNeeded
        ? await ui.presentPaywallIfNeeded({
            requiredEntitlementIdentifier: entitlementId,
            ...fullscreen,
          })
        : await ui.presentPaywall(fullscreen);
      return mapPaywallResult(payload);
    } catch (err) {
      return {
        handled: true,
        purchased: false,
        restored: false,
        cancelled: false,
        error: true,
        reason: err instanceof Error ? err.message : "RevenueCat paywall failed",
      };
    }
  }

  // ── Android WebView wrapper ─────────────────────────────────────────────
  if (isWrapperPresent()) {
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

  return { handled: false, purchased: false, restored: false, cancelled: false };
}
