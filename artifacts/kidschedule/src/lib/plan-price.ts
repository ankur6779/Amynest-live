import type { Plan, PlanCard } from "@/hooks/use-subscription";
import { FF_MONTHLY_PRIMARY_PRICE } from "@/lib/subscription-feature-flags";

export type StorePlanPrice = {
  amount: number;
  currency: string;
  priceString?: string;
};

export type PlanPriceHierarchy = "monthly_primary" | "billed_primary";

export type PlanBillingLabels = {
  billedAnnuallyAt: (formattedAmount: string) => string;
  billedEverySixMonthsAt: (formattedAmount: string) => string;
  billedMonthly: string;
};

export const DEFAULT_PLAN_BILLING_LABELS: PlanBillingLabels = {
  billedAnnuallyAt: (amount) => `Billed annually at ${amount}`,
  billedEverySixMonthsAt: (amount) => `Billed every 6 months at ${amount}`,
  billedMonthly: "Billed monthly",
};

export type PlanPricePresentation = {
  /** Largest price line (monthly-equivalent for multi-month, or /month for monthly). */
  primaryLine: string;
  /** Store-compliant actual charge, e.g. "Billed annually at $39.99". */
  secondaryBillingLine: string;
  /** For cancel flows / legacy consumers — same monthly amount without "≈". */
  monthlyEquivalentLine: string | null;
  /** @deprecated Use secondaryBillingLine — kept for gradual migration. */
  billingCadenceLine: string;
  tierHintLine: string | null;
  numericAmount: number;
  currency: string;
  hierarchy: PlanPriceHierarchy;
};

const PERIOD_SUFFIX: Record<Exclude<Plan, "free">, string> = {
  yearly: "/year",
  six_month: " / 6 months",
  monthly: "/month",
};

const TIER_HINT: Record<Exclude<Plan, "free">, string | null> = {
  yearly: "Best value",
  six_month: "Lower commitment",
  monthly: "Most flexible",
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
  options?: { prefixApprox?: boolean },
): string | null {
  const monthly = getMonthlyEquivalent(planId, billedAmount);
  if (monthly == null) return null;
  const rounded = roundMonthlyEquivalent(monthly, currency);
  const formatted = formatCurrencyAmount(rounded, currency);
  const prefix = options?.prefixApprox === false ? "" : "≈ ";
  return `${prefix}${formatted}/month`;
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

function buildBilledPrimaryPresentation(
  plan: PlanCard,
  amount: number,
  currency: string,
  billedLabel: string,
): PlanPricePresentation {
  const primaryLine = `${billedLabel}${PERIOD_SUFFIX[plan.id]}`;
  const monthlyEquivalentLine = formatMonthlyEquivalentLine(plan.id, amount, currency, {
    prefixApprox: true,
  });

  return {
    primaryLine,
    secondaryBillingLine:
      plan.id === "monthly" ? DEFAULT_PLAN_BILLING_LABELS.billedMonthly : primaryLine,
    monthlyEquivalentLine,
    billingCadenceLine:
      plan.id === "yearly"
        ? "Billed annually"
        : plan.id === "six_month"
          ? "Billed every 6 months"
          : "Billed monthly",
    tierHintLine: TIER_HINT[plan.id],
    numericAmount: amount,
    currency,
    hierarchy: "billed_primary",
  };
}

function buildMonthlyPrimaryPresentation(
  plan: PlanCard,
  amount: number,
  currency: string,
  billedLabel: string,
  labels: PlanBillingLabels,
): PlanPricePresentation {
  if (plan.id === "monthly") {
    const primaryLine = `${billedLabel}/month`;
    return {
      primaryLine,
      secondaryBillingLine: labels.billedMonthly,
      monthlyEquivalentLine: null,
      billingCadenceLine: labels.billedMonthly,
      tierHintLine: TIER_HINT.monthly,
      numericAmount: amount,
      currency,
      hierarchy: "monthly_primary",
    };
  }

  const monthly = getMonthlyEquivalent(plan.id, amount);
  const rounded =
    monthly != null ? roundMonthlyEquivalent(monthly, currency) : amount;
  const primaryLine = `${formatCurrencyAmount(rounded, currency)}/month`;
  const formattedBilled = formatCurrencyAmount(amount, currency);
  const secondaryBillingLine =
    plan.id === "yearly"
      ? labels.billedAnnuallyAt(formattedBilled)
      : labels.billedEverySixMonthsAt(formattedBilled);

  return {
    primaryLine,
    secondaryBillingLine,
    monthlyEquivalentLine: `${formatCurrencyAmount(rounded, currency)}/month`,
    billingCadenceLine: secondaryBillingLine,
    tierHintLine: TIER_HINT[plan.id],
    numericAmount: amount,
    currency,
    hierarchy: "monthly_primary",
  };
}

export function buildPlanPricePresentation(
  plan: PlanCard,
  options?: {
    storePriceLabel?: string;
    store?: StorePlanPrice | null;
    labels?: PlanBillingLabels;
    hierarchy?: PlanPriceHierarchy;
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
  const labels = options?.labels ?? DEFAULT_PLAN_BILLING_LABELS;
  const useMonthlyPrimary =
    (options?.hierarchy ?? (FF_MONTHLY_PRIMARY_PRICE ? "monthly_primary" : "billed_primary")) ===
    "monthly_primary";

  if (useMonthlyPrimary) {
    return buildMonthlyPrimaryPresentation(plan, amount, currency, billedLabel, labels);
  }
  return buildBilledPrimaryPresentation(plan, amount, currency, billedLabel);
}

/** Monthly-equivalent line for cancel-save / upsell (no ≈ prefix). */
export function monthlyEquivalentForPlan(
  planId: Exclude<Plan, "free">,
  presentation: PlanPricePresentation,
): string | null {
  if (planId === "monthly") return null;
  if (presentation.hierarchy === "monthly_primary") return presentation.primaryLine;
  return presentation.monthlyEquivalentLine;
}
