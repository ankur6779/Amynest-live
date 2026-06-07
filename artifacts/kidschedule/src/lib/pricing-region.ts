/**
 * Pricing region resolution for the web/PWA paywall.
 *
 * Detection precedence (matches product requirement):
 *   1. Proper location  → IP geolocation (no permission prompt)
 *   2. Fallback         → device timezone
 *   3. Default          → USA (USD pricing)
 *
 * Why a region matters for *display*: India web users pay via Razorpay in INR
 * (₹), but the API only ever returns USD prices (RevenueCat store currency).
 * Without this override the cards show USD while checkout charges INR — a
 * trust-breaking mismatch. iOS/Android native shells are excluded because the
 * App Store / Play Store already localise the price for the user's account.
 */

import { useEffect, useState } from "react";
import { detectCountryFromIp } from "@/lib/onboarding-location";
import type { Plan, PlanCard } from "@/hooks/use-subscription";

export type PricingRegion = "IN" | "US";

/**
 * INR display prices for India web (₹). These MUST stay in sync with the server
 * `RAZORPAY_PLAN_PRICES_INR` in
 * `artifacts/api-server/src/services/subscriptionService.ts` — they are the
 * amounts Razorpay actually charges, so the displayed price equals the charge.
 */
export const INR_PLAN_PRICES: Record<Exclude<Plan, "free">, number> = {
  monthly: 199,
  six_month: 999,
  yearly: 1499,
};

const INDIA_TIMEZONES = new Set(["Asia/Kolkata", "Asia/Calcutta"]);
const CACHE_KEY = "amynest:pricing-region";

/** Timezone-only region guess (synchronous fallback, defaults to US). */
function timezoneRegion(): PricingRegion {
  try {
    return INDIA_TIMEZONES.has(Intl.DateTimeFormat().resolvedOptions().timeZone)
      ? "IN"
      : "US";
  } catch {
    return "US";
  }
}

function readCachedRegion(): PricingRegion | null {
  try {
    const v = sessionStorage.getItem(CACHE_KEY);
    return v === "IN" || v === "US" ? v : null;
  } catch {
    return null;
  }
}

function writeCachedRegion(region: PricingRegion): void {
  try {
    sessionStorage.setItem(CACHE_KEY, region);
  } catch {
    /* sessionStorage unavailable (private mode / SSR) — ignore */
  }
}

/**
 * React hook resolving the pricing region. Returns immediately with a
 * timezone-based guess (or the session cache), then refines asynchronously
 * using IP geolocation — IP is the authoritative "proper location" signal and
 * overrides the timezone guess once it resolves.
 *
 * Pass `{ enabled: false }` on native shells (iOS Capacitor / Android wrapper):
 * those use store-localised prices and store-determined payment, so the region
 * is never used — skipping the IP lookup avoids a needless third-party call
 * inside the app.
 */
export function usePricingRegion(options?: {
  enabled?: boolean;
}): { region: PricingRegion; isIndia: boolean } {
  const enabled = options?.enabled ?? true;
  const [region, setRegion] = useState<PricingRegion>(
    () => readCachedRegion() ?? timezoneRegion(),
  );

  useEffect(() => {
    if (!enabled) return;
    // Already resolved (via IP) earlier this session — trust the cache.
    if (readCachedRegion()) return;

    let cancelled = false;
    void (async () => {
      const ip = await detectCountryFromIp();
      if (cancelled) return;
      // Proper location wins; if IP lookup failed, keep the timezone fallback.
      const resolved: PricingRegion = ip
        ? ip.countryCode === "IN"
          ? "IN"
          : "US"
        : timezoneRegion();
      writeCachedRegion(resolved);
      setRegion(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { region, isIndia: region === "IN" };
}

/** Recompute the savings badge from INR amounts (server value is USD-based). */
function inrSavingsPercent(planId: Exclude<Plan, "free">): number | undefined {
  const amount = INR_PLAN_PRICES[planId];
  const monthly = INR_PLAN_PRICES.monthly;
  if (planId === "six_month") {
    return Math.round((1 - amount / (monthly * 6)) * 100);
  }
  if (planId === "yearly") {
    return Math.round((1 - amount / (monthly * 12)) * 100);
  }
  return undefined;
}

/**
 * Override plan cards with India (₹) pricing so the displayed price matches the
 * Razorpay charge. Apply ONLY on web for India region — never on native shells
 * (store prices already localise) and never outside India.
 */
export function applyIndiaPricing(plans: PlanCard[]): PlanCard[] {
  return plans.map((p) => {
    const amount = INR_PLAN_PRICES[p.id];
    if (!amount) return p;
    const savingsPercent = inrSavingsPercent(p.id);
    return {
      ...p,
      price: amount,
      currency: "INR",
      formattedPrice: `₹${amount}`,
      ...(savingsPercent && savingsPercent > 0 ? { savingsPercent } : {}),
    };
  });
}
