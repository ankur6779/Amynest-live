import type { Plan, PlanCard } from "@/hooks/use-subscription";
import { FF_ANNUAL_PRICE_EQUIV } from "@/lib/subscription-feature-flags";

export type StorePlanPrice = {
  amount: number;
  currency: string;
  priceString?: string;
};

export type PlanPricePresentation = {
  /** Full billed amount first, e.g. ₹1,499/year or $39.99/year */
  primaryLine: string;
  /** Per-month equivalent, e.g. ≈ ₹125/month */
  monthlyEquivalentLine: string | null;
  billingCadenceLine: string;
  tierHintLine: string | null;
  numericAmount: number;
  currency: string;
};

const BILLING_CADENCE: Record<Exclude<Plan, "free">, string> = {
  yearly: "Billed annually",
  six_month: "Billed every 6 months",
  monthly: "Billed monthly",
};

const TIER_HINT: Record<Exclude<Plan, "free">, string | null> = {
  yearly: "Best value",
  six_month: "Lower commitment",
  monthly: "Most flexible",
};

const PERIOD_SUFFIX: Record<Exclude<Plan, "free">, string> = {
  yearly: "/year",
  six_month: " / 6 months",
  monthly: "/month",
};

function localeForCurrency(currency: string): string {
  try {
    return Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).resolvedOptions().locale;
  } catch {
    return "en-US";
  }
}

function fractionDigitsForCurrency(currency: string): number {
  try {
    const opts = new Intl.NumberFormat(localeForCurrency(currency), {
      style: "currency",
      currency: currency.toUpperCase(),
    }).resolvedOptions();
    return opts.maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** Round monthly equivalent for display (INR → whole rupees, USD → cents). */
export function roundMonthlyEquivalent(value: number, currency: string): number {
  const fd = fractionDigitsForCurrency(currency);
  const factor = 10 ** fd;
  return Math.round(value * factor) / factor;
}

/**
 * Monthly-normalized amount from billed price.
 * yearly → /12, six_month → /6, monthly → null
 */
export function getMonthlyEquivalent(
  planId: Exclude<Plan, "free">,
  billedAmount: number,
): number | null {
  if (!Number.isFinite(billedAmount) || billedAmount <= 0) return null;
  if (planId === "yearly") return billedAmount / 12;
  if (planId === "six_month") return billedAmount / 6;
  return null;
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const fd = fractionDigitsForCurrency(code);
  try {
    return new Intl.NumberFormat(localeForCurrency(code), {
      style: "currency",
      currency: code,
      minimumFractionDigits: fd === 0 ? 0 : 0,
      maximumFractionDigits: fd,
    }).format(amount);
  } catch {
    if (code === "USD") return `$${amount.toFixed(2)}`;
    if (code === "INR") return `₹${Math.round(amount)}`;
    return `${code} ${amount}`;
  }
}

/** Parse store localized price when numeric micros/price unavailable (best-effort). */
export function parseLocalizedPriceAmount(priceString: string): number | null {
  const normalized = priceString.replace(/\s/g, "");
  const match = normalized.match(/[\d,.]+/);
  if (!match) return null;
  const raw = match[0];
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let numeric: number;
  if (hasComma && hasDot) {
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");
    if (lastComma > lastDot) {
      numeric = Number(raw.replace(/\./g, "").replace(",", "."));
    } else {
      numeric = Number(raw.replace(/,/g, ""));
    }
  } else if (hasComma) {
    const parts = raw.split(",");
    numeric =
      parts.length === 2 && parts[1].length <= 2
        ? Number(`${parts[0]}.${parts[1]}`)
        : Number(raw.replace(/,/g, ""));
  } else {
    numeric = Number(raw);
  }
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

/**
 * Resolve numeric billed amount: store (RC / Play / App Store) → API plan.price.
 */
export function resolvePlanNumericPrice(
  plan: Pick<PlanCard, "id" | "price" | "currency">,
  store?: StorePlanPrice | null,
  storePriceLabel?: string,
): { amount: number; currency: string } {
  if (store?.amount && store.amount > 0) {
    return {
      amount: store.amount,
      currency: (store.currency || plan.currency || "USD").toUpperCase(),
    };
  }
  if (storePriceLabel) {
    const parsed = parseLocalizedPriceAmount(storePriceLabel);
    if (parsed != null) {
      return {
        amount: parsed,
        currency: (plan.currency || "USD").toUpperCase(),
      };
    }
  }
  return {
    amount: plan.price,
    currency: (plan.currency || "USD").toUpperCase(),
  };
}

export function formatMonthlyEquivalentLine(
  planId: Exclude<Plan, "free">,
  billedAmount: number,
  currency: string,
): string | null {
  if (!FF_ANNUAL_PRICE_EQUIV) return null;
  const monthly = getMonthlyEquivalent(planId, billedAmount);
  if (monthly == null) return null;
  const rounded = roundMonthlyEquivalent(monthly, currency);
  return `≈ ${formatCurrencyAmount(rounded, currency)}/month`;
}

/** Display price label: store string → API formattedPrice → derived. */
export function displayPlanPrice(
  plan: Pick<PlanCard, "price" | "currency" | "formattedPrice">,
): string {
  if (plan.formattedPrice) return plan.formattedPrice;
  return formatCurrencyAmount(plan.price, plan.currency);
}

export function resolvePlanPriceLabel(
  plan: Pick<PlanCard, "id" | "price" | "currency" | "formattedPrice">,
  storePriceByPlan?: Partial<Record<Exclude<Plan, "free">, string>>,
): string {
  const storePrice = storePriceByPlan?.[plan.id];
  if (storePrice) return storePrice;
  return displayPlanPrice(plan);
}

export function buildPlanPricePresentation(
  plan: PlanCard,
  options?: {
    storePriceLabel?: string;
    store?: StorePlanPrice | null;
  },
): PlanPricePresentation {
  const storeLabel = options?.storePriceLabel ?? options?.store?.priceString;
  const { amount, currency } = resolvePlanNumericPrice(
    plan,
    options?.store ?? null,
    storeLabel,
  );
  const billedLabel =
    storeLabel ?? formatCurrencyAmount(amount, currency);
  const primaryLine = `${billedLabel}${PERIOD_SUFFIX[plan.id]}`;

  return {
    primaryLine,
    monthlyEquivalentLine: formatMonthlyEquivalentLine(plan.id, amount, currency),
    billingCadenceLine: BILLING_CADENCE[plan.id],
    tierHintLine: TIER_HINT[plan.id],
    numericAmount: amount,
    currency,
  };
}
