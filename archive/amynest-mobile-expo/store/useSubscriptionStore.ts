import { create } from "zustand";
import {
  fetchSubscription,
  startTrial,
  checkout,
  checkoutRazorpay,
  type Entitlements,
  type PlanCard,
  type Plan,
} from "@/services/subscriptionApi";
import { humanizeError } from "@/utils/humanizeError";

type State = {
  entitlements: Entitlements | null;
  plans: PlanCard[];
  loading: boolean;
  error: string | null;
};

type Actions = {
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  beginTrial: () => Promise<void>;
  upgrade: (planId: Exclude<Plan, "free">) => Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }>;
  upgradeRazorpay: (
    planId: Exclude<Plan, "free">,
    prefill?: { name?: string; email?: string; contact?: string },
  ) => Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }>;
  setEntitlements: (e: Entitlements) => void;
  reset: () => void;
};

const initial: State = {
  entitlements: null,
  plans: [],
  loading: false,
  error: null,
};

export const useSubscriptionStore = create<State & Actions>((set, get) => ({
  ...initial,
  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await fetchSubscription();
      set({ entitlements: data.entitlements, plans: data.plans, loading: false });
    } catch (err) {
      console.error("[subscription] load failed", err);
      set({ loading: false, error: humanizeError(err, "Couldn't load your subscription details.") });
    }
  },
  refresh: async () => {
    try {
      const data = await fetchSubscription();
      set({ entitlements: data.entitlements, plans: data.plans });
    } catch {
      // best-effort
    }
  },
  beginTrial: async () => {
    try {
      const { entitlements } = await startTrial();
      set({ entitlements });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "trial failed" });
    }
  },
  upgrade: async (planId) => {
    const res = await checkout(planId);
    if (res.ok) applyOptimisticPremium(planId, set, get);
    return res;
  },
  upgradeRazorpay: async (planId, prefill) => {
    const res = await checkoutRazorpay(planId, prefill);
    if (res.ok) applyOptimisticPremium(planId, set, get);
    return res;
  },
  setEntitlements: (e) => set({ entitlements: e }),
  reset: () => set({ ...initial }),
}));

function applyOptimisticPremium(
  planId: Exclude<Plan, "free">,
  set: (partial: Partial<State>) => void,
  get: () => State,
): void {
  // Optimistically reflect premium; the RC / Razorpay webhook will sync the
  // canonical entitlement on the server. Poll a few times in case the
  // webhook is slightly delayed.
  const current = get().entitlements;
  if (current) {
    set({
      entitlements: {
        ...current,
        plan: planId,
        status: "active",
        isPremium: true,
        usage: { ...current.usage, aiQueriesRemaining: null },
      },
    });
  }
  void (async () => {
    for (const delay of [1500, 3000, 5000]) {
      await new Promise((r) => setTimeout(r, delay));
      try {
        const data = await fetchSubscription();
        set({ entitlements: data.entitlements, plans: data.plans });
        if (data.entitlements.isPremium) return;
      } catch {
        // best-effort
      }
    }
  })();
}

export const selectIsPremium = (s: State): boolean => !!s.entitlements?.isPremium;
export const selectAiRemaining = (s: State): number | null =>
  s.entitlements?.usage.aiQueriesRemaining ?? null;
