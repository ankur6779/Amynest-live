import { API_BASE_URL } from "@/constants/api";

let authTokenGetter: (() => Promise<string | null>) | null = null;
export function setSubscriptionAuthGetter(fn: () => Promise<string | null>): void {
  authTokenGetter = fn;
}
async function authHeader(): Promise<Record<string, string>> {
  if (!authTokenGetter) return {};
  try {
    const t = await authTokenGetter();
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

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

export async function fetchSubscription(): Promise<SubscriptionResponse> {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE_URL}/api/subscription`, { headers });
  if (!res.ok) throw new Error(`fetchSubscription ${res.status}`);
  return (await res.json()) as SubscriptionResponse;
}

export async function startTrial(): Promise<{ entitlements: Entitlements }> {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) };
  const res = await fetch(`${API_BASE_URL}/api/subscription/start-trial`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error(`startTrial ${res.status}`);
  return await res.json();
}

export async function checkout(
  planId: Exclude<Plan, "free">,
): Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }> {
  // Drive the in-app purchase via RevenueCat. The RC webhook will sync
  // server-side entitlement state once the purchase completes.
  const { purchasePlan } = await import("@/lib/revenuecat");
  const result = await purchasePlan(planId);
  if (result.ok) return { ok: true };
  return { ok: false, reason: result.reason, userCancelled: result.userCancelled };
}

// ── Razorpay (Android — alternative billing under Google Play UCB) ───────────
// Google Play User Choice Billing lets supported markets offer an alternative
// billing system alongside Play Billing. Google Play Billing (RevenueCat) is
// the primary option; Razorpay is the alternative. iOS never reaches this path.

export async function createRazorpaySubscription(
  plan: Exclude<Plan, "free">,
): Promise<{ subscriptionId: string; keyId: string }> {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) };
  const res = await fetch(`${API_BASE_URL}/api/subscription/razorpay/create-subscription`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `create-subscription ${res.status}`);
  }
  return await res.json();
}

export async function verifyRazorpaySubscription(args: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
  plan: Exclude<Plan, "free">;
}): Promise<{ ok: boolean }> {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) };
  const res = await fetch(`${API_BASE_URL}/api/subscription/razorpay/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    return { ok: false };
  }
  return { ok: true };
}

/**
 * End-to-end Razorpay checkout for the mobile app (Android only).
 * Mirrors the shape of the RevenueCat `checkout()` helper above.
 */
export async function checkoutRazorpay(
  planId: Exclude<Plan, "free">,
  prefill?: { name?: string; email?: string; contact?: string },
): Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }> {
  const { openCheckout, razorpayAvailable } = await import("@/lib/razorpay");
  if (!razorpayAvailable()) {
    return {
      ok: false,
      reason:
        "UPI / card payment isn't available in this build. Try the Google Play option.",
    };
  }
  let created: { subscriptionId: string; keyId: string };
  try {
    created = await createRazorpaySubscription(planId);
  } catch (err: any) {
    return { ok: false, reason: err?.message ?? "Could not start checkout." };
  }
  const result = await openCheckout({
    keyId: created.keyId,
    subscriptionId: created.subscriptionId,
    prefill,
    notes: { plan: planId },
  });
  if (!result.ok) {
    return { ok: false, reason: result.reason, userCancelled: result.userCancelled };
  }
  const verified = await verifyRazorpaySubscription({
    ...result.response,
    plan: planId,
  });
  if (!verified.ok) {
    return { ok: false, reason: "Payment verification failed." };
  }
  return { ok: true };
}
