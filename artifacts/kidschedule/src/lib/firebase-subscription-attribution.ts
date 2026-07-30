/**
 * Firebase Analytics subscription events for Google Ads conversion tracking.
 * Android Play WebView → native Firebase SDK (reliable app attribution).
 * Web / fallback → Firebase JS SDK.
 */

import { getApps } from "firebase/app";
import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
import type { Plan } from "@/hooks/use-subscription";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import { initializeFirebase } from "@/lib/firebase";
import { resolveMetaPlanPrice } from "@/lib/meta-attribution";
import { getNativeBilling, waitForBillingBridge } from "@/lib/native-billing";

export const FIREBASE_SUBSCRIPTION_CONVERT_EVENT = "app_store_subscription_convert";
export const FIREBASE_BEGIN_CHECKOUT_EVENT = "begin_checkout";
export const FIREBASE_SIGN_UP_EVENT = "sign_up";

type AnalyticsEventParams = Record<
  string,
  string | number | Array<Record<string, string | number>>
>;

type FirebaseSubscriptionOpts = {
  source?: string;
  value?: number;
  currency?: string;
};

let analyticsInstance: Analytics | null | undefined;

function logAnalyticsEvent(
  analytics: Analytics,
  name: string,
  params: AnalyticsEventParams,
): void {
  logEvent(analytics, name as Parameters<typeof logEvent>[1], params);
}

/** True only inside the Play Store WebView wrapper (has AmyNestBillingNative). */
function shouldUseNativeAndroidFirebase(): boolean {
  return isNativeAmyNestAndroidWrapper();
}

function buildEcommerceParams(
  itemId: string,
  currency: string,
  value: number,
  source?: string,
): AnalyticsEventParams {
  return {
    currency,
    value,
    item_id: itemId,
    item_name: itemId,
    items: [
      {
        item_id: itemId,
        item_name: itemId,
        item_category: "subscription",
        price: value,
        quantity: 1,
      },
    ],
    ...(source ? { source } : {}),
  };
}

async function logNativeAndroidSubscriptionEvent(
  event: "purchase" | "begin_checkout" | "sign_up",
  productId: string,
  currency: string,
  value: number,
  source?: string,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  await waitForBillingBridge(4_000);
  const billing = getNativeBilling();
  if (!billing?.logSubscriptionAnalytics) return false;
  try {
    const result = await billing.logSubscriptionAnalytics({
      event,
      productId,
      currency,
      value,
      source,
    });
    return result.ok === true;
  } catch {
    return false;
  }
}

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

async function logWebFirebaseEvents(
  events: Array<{ name: string; params: AnalyticsEventParams }>,
): Promise<boolean> {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return false;
  try {
    for (const event of events) {
      logAnalyticsEvent(analytics, event.name, event.params);
    }
    return true;
  } catch {
    return false;
  }
}

/** Log subscription purchase for Google Ads (WebView + web fallback). */
export async function trackFirebaseSubscriptionPurchase(
  plan: Plan | string | undefined,
  opts?: FirebaseSubscriptionOpts,
): Promise<void> {
  const { value, currency, itemId } = resolvePlanValue(plan, opts);
  const params = buildEcommerceParams(itemId, currency, value, opts?.source);

  if (shouldUseNativeAndroidFirebase()) {
    const nativeOk = await logNativeAndroidSubscriptionEvent(
      "purchase",
      itemId,
      currency,
      value,
      opts?.source,
    );
    if (nativeOk) return;
  }

  await logWebFirebaseEvents([
    { name: "purchase", params },
    { name: FIREBASE_SUBSCRIPTION_CONVERT_EVENT, params },
  ]);
}

/** Log checkout start — maps to begin_checkout in Google Ads. */
export async function trackFirebaseBeginCheckout(
  plan: Plan | string | undefined,
  opts?: FirebaseSubscriptionOpts,
): Promise<void> {
  const { value, currency, itemId } = resolvePlanValue(plan, opts);
  const params = buildEcommerceParams(itemId, currency, value, opts?.source);

  if (shouldUseNativeAndroidFirebase()) {
    const nativeOk = await logNativeAndroidSubscriptionEvent(
      "begin_checkout",
      itemId,
      currency,
      value,
      opts?.source,
    );
    if (nativeOk) return;
  }

  await logWebFirebaseEvents([{ name: FIREBASE_BEGIN_CHECKOUT_EVENT, params }]);
}

/** Billing bridge versions that understand `sign_up` (avoid 1.4.55 else→subscription_convert). */
function nativeBridgeSupportsSignUp(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.__AMYNEST_BILLING;
  if (typeof raw !== "string" || !raw.trim()) return false;
  const parts = raw.split(".").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return false;
  const [maj = 0, min = 0, patch = 0] = parts;
  return maj > 2 || (maj === 2 && (min > 5 || (min === 5 && patch >= 2)));
}

/** Log signup — Firebase `sign_up` for Google Ads app conversion optimization. */
export async function trackFirebaseSignUp(opts?: {
  method?: string;
  source?: string;
}): Promise<void> {
  const method = opts?.method ?? "app";
  const params: AnalyticsEventParams = {
    method,
    ...(opts?.source ? { source: opts.source } : {}),
  };

  if (shouldUseNativeAndroidFirebase() && nativeBridgeSupportsSignUp()) {
    const nativeOk = await logNativeAndroidSubscriptionEvent(
      "sign_up",
      method,
      "INR",
      0,
      opts?.source,
    );
    if (nativeOk) return;
  }

  await logWebFirebaseEvents([{ name: FIREBASE_SIGN_UP_EVENT, params }]);
}

/** Reset cached analytics instance (tests). */
export function resetFirebaseSubscriptionAnalyticsForTests(): void {
  analyticsInstance = undefined;
}
