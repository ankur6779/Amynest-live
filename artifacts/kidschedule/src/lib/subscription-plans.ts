import type { Plan, PlanCard } from "@/hooks/use-subscription";
import {
  buildPlanPricePresentation,
  getMonthlyEquivalent,
  type StorePlanPrice,
} from "@/lib/plan-price";
import {
  FF_ANNUAL_DEFAULT_REPEAT,
  FF_ANNUAL_FIRST_PLAN_ORDER,
} from "@/lib/subscription-feature-flags";

export { getMonthlyEquivalent } from "@/lib/plan-price";
export type { StorePlanPrice, PlanPricePresentation } from "@/lib/plan-price";
import { getPaywallVisitCount } from "@/lib/subscription-funnel-storage";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

export const PLAN_DISPLAY_ORDER: Exclude<Plan, "free">[] = [
  "yearly",
  "six_month",
  "monthly",
];

export function sortPlanCards(
  plans: PlanCard[],
  annualFirst = FF_ANNUAL_FIRST_PLAN_ORDER,
): PlanCard[] {
  if (!annualFirst) return plans;
  const order = new Map(PLAN_DISPLAY_ORDER.map((id, i) => [id, i]));
  return [...plans].sort(
    (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99),
  );
}

/** Hub journey entry always defaults to annual. */
export function isHubJourneyReason(reason?: string): boolean {
  return reason === "hub_journey";
}

/** Tracks annual pre-selection for hub journey surfaces (once per call site). */
export function trackHubJourneyAnnualSelected(source: string): void {
  trackSubscriptionEvent({
    event: "annual_selected",
    plan: "yearly",
    source,
    reason: "hub_journey",
  });
}

/** First visit → six_month; second+ → yearly when flag on; hub_journey → yearly. */
export function resolveDefaultPlanId(
  visitCount = getPaywallVisitCount(),
  reason?: string,
): Exclude<Plan, "free"> {
  if (isHubJourneyReason(reason)) {
    return "yearly";
  }
  if (FF_ANNUAL_DEFAULT_REPEAT && visitCount >= 2) {
    trackSubscriptionEvent({
      event: "annual_default_shown",
      plan: "yearly",
      extra: { visitCount },
    });
    return "yearly";
  }
  return "six_month";
}

/** Build full price presentation (primary → equivalent → cadence) from live/API amounts. */
export function planPricePresentation(
  plan: PlanCard,
  options?: {
    storePriceLabel?: string;
    store?: StorePlanPrice | null;
  },
) {
  return buildPlanPricePresentation(plan, options);
}

export function annualSavingsLabel(plan: PlanCard): string | null {
  if (plan.id !== "yearly") return null;
  if (typeof plan.savingsPercent === "number" && plan.savingsPercent > 0) {
    return `Save ~${plan.savingsPercent}%`;
  }
  return "Save ~33%";
}

export function isAnnualHighlightedPlan(planId: Exclude<Plan, "free">): boolean {
  return planId === "yearly";
}

export function trackPlanSelected(
  plan: Exclude<Plan, "free">,
  source: string,
  reason?: string,
): void {
  trackSubscriptionEvent({
    event: "plan_selected",
    plan,
    source,
    reason,
  });
  if (plan === "yearly") {
    trackSubscriptionEvent({ event: "annual_selected", plan, source, reason });
  }
}
