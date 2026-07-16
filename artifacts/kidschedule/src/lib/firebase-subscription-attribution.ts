/**
 * Firebase Analytics subscription events for Google Ads conversion tracking.
 * Fires app_store_subscription_convert + purchase on successful checkout.
 */

import { getApps } from "firebase/app";
import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
import type { Plan } from "@/hooks/use-subscription";
import { initializeFirebase } from "@/lib/firebase";
import { resolveMetaPlanPrice } from "@/lib/meta-attribution";

export const FIREBASE_SUBSCRIPTION_CONVERT_EVENT = "app_store_subscription_convert";
export const FIREBASE_BEGIN_CHECKOUT_EVENT = "begin_checkout";

type AnalyticsEventParams = Record<string, string | number>;

function logAnalyticsEvent(
  analytics: Analytics,
  name: string,
  params: AnalyticsEventParams,
): void {
  logEvent(analytics, name as Parameters<typeof logEvent>[1], params);
}

type FirebaseSubscriptionOpts = {
  source?: string;
  value?: number;
  currency?: string;
};

let analyticsInstance: Analytics | null | undefined;

async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance !== undefined) return analyticsInstance;
  if (typeof window === "undefined") {
    analyticsInstance = null;
    return null;
  }

  const init = initializeFirebase();
  if (init.status !== "ok") {
    analyticsInstance = null;
    return null;
  }

  try {
    if (!(await isSupported())) {
      analyticsInstance = null;
      return null;
    }
    const app = getApps()[0];
    if (!app) {
      analyticsInstance = null;
      return null;
    }
    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch {
    analyticsInstance = null;
    return null;
  }
}

function resolvePlanValue(
  plan: Plan | string | undefined,
  opts?: FirebaseSubscriptionOpts,
): { value: number; currency: string; itemId: string } {
  const resolved = resolveMetaPlanPrice(plan);
  return {
    value: opts?.value ?? resolved.value,
    currency: opts?.currency ?? resolved.currency,
    itemId: typeof plan === "string" ? plan : plan ?? "subscription",
  };
}

/** Log subscription purchase for Google Ads (WebView + web fallback). */
export async function trackFirebaseSubscriptionPurchase(
  plan: Plan | string | undefined,
  opts?: FirebaseSubscriptionOpts,
): Promise<void> {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  const { value, currency, itemId } = resolvePlanValue(plan, opts);
  const params = {
    currency,
    value,
    item_id: itemId,
    item_name: itemId,
    ...(opts?.source ? { source: opts.source } : {}),
  };

  try {
    logAnalyticsEvent(analytics, "purchase", params);
    logAnalyticsEvent(analytics, FIREBASE_SUBSCRIPTION_CONVERT_EVENT, params);
  } catch {
    /* analytics optional */
  }
}

/** Log checkout start — maps to begin_checkout in Google Ads. */
export async function trackFirebaseBeginCheckout(
  plan: Plan | string | undefined,
  opts?: FirebaseSubscriptionOpts,
): Promise<void> {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  const { value, currency, itemId } = resolvePlanValue(plan, opts);
  try {
    logAnalyticsEvent(analytics, FIREBASE_BEGIN_CHECKOUT_EVENT, {
      currency,
      value,
      item_id: itemId,
      ...(opts?.source ? { source: opts.source } : {}),
    });
  } catch {
    /* analytics optional */
  }
}

/** Reset cached analytics instance (tests). */
export function resetFirebaseSubscriptionAnalyticsForTests(): void {
  analyticsInstance = undefined;
}
