import { logger } from "../lib/logger";
import { PLAN_PRICES, type Plan } from "./subscriptionService";

export type PlanPriceMap = Record<
  Exclude<Plan, "free">,
  { amount: number; currency: string; period: string; formattedPrice: string }
>;

const RC_PROJECT_ID = process.env.REVENUECAT_PROJECT_ID ?? "";
const RC_APPLE_APP_ID = process.env.REVENUECAT_APPLE_APP_STORE_APP_ID ?? "";
const RC_GOOGLE_APP_ID = process.env.REVENUECAT_GOOGLE_PLAY_STORE_APP_ID ?? "";
const RC_SECRET_KEY = process.env.REVENUECAT_SECRET_KEY ?? "";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedPrices: PlanPriceMap | null = null;
let cacheExpiry = 0;

const PACKAGE_TO_PLAN: Record<string, Exclude<Plan, "free">> = {
  "$rc_monthly": "monthly",
  "$rc_six_month": "six_month",
  "$rc_annual": "yearly",
};

function fallbackPrices(): PlanPriceMap {
  return {
    monthly: {
      amount: PLAN_PRICES.monthly.amount,
      currency: "INR",
      period: PLAN_PRICES.monthly.period,
      formattedPrice: `₹${PLAN_PRICES.monthly.amount}`,
    },
    six_month: {
      amount: PLAN_PRICES.six_month.amount,
      currency: "INR",
      period: PLAN_PRICES.six_month.period,
      formattedPrice: `₹${PLAN_PRICES.six_month.amount}`,
    },
    yearly: {
      amount: PLAN_PRICES.yearly.amount,
      currency: "INR",
      period: PLAN_PRICES.yearly.period,
      formattedPrice: `₹${PLAN_PRICES.yearly.amount}`,
    },
  };
}

function extractAmountAndCurrency(
  priceString: string | undefined,
  fallbackAmount: number,
  fallbackCurrency: string,
): { amount: number; currency: string; formattedPrice: string } {
  if (!priceString) {
    return {
      amount: fallbackAmount,
      currency: fallbackCurrency,
      formattedPrice: `₹${fallbackAmount}`,
    };
  }
  return { amount: fallbackAmount, currency: fallbackCurrency, formattedPrice: priceString };
}

async function rcFetch(path: string): Promise<unknown> {
  const url = `https://api.revenuecat.com/v2${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${RC_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`RC API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function fetchLivePrices(): Promise<PlanPriceMap> {
  if (!RC_SECRET_KEY || !RC_PROJECT_ID) {
    logger.warn("[rcPricing] REVENUECAT_SECRET_KEY not set — using fallback prices");
    return fallbackPrices();
  }

  try {
    const offerings = (await rcFetch(
      `/projects/${RC_PROJECT_ID}/offerings?limit=20`,
    )) as { items: Array<{ id: string; lookup_key: string }> };

    const defaultOffering = offerings.items.find(
      (o) => o.lookup_key === "default",
    ) ?? offerings.items[0];

    if (!defaultOffering) {
      logger.warn("[rcPricing] No offerings found — using fallback");
      return fallbackPrices();
    }

    const packages = (await rcFetch(
      `/projects/${RC_PROJECT_ID}/offerings/${defaultOffering.id}/packages?limit=20`,
    )) as { items: Array<{ id: string; lookup_key: string }> };

    const result = fallbackPrices();

    for (const pkg of packages.items) {
      const plan = PACKAGE_TO_PLAN[pkg.lookup_key];
      if (!plan) continue;

      const products = (await rcFetch(
        `/projects/${RC_PROJECT_ID}/offerings/${defaultOffering.id}/packages/${pkg.id}/products?limit=20`,
      )) as {
        items: Array<{
          product: {
            app_id?: string;
            store_identifier?: string;
            display_name?: string;
            prices?: Array<{
              currency: string;
              amount: number;
              formatted_price?: string;
            }>;
          };
        }>;
      };

      for (const item of products.items) {
        const p = item.product;
        const isProduction =
          p.app_id === RC_APPLE_APP_ID || p.app_id === RC_GOOGLE_APP_ID;
        if (!isProduction) continue;

        const price = p.prices?.[0];
        if (!price) continue;

        const { amount, currency, formattedPrice } = extractAmountAndCurrency(
          price.formatted_price,
          price.amount,
          price.currency,
        );

        result[plan] = {
          amount,
          currency,
          period: result[plan].period,
          formattedPrice,
        };
        break;
      }
    }

    logger.info("[rcPricing] Live prices fetched from RevenueCat");
    return result;
  } catch (err) {
    logger.error({ err }, "[rcPricing] Failed to fetch live prices — using fallback");
    return fallbackPrices();
  }
}

export async function getLivePlanPrices(): Promise<PlanPriceMap> {
  const now = Date.now();
  if (cachedPrices && now < cacheExpiry) {
    return cachedPrices;
  }
  const prices = await fetchLivePrices();
  cachedPrices = prices;
  cacheExpiry = now + CACHE_TTL_MS;
  return prices;
}

export function invalidatePriceCache(): void {
  cachedPrices = null;
  cacheExpiry = 0;
}
