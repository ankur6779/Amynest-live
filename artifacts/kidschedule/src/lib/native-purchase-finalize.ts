import type { QueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import type { SubscriptionResponse } from "@/hooks/use-subscription";

const SUBSCRIPTION_KEY = ["subscription"] as const;
const POLL_DELAYS_MS = [500, 1200, 2000, 3500, 5000, 7000];

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * After a native store purchase, ask the server to pull RevenueCat state and
 * poll `/api/subscription` until premium is reflected (or we time out).
 */
export async function finalizeNativePurchase(
  authFetch: AuthFetch,
  qc: QueryClient,
): Promise<{ ok: boolean; isPremium: boolean }> {
  try {
    await authFetch(getApiUrl("/api/subscription/rc-sync"), { method: "POST" });
  } catch {
    /* webhook may still land — keep polling */
  }

  await qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
  await qc.invalidateQueries({ queryKey: ["feature-usage"] });
  window.dispatchEvent(new Event("amynest:refresh-subscription"));

  for (const delay of POLL_DELAYS_MS) {
    await new Promise((r) => setTimeout(r, delay));
    await qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    const data = qc.getQueryData<SubscriptionResponse>(SUBSCRIPTION_KEY);
    if (data?.entitlements.isPremium) {
      await qc.invalidateQueries({ queryKey: ["feature-usage"] });
      window.dispatchEvent(new Event("amynest:refresh-subscription"));
      return { ok: true, isPremium: true };
    }
  }

  const data = qc.getQueryData<SubscriptionResponse>(SUBSCRIPTION_KEY);
  const isPremium = !!data?.entitlements?.isPremium;
  return { ok: isPremium, isPremium };
}
