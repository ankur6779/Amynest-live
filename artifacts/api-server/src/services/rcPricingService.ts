import { logger } from "../lib/logger";
import { fetchWithTimeout } from "../utils/fetch-with-timeout.js";
import { PLAN_PRICES, formatPlanPrice, type Plan } from "./subscriptionService";

export type PlanPriceMap = Record<
  Exclude<Plan, "free">,
  { amount: number; currency: string; period: string; formattedPrice: string }
>;

const RC_PROJECT_ID = process.env.REVENUECAT_PROJECT_ID ?? "";
const RC_APPLE_APP_ID = process.env.REVENUECAT_APPLE_APP_STORE_APP_ID ?? "";
const RC_GOOGLE_APP_ID = process.env.REVENUECAT_GOOGLE_PLAY_STORE_APP_ID ?? "";
const RC_V2_SECRET_KEY = process.env.REVENUECAT_V2_SECRET_KEY ?? "";

const CACHE_TTL_MS = 5 * 60 * 1000;
const RC_FETCH_TIMEOUT_MS = Number(process.env.RC_FETCH_TIMEOUT_MS ?? "4000");
const RC_MAX_PACKAGES = 3;

let cachedPrices: PlanPriceMap | null = null;
let cacheExpiry = 0;

const PACKAGE_TO_PLAN: Record<string, Exclude<Plan, "free">> = {
  $rc_monthly: "monthly",
  $rc_six_month: "six_month",
  $rc_annual: "yearly",
};

const STORE_ID_TO_PLAN: Record<string, Exclude<Plan, "free">> = {
  amynest_monthly: "monthly",
  "amynest_monthly:monthly": "monthly",
  amynest_6month: "six_month",
  "amynest_6month:six-month": "six_month",
  amynest_yearly: "yearly",
  "amynest_yearly:yearly": "yearly",
};

type RcListResponse<T> = { items?: T[] };

type RcProductItem = {
  app_id?: string;
  store_identifier?: string;
  indicative_price?: {
    currency?: string;
    amount_micros?: number | string;
  };
  prices?: Array<{
    currency: string;
    amount: number;
    formatted_price?: string;
  }>;
};

function fallbackPrices(): PlanPriceMap {
  return {
    monthly: {
      amount: PLAN_PRICES.monthly.amount,
      currency: PLAN_PRICES.monthly.currency,
      period: PLAN_PRICES.monthly.period,
      formattedPrice: formatPlanPrice(PLAN_PRICES.monthly.amount, PLAN_PRICES.monthly.currency),
    },
    six_month: {
      amount: PLAN_PRICES.six_month.amount,
      currency: PLAN_PRICES.six_month.currency,
      period: PLAN_PRICES.six_month.period,
      formattedPrice: formatPlanPrice(PLAN_PRICES.six_month.amount, PLAN_PRICES.six_month.currency),
    },
    yearly: {
      amount: PLAN_PRICES.yearly.amount,
      currency: PLAN_PRICES.yearly.currency,
      period: PLAN_PRICES.yearly.period,
      formattedPrice: formatPlanPrice(PLAN_PRICES.yearly.amount, PLAN_PRICES.yearly.currency),
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
      formattedPrice: formatPlanPrice(fallbackAmount, fallbackCurrency),
    };
  }
  return { amount: fallbackAmount, currency: fallbackCurrency, formattedPrice: priceString };
}

function isTargetApp(appId: string | undefined): boolean {
  if (!appId) return false;
  if (!RC_APPLE_APP_ID && !RC_GOOGLE_APP_ID) return true;
  return appId === RC_APPLE_APP_ID || appId === RC_GOOGLE_APP_ID;
}

