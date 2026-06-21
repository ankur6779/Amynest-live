import { parseApiJson } from "@/lib/safe-json-response";
import type { QueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import type { SubscriptionResponse } from "@/hooks/use-subscription";

const SUBSCRIPTION_KEY = ["subscription"] as const;
const POLL_DELAYS_MS = [500, 1200, 2000, 3000, 4000, 5000, 6000];
// Re-run the server-side RevenueCat sync at these poll positions. The first
// sync can race the store receipt (entitlement not visible to RevenueCat yet),
// and a later sync also picks up state once the webhook has landed.
const RESYNC_AT_POLL_INDEX = new Set([2, 4]);

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

/** POST /rc-sync and return the parsed result (null on transport failure). */
async function postRcSync(authFetch: AuthFetch): Promise<RcSyncResult | null> {
  try {
    const res = await authFetch(getApiUrl("/api/subscription/rc-sync"), {
      method: "POST",
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
 * After a native store purchase, ask the server to pull RevenueCat state and
 * poll `/api/subscription` until premium is reflected (or we time out).
 *
 * The first `/rc-sync` response is authoritative for the DB state right after
 * the pull, so we short-circuit on it; otherwise we keep polling and re-sync a
 * couple of times to ride out webhook / receipt-propagation lag.
 */
export async function finalizeNativePurchase(
  authFetch: AuthFetch,
  qc: QueryClient,
): Promise<{ ok: boolean; isPremium: boolean }> {
  const first = await postRcSync(authFetch);
  await refreshSubscriptionViews(qc);

  // Server already confirmed premium during the sync — no need to poll.
  if (first?.apiPremium || first?.isPremium) {
    return { ok: true, isPremium: true };
  }

  for (let i = 0; i < POLL_DELAYS_MS.length; i++) {
    await new Promise((r) => setTimeout(r, POLL_DELAYS_MS[i]));

    if (RESYNC_AT_POLL_INDEX.has(i)) {
      const retry = await postRcSync(authFetch);
      if (retry?.apiPremium || retry?.isPremium) {
        await refreshSubscriptionViews(qc);
        return { ok: true, isPremium: true };
      }
    }

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
