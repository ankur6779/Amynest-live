import type { Plan, PlanCard } from "@/hooks/use-subscription";
import { planPricePresentation, planSavingsLabel } from "@/lib/subscription-plans";
import type { PlanBillingLabels } from "@/lib/plan-price";
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

/** Visual badge prefix only — does not change marketing copy strings. */
export function planBadgeLabel(planId: Exclude<Plan, "free">, badge: string | null): string | null {
  if (!badge) return null;
  if (planId === "yearly") return `⭐ ${badge}`;
  if (planId === "six_month") return `✓ ${badge}`;
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

export function pricingPlanCardClasses(
  planId: Exclude<Plan, "free">,
  isSelected: boolean,
): string {
  const base =
    "relative w-full rounded-2xl border-2 text-left transition-all";

  if (planId === "yearly") {
    return [
      base,
      "order-first sm:order-none p-3.5 sm:p-4",
      isSelected
        ? "border-primary bg-primary/15 ring-2 ring-primary/45 shadow-[0_12px_36px_rgba(255,78,205,0.5)] scale-[1.02] sm:scale-[1.04] z-10"
        : "border-primary/55 bg-primary/10 shadow-[0_8px_28px_rgba(255,78,205,0.3)] scale-[1.01] sm:scale-[1.03] z-10",
    ].join(" ");
  }

  if (planId === "six_month") {
    return [
      base,
      "p-3 sm:p-4",
      isSelected
        ? "border-primary/70 bg-primary/8 shadow-[0_6px_20px_rgba(255,78,205,0.22)]"
        : "border-white/15 bg-white/6 hover:border-white/25",
    ].join(" ");
  }

  return [
    base,
    "p-3 sm:p-3.5 opacity-[0.82]",
    isSelected
      ? "border-white/20 bg-white/8 shadow-sm"
      : "border-white/8 bg-white/[0.03] hover:border-white/15",
  ].join(" ");
}

export function pricingPlanPriceClasses(planId: Exclude<Plan, "free">): string {
  if (planId === "yearly") return "text-2xl sm:text-3xl font-black text-white leading-tight";
  if (planId === "six_month") return "text-xl sm:text-2xl font-black text-white leading-tight";
  return "text-lg sm:text-xl font-bold text-white/90 leading-tight";
}

export function formatStickyPriceSummary(
  plan: PlanCard,
  storePriceLabel?: string,
  store?: StorePlanPrice | null,
  labels?: PlanBillingLabels,
): { title: string; priceLine: string; billingLine: string } {
  const presentation = planPricePresentation(plan, { storePriceLabel, store, labels });
  return {
    title: plan.title,
    priceLine: presentation.primaryLine,
    billingLine: presentation.secondaryBillingLine,
  };
}
