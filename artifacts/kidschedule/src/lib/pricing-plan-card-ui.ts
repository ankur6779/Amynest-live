import type { Plan, PlanCard } from "@/hooks/use-subscription";
import { planPricePresentation, planSavingsLabel } from "@/lib/subscription-plans";
import type { PlanBillingLabels, PlanPricePresentation } from "@/lib/plan-price";
import type { StorePlanPrice } from "@/lib/plan-price";

export function planStorePriceOptions(
  planId: Exclude<Plan, "free">,
  priceByPlan: Partial<Record<Exclude<Plan, "free">, string>>,
  storePricesByPlan: Partial<Record<Exclude<Plan, "free">, StorePlanPrice>>,
) {
  return {
    storePriceLabel: priceByPlan[planId],
    store: storePricesByPlan[planId] ?? null,
  };
}

/** Existing merchandising badge, without promotional icon theatre. */
export function planBadgeLabel(_planId: Exclude<Plan, "free">, badge: string | null): string | null {
  if (!badge) return null;
  return badge;
}

export function planCardPricePresentation(
  plan: PlanCard,
  storePriceLabel?: string,
  store?: StorePlanPrice | null,
  labels?: PlanBillingLabels,
) {
  const presentation = planPricePresentation(plan, { storePriceLabel, store, labels });
  return {
    presentation,
    savings: planSavingsLabel(plan),
  };
}

export function shouldHideValueAnchor(planId: Exclude<Plan, "free">): boolean {
  return planId === "yearly" || planId === "six_month";
}

/** Calm audience line derived from existing plan meaning. Presentation only. */
export const PLAN_LIVING_AUDIENCE: Record<Exclude<Plan, "free">, string> = {
  yearly: "Best for families who want uninterrupted support.",
  six_month: "For families who prefer a shorter commitment.",
  monthly: "For families who want maximum flexibility.",
};

const PERIOD_SUFFIXES = ["/year", " / 6 months", "/month"] as const;

function stripKnownPeriodSuffix(line: string): string {
  for (const suffix of PERIOD_SUFFIXES) {
    if (line.endsWith(suffix)) return line.slice(0, -suffix.length).trim();
  }
  return line;
}

function amountAfterAt(line: string): string | null {
  const idx = line.toLowerCase().lastIndexOf(" at ");
  if (idx === -1) return null;
  const amount = line.slice(idx + 4).trim();
  return amount || null;
}

/**
 * Rearranges existing presentation strings so the billed amount is the large
 * price. Does not recalculate, convert, or replace product amounts.
 */
export function pricingLivingPriceDisplay(presentation: PlanPricePresentation): {
  amountLine: string;
  periodLine: string;
  equivalentLine: string | null;
} {
  const periodLine = presentation.billingCadenceLine;

  if (presentation.hierarchy === "billed_primary") {
    return {
      amountLine: stripKnownPeriodSuffix(presentation.primaryLine),
      periodLine,
      equivalentLine: presentation.monthlyEquivalentLine,
    };
  }

  const isMonthlyPlan = presentation.monthlyEquivalentLine == null;
  if (isMonthlyPlan) {
    return {
      amountLine: stripKnownPeriodSuffix(presentation.primaryLine),
      periodLine: presentation.secondaryBillingLine || periodLine,
      equivalentLine: null,
    };
  }

  const amountFromSecondary = amountAfterAt(presentation.secondaryBillingLine);
  const amountLine = amountFromSecondary ?? presentation.secondaryBillingLine;
  const periodFromBilledLine =
    amountFromSecondary && presentation.secondaryBillingLine.includes(amountFromSecondary)
      ? presentation.secondaryBillingLine
          .slice(0, presentation.secondaryBillingLine.lastIndexOf(amountFromSecondary))
          .replace(/\s+at\s*$/i, "")
          .trim()
      : presentation.billingCadenceLine;
  return {
    amountLine,
    periodLine: periodFromBilledLine || periodLine,
    equivalentLine: presentation.primaryLine.startsWith("≈")
      ? presentation.primaryLine
      : `≈ ${presentation.primaryLine}`,
  };
}

export function pricingPlanCardClasses(
  planId: Exclude<Plan, "free">,
  isSelected: boolean,
): string {
  return [
    "pricing-living-card",
    planId === "yearly" ? "is-recommended" : "",
    isSelected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function pricingPlanPriceClasses(_planId: Exclude<Plan, "free">): string {
  return "pricing-living-amount";
}

export function formatStickyPriceSummary(
  plan: PlanCard,
  storePriceLabel?: string,
  store?: StorePlanPrice | null,
  labels?: PlanBillingLabels,
): { title: string; priceLine: string; billingLine: string } {
  const presentation = planPricePresentation(plan, { storePriceLabel, store, labels });
  const living = pricingLivingPriceDisplay(presentation);
  return {
    title: plan.title,
    priceLine: living.amountLine,
    billingLine: [living.periodLine, living.equivalentLine].filter(Boolean).join(" · "),
  };
}
