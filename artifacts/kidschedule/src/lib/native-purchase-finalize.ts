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

/** POST /rc-sync for restore-only recovery and return the parsed result. */
async function postRestoreSync(authFetch: AuthFetch): Promise<RcSyncResult | null> {
  try {
    const res = await authFetch(getApiUrl("/api/subscription/rc-sync"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "restore" }),
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
 * After a native store purchase, poll `/api/subscription` until RevenueCat
 * has granted a *paid* subscriber entitlement — not an internal trial
 * (`isPremium` alone is true during server-granted trials).
 */
export async function finalizeNativePurchase(
  authFetch: AuthFetch,
  qc: QueryClient,
): Promise<{ ok: boolean; isPremium: boolean; isPremiumSubscriber: boolean }> {
  await refreshSubscriptionViews(qc);

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
  const restored = await postRestoreSync(authFetch);
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