function priceFromProduct(
  product: RcProductItem,
  plan: Exclude<Plan, "free">,
  base: PlanPriceMap,
): PlanPriceMap[typeof plan] | null {
  const fallback = base[plan];
  const indicative = product.indicative_price;
  if (indicative?.amount_micros != null) {
    const amount = Number(indicative.amount_micros) / 1_000_000;
    if (Number.isFinite(amount) && amount > 0) {
      const currency = indicative.currency ?? fallback.currency;
      return {
        amount,
        currency,
        period: fallback.period,
        formattedPrice: formatPlanPrice(amount, currency),
      };
    }
  }

  const price = product.prices?.[0];
  if (!price) return null;

  const { amount, currency, formattedPrice } = extractAmountAndCurrency(
    price.formatted_price,
    price.amount,
    price.currency,
  );
  return {
    amount,
    currency,
    period: fallback.period,
    formattedPrice,
  };
}

async function rcFetch(path: string): Promise<unknown> {
  const url = `https://api.revenuecat.com/v2${path}`;
  const res = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${RC_V2_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    timeoutMs: RC_FETCH_TIMEOUT_MS,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RC API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchPricesFromProductCatalog(result: PlanPriceMap): Promise<boolean> {
  const data = (await rcFetch(
    `/projects/${encodeURIComponent(RC_PROJECT_ID)}/products?limit=100`,
  )) as RcListResponse<RcProductItem>;

  let matched = 0;
  for (const product of data.items ?? []) {
    const plan = STORE_ID_TO_PLAN[product.store_identifier ?? ""];
    if (!plan || !isTargetApp(product.app_id)) continue;
    const priced = priceFromProduct(product, plan, result);
    if (!priced) continue;
    result[plan] = priced;
    matched++;
  }
  return matched > 0;
}

async function fetchPricesFromOfferingPackages(
  offeringId: string,
  result: PlanPriceMap,
): Promise<boolean> {
  const packages = (await rcFetch(
    `/projects/${encodeURIComponent(RC_PROJECT_ID)}/offerings/${encodeURIComponent(offeringId)}/packages?limit=20`,
  )) as RcListResponse<{ id: string; lookup_key: string }>;

  let matched = 0;
  for (const pkg of (packages.items ?? []).slice(0, RC_MAX_PACKAGES)) {
    const plan = PACKAGE_TO_PLAN[pkg.lookup_key];
    if (!plan) continue;

    const products = (await rcFetch(
      `/projects/${encodeURIComponent(RC_PROJECT_ID)}/packages/${encodeURIComponent(pkg.id)}/products?limit=20`,
    )) as RcListResponse<{ product: RcProductItem }>;

    for (const item of products.items ?? []) {
      const product = item.product;
      if (!product || !isTargetApp(product.app_id)) continue;
      const priced = priceFromProduct(product, plan, result);
      if (!priced) continue;
      result[plan] = priced;
      matched++;
      break;
    }
  }
  return matched > 0;
}

async function fetchLivePrices(): Promise<PlanPriceMap> {
  if (!RC_V2_SECRET_KEY || !RC_PROJECT_ID) {
    logger.warn("[rcPricing] RevenueCat V2 config not set — using fallback prices");
    return fallbackPrices();
  }

  const result = fallbackPrices();

  try {
    if (await fetchPricesFromProductCatalog(result)) {
      logger.info("[rcPricing] Live prices fetched from RevenueCat product catalog");
      return result;
    }

    const offerings = (await rcFetch(
      `/projects/${encodeURIComponent(RC_PROJECT_ID)}/offerings?limit=20`,
    )) as RcListResponse<{ id: string; lookup_key: string; is_current?: boolean }>;

    const defaultOffering =
      offerings.items?.find((o) => o.lookup_key === "default" || o.is_current) ??
      offerings.items?.[0];

    if (!defaultOffering) {
      logger.warn("[rcPricing] No offerings found — using fallback");
      return result;
    }

    if (await fetchPricesFromOfferingPackages(defaultOffering.id, result)) {
      logger.info("[rcPricing] Live prices fetched from RevenueCat offering packages");
      return result;
    }

    logger.warn("[rcPricing] No matching RevenueCat products — using fallback");
    return result;
  } catch (err) {
    logger.warn({ err }, "[rcPricing] Failed to fetch live prices — using fallback");
    return result;
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
