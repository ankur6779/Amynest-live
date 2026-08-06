/**
 * RevenueCat wiring for Premium V2 — thin adapters over existing modules.
 * Does not invent a second entitlement system.
 */

import { RC_ENTITLEMENT_ID, presentNativeRCPaywall } from "@/lib/native-rc-paywall";
import type { PremiumBillingPorts, PremiumPurchasePlan } from "./types";

export { RC_ENTITLEMENT_ID };

export type NativeBillingLike = {
  wrapperPresent: boolean;
  available: boolean;
  unavailableReason: string | null;
  purchasing: boolean;
  purchase: (
    plan: PremiumPurchasePlan,
  ) => Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }>;
  restore: () => Promise<boolean>;
};

export type WebCheckoutLike = {
  checkoutRazorpay: (
    plan: PremiumPurchasePlan,
  ) => Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }>;
};

/**
 * Build billing ports: native RC purchase/restore when shell present,
 * otherwise web Razorpay checkout. Optional native RC paywall UI first.
 */
export function createPremiumBillingPorts(args: {
  native: NativeBillingLike;
  web: WebCheckoutLike;
  userId?: string | null;
}): PremiumBillingPorts {
  const { native, web, userId } = args;

  return {
    async presentNativePaywall() {
      return presentNativeRCPaywall({
        userId: userId ?? undefined,
        entitlementId: RC_ENTITLEMENT_ID,
        ifNeeded: false,
      });
    },

    async purchase(plan) {
      if (native.wrapperPresent) {
        if (!native.available) {
          return {
            ok: false,
            reason:
              native.unavailableReason ??
              "Store billing is not ready yet. Please try again.",
          };
        }
        return native.purchase(plan);
      }
      return web.checkoutRazorpay(plan);
    },

    async restore() {
      if (!native.wrapperPresent) {
        return {
          ok: false,
          reason:
            "Restore purchases is available in the AmyNest iOS or Android app.",
        };
      }
      if (!native.available) {
        return {
          ok: false,
          reason:
            native.unavailableReason ??
            "Store billing is not ready yet. Please try again.",
        };
      }
      const ok = await native.restore();
      return {
        ok,
        reason: ok ? undefined : "No active purchases found for this account.",
      };
    },
  };
}
