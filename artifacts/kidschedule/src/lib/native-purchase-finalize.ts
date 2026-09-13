import { parseApiJson } from "@/lib/safe-json-response";
import type { QueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import type { SubscriptionResponse } from "@/hooks/use-subscription";

const SUBSCRIPTION_KEY = ["subscription"] as const;
const POLL_DELAYS_MS = [500, 1200, 2000, 3000, 4000, 5000, 6000];

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

type RcSyncResult = {
  ok: boolean;
  isPremium: boolean;
  verifiedCustomer?: boolean;
  activeEntitlement?: boolean;
  dbUpdated?: boolean;
  apiPremium?: boolean;
  reason?: string;
};

type RcSyncPurpose = "restore" | "purchase_finalize";

/** POST /rc-sync and return the parsed result. Never treats HTTP failure as premium. */
async function postRevenueCatSync(
  authFetch: AuthFetch,
  purpose: RcSyncPurpose,
): Promise<RcSyncResult | null> {
  try {
    const res = await authFetch(getApiUrl("/api/subscription/rc-sync"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose }),
    });
    if (!res.ok) return null;
    return (await parseApiJson<RcSyncResult>(res));
  } catch {
    return null;
  }
}

function refreshSubscriptionViews(qc: QueryClient): Promise<void> {
  window.dispatchEvent(new Event("amynest:refresh-subscription"));
  return Promise.all([
    qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEY }),
    qc.invalidateQueries({ queryKey: ["feature-usage"] }),
  ]).then(() => undefined);
}

function latestSubscriptionData(qc: QueryClient): SubscriptionResponse | undefined {
  const matches = qc.getQueriesData<SubscriptionResponse>({ queryKey: SUBSCRIPTION_KEY });
  for (let i = matches.length - 1; i >= 0; i--) {
    const data = matches[i]?.[1];
    if (data?.entitlements) return data;
  }
  return undefined;
}

/**
 * After a native store purchase, pull RevenueCat into AmyNest (same writer as
 * the webhook), then poll `/api/subscription` until a *paid* subscriber
 * entitlement is visible — not an internal trial.
 *
 * GET /api/subscription does not pull RevenueCat for first-time buyers, so
 * waiting on the webhook alone can leave a just-paid user FREE.
 */
export async function finalizeNativePurchase(
  authFetch: AuthFetch,
  qc: QueryClient,
): Promise<{ ok: boolean; isPremium: boolean; isPremiumSubscriber: boolean }> {
  await postRevenueCatSync(authFetch, "purchase_finalize");
  await refreshSubscriptionViews(qc);

  const immediate = latestSubscriptionData(qc);
  if (immediate?.entitlements.isPremiumSubscriber) {
    return { ok: true, isPremium: true, isPremiumSubscriber: true };
  }

  for (let i = 0; i < POLL_DELAYS_MS.length; i++) {
    await new Promise((r) => setTimeout(r, POLL_DELAYS_MS[i]));

    await qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    const data = latestSubscriptionData(qc);
    if (data?.entitlements.isPremiumSubscriber) {
      await refreshSubscriptionViews(qc);
      return { ok: true, isPremium: true, isPremiumSubscriber: true };
    }
  }

  const data = latestSubscriptionData(qc);
  const isPremiumSubscriber = !!data?.entitlements?.isPremiumSubscriber;
  return {
    ok: isPremiumSubscriber,
    isPremium: isPremiumSubscriber,
    isPremiumSubscriber,
  };
}

/**
 * Restore Purchase is allowed to rebuild local entitlements from RevenueCat V2
 * because no new payment event is expected.
 * Paid unlock requires `isPremiumSubscriber` (internal trial must not count).
 */
export async function finalizeNativeRestore(
  authFetch: AuthFetch,
  qc: QueryClient,
): Promise<{ ok: boolean; isPremium: boolean; isPremiumSubscriber: boolean }> {
  const restored = await postRevenueCatSync(authFetch, "restore");
  await refreshSubscriptionViews(qc);
  if (restored?.apiPremium || restored?.isPremium) {
    await qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    const after = latestSubscriptionData(qc);
    const isPremiumSubscriber = !!after?.entitlements?.isPremiumSubscriber;
    if (isPremiumSubscriber) {
      return { ok: true, isPremium: true, isPremiumSubscriber: true };
    }
  }
  const data = latestSubscriptionData(qc);
  const isPremiumSubscriber = !!data?.entitlements?.isPremiumSubscriber;
  return {
    ok: isPremiumSubscriber,
    isPremium: isPremiumSubscriber,
    isPremiumSubscriber,
  };
}
