import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { openRazorpayCheckout, type RazorpayCheckoutResponse } from "@/lib/razorpay";

export type Plan = "free" | "monthly" | "six_month" | "yearly";
export type Status = "free" | "trialing" | "active" | "past_due" | "canceled";

export type Entitlements = {
  plan: Plan;
  status: Status;
  isPremium: boolean;
  isTrialing: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: {
    aiQueriesPerDay: number;
    childrenMax: number;
    routinesMax: number;
    hubArticlesMax: number;
    trialDays: number;
  };
  usage: {
    aiQueriesToday: number;
    aiQueriesRemaining: number | null;
    // Global Paywall: per-feature lifetime usage. Optional for backwards
    // compatibility with cached responses from older clients.
    features?: Record<
      "ai_query" | "routine_generate" | "behavior_log",
      { used: number; remaining: number | null; limit: number; locked: boolean }
    >;
  };
};

export type PlanCard = {
  id: Exclude<Plan, "free">;
  title: string;
  price: number;
  currency: string;
  period: string;
  badge: string | null;
  savingsPercent?: number;
  features: string[];
};

export type SubscriptionResponse = {
  entitlements: Entitlements;
  plans: PlanCard[];
};

const QKEY = ["subscription"] as const;

export function useSubscription() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const query = useQuery<SubscriptionResponse>({
    queryKey: QKEY,
    queryFn: async () => {
      const res = await authFetch(getApiUrl("/api/subscription"));
      if (!res.ok) throw new Error(`subscription ${res.status}`);
      return (await res.json()) as SubscriptionResponse;
    },
    staleTime: 60_000,
  });

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QKEY });
  }, [qc]);

  const startTrial = useCallback(async () => {
    const res = await authFetch(getApiUrl("/api/subscription/start-trial"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) refresh();
    return res.ok;
  }, [authFetch, refresh]);

  /**
   * Razorpay-powered web checkout. Creates a subscription server-side, opens
   * the Razorpay overlay, then verifies the signature on success and polls
   * for the canonical entitlement (which the webhook will update).
   */
  const checkoutRazorpay = useCallback(
    async (
      plan: Exclude<Plan, "free">,
      prefill?: { name?: string; email?: string; contact?: string },
    ): Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }> => {
      // 1) Ask the server to create a Razorpay subscription for this user/plan.
      const createRes = await authFetch(
        getApiUrl("/api/subscription/razorpay/create-subscription"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        },
      );
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        if (createRes.status === 503) {
          return {
            ok: false,
            reason:
              "UPI / card payments are not enabled yet. Please use the mobile app or try again soon.",
          };
        }
        return { ok: false, reason: body?.message ?? "Could not start checkout." };
      }
      const { subscriptionId, keyId } = (await createRes.json()) as {
        subscriptionId: string;
        keyId: string;
      };

      // 2) Open Razorpay Checkout. We resolve the outer promise from inside
      //    the handler / dismiss callbacks.
      const result = await new Promise<{
        ok: boolean;
        reason?: string;
        userCancelled?: boolean;
      }>((resolve) => {
        let resolved = false;
        const finish = (r: {
          ok: boolean;
          reason?: string;
          userCancelled?: boolean;
        }) => {
          if (resolved) return;
          resolved = true;
          resolve(r);
        };
        openRazorpayCheckout({
          key: keyId,
          subscription_id: subscriptionId,
          name: "AmyNest AI",
          description: "AmyNest Premium subscription",
          theme: { color: "#7B3FF2" },
          prefill,
          notes: { plan },
          handler: async (resp: RazorpayCheckoutResponse) => {
            try {
              const verifyRes = await authFetch(
                getApiUrl("/api/subscription/razorpay/verify"),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...resp, plan }),
                },
              );
              if (!verifyRes.ok) {
                finish({ ok: false, reason: "Payment verification failed." });
                return;
              }
              finish({ ok: true });
            } catch {
              finish({ ok: false, reason: "Payment verification failed." });
            }
          },
          modal: {
            ondismiss: () => finish({ ok: false, userCancelled: true }),
          },
        }).catch((err: unknown) => {
          finish({
            ok: false,
            reason: err instanceof Error ? err.message : "Checkout failed to open.",
          });
        });
      });

      if (result.ok) {
        // Optimistic refresh + a few delayed polls so the webhook has time to
        // land. The verify endpoint already activates the row, so the first
        // refresh usually shows premium immediately.
        refresh();
        for (const delay of [1500, 3500, 6000]) {
          await new Promise((r) => setTimeout(r, delay));
          await qc.invalidateQueries({ queryKey: QKEY });
          const data = qc.getQueryData<SubscriptionResponse>(QKEY);
          if (data?.entitlements.isPremium) break;
        }
      }
      return result;
    },
    [authFetch, qc, refresh],
  );

  /**
   * Legacy entry point — kept for any caller that hasn't moved to
   * `checkoutRazorpay`. Falls back to the mobile-app message.
   */
  const checkout = useCallback(
    async (_plan: Exclude<Plan, "free">): Promise<{ ok: boolean; reason?: string }> => {
      return {
        ok: false,
        reason:
          "Subscriptions are available in the AmyNest mobile app. Open AmyNest on your phone to upgrade — your premium will unlock here automatically.",
      };
    },
    [],
  );

  const cancelSubscription = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    const res = await authFetch(getApiUrl("/api/subscription/cancel"), { method: "POST" });
    if (res.ok) {
      refresh();
      return { ok: true };
    }
    const body = await res.json().catch(() => ({}));
    return { ok: false, reason: body?.message ?? body?.error ?? "Could not cancel subscription." };
  }, [authFetch, refresh]);

  return {
    data: query.data,
    entitlements: query.data?.entitlements ?? null,
    plans: query.data?.plans ?? [],
    isPremium: !!query.data?.entitlements?.isPremium,
    aiRemaining: query.data?.entitlements?.usage.aiQueriesRemaining ?? null,
    loading: query.isLoading,
    refresh,
    startTrial,
    checkout,
    checkoutRazorpay,
    cancelSubscription,
  };
}
