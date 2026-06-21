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
 * After a native store purchase, poll `/api/subscription` until the RevenueCat
 * webhook has updated the backend entitlement (or we time out).
 */
export async function finalizeNativePurchase(
  authFetch: AuthFetch,
  qc: QueryClient,
): Promise<{ ok: boolean; isPremium: boolean }> {
  await refreshSubscriptionViews(qc);

  for (let i = 0; i < POLL_DELAYS_MS.length; i++) {
    await new Promise((r) => setTimeout(r, POLL_DELAYS_MS[i]));

    await qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    const data = latestSubscriptionData(qc);
    if (data?.entitlements.isPremium) {
      await refreshSubscriptionViews(qc);
      return { ok: true, isPremium: true };
    }
  }

  const data = latestSubscriptionData(qc);
  const isPremium = !!data?.entitlements?.isPremium;
  return { ok: isPremium, isPremium };
}

/**
 * Restore Purchase is allowed to rebuild local entitlements from RevenueCat V2
 * because no new payment event is expected.
 */
export async function finalizeNativeRestore(
  authFetch: AuthFetch,
  qc: QueryClient,
): Promise<{ ok: boolean; isPremium: boolean }> {
  const restored = await postRestoreSync(authFetch);
  await refreshSubscriptionViews(qc);
  if (restored?.apiPremium || restored?.isPremium) {
    return { ok: true, isPremium: true };
  }
  const data = latestSubscriptionData(qc);
  const isPremium = !!data?.entitlements?.isPremium;
  return { ok: isPremium, isPremium };
}
