/**
 * Meta Pixel attribution — sync fbclid → _fbc cookie and emit standard events
 * with campaign_ids so Ads Manager can attribute conversions to ad campaigns.
 */

import type { Plan } from "@/hooks/use-subscription";
import { isIndiaRegion } from "@/lib/geo";
import { getInstallAttribution } from "@/lib/install-attribution";
import { INR_PLAN_PRICES } from "@/lib/pricing-region";

export const META_PIXEL_ID = "2514850758945614";

const FBC_COOKIE = "_fbc";
const FBC_MAX_AGE_SEC = 90 * 24 * 60 * 60;

/** USD fallbacks when store/API price is unavailable (display reference prices). */
const USD_PLAN_PRICES: Record<Exclude<Plan, "free">, number> = {
  monthly: 4.99,
  six_month: 24.99,
  yearly: 39.99,
};

type MetaWindow = Window & {
  fbq?: (...args: unknown[]) => void;
};

export type MetaEventParams = Record<string, string | number | boolean | undefined>;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
}

/** Meta _fbc format: fb.{subdomainIndex}.{creationTimeMs}.{fbclid} */
export function buildFbcValue(fbclid: string, createdAtMs = Date.now()): string {
  return `fb.1.${createdAtMs}.${fbclid}`;
}

export function readFbclidFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const fbclid = new URLSearchParams(window.location.search).get("fbclid")?.trim();
  return fbclid || null;
}

/** Persist Meta click cookie when fbclid is present (new click overwrites prior _fbc). */
export function syncFbcCookieFromFbclid(fbclid?: string | null): void {
  const clickId = fbclid ?? readFbclidFromUrl();
  if (!clickId) return;
  writeCookie(FBC_COOKIE, buildFbcValue(clickId), FBC_MAX_AGE_SEC);
}

function resolveCampaignIds(): string | undefined {
  const attr = getInstallAttribution();
  const campaign = attr?.utmCampaign?.trim();
  if (campaign) return campaign;
  const fbclid = attr?.fbclid?.trim();
  return fbclid || undefined;
}

/** Shared event params for Meta campaign attribution diagnostics. */
export function buildMetaEventParams(extra?: MetaEventParams): MetaEventParams {
  const campaignIds = resolveCampaignIds();
  const attr = getInstallAttribution();
  return {
    ...(campaignIds ? { campaign_ids: campaignIds } : {}),
    ...(attr?.utmSource ? { utm_source: attr.utmSource } : {}),
    ...(attr?.utmMedium ? { utm_medium: attr.utmMedium } : {}),
    ...(attr?.fbclid ? { fbclid: attr.fbclid } : {}),
    ...extra,
  };
}

function callFbq(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  try {
    (window as MetaWindow).fbq?.(...args);
  } catch {
    /* pixel optional */
  }
}

/** Boot-time sync: fbclid from URL → _fbc, refresh stored attribution. */
export function initMetaAttribution(): void {
  syncFbcCookieFromFbclid();
}

export function trackMetaLogin(source?: string): void {
  callFbq("trackCustom", "AmyNest login", buildMetaEventParams({ source }));
}

export function trackMetaCompleteRegistration(source?: string): void {
  callFbq("track", "CompleteRegistration", buildMetaEventParams({ source }));
  trackMetaLogin(source);
}

export function resolveMetaPlanPrice(plan: Plan | string | undefined): {
  value: number;
  currency: string;
} {
  const id = plan as Plan;
  if (id === "monthly" || id === "six_month" || id === "yearly") {
    if (isIndiaRegion()) {
      return { value: INR_PLAN_PRICES[id], currency: "INR" };
    }
    return { value: USD_PLAN_PRICES[id], currency: "USD" };
  }
  return { value: USD_PLAN_PRICES.yearly, currency: "USD" };
}

export function trackMetaSubscribe(
  plan: Plan | string | undefined,
  opts?: { source?: string; value?: number; currency?: string },
): void {
  const resolved = resolveMetaPlanPrice(plan);
  const value = opts?.value ?? resolved.value;
  const currency = opts?.currency ?? resolved.currency;
  callFbq(
    "track",
    "Subscribe",
    buildMetaEventParams({
      value,
      currency,
      content_name: typeof plan === "string" ? plan : plan ?? "subscription",
      source: opts?.source,
    }),
  );
  callFbq(
    "track",
    "Purchase",
    buildMetaEventParams({
      value,
      currency,
      content_name: typeof plan === "string" ? plan : plan ?? "subscription",
      source: opts?.source,
    }),
  );
}
