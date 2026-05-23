import type { Plan, PlanCard } from "@/hooks/use-subscription";

/** Display price from API (formattedPrice) or derive from amount + currency. */
export function displayPlanPrice(
  plan: Pick<PlanCard, "price" | "currency" | "formattedPrice">,
): string {
  if (plan.formattedPrice) return plan.formattedPrice;
  if (plan.currency === "USD") return `$${plan.price.toFixed(2)}`;
  if (plan.currency === "INR") return `₹${plan.price}`;
  return `${plan.currency} ${plan.price}`;
}

/**
 * Prefer Google Play / App Store localized price when the native billing hook
 * has loaded store offerings (Play Store app, iOS Capacitor).
 */
export function resolvePlanPriceLabel(
  plan: Pick<PlanCard, "id" | "price" | "currency" | "formattedPrice">,
  storePriceByPlan?: Partial<Record<Exclude<Plan, "free">, string>>,
): string {
  const storePrice = storePriceByPlan?.[plan.id];
  if (storePrice) return storePrice;
  return displayPlanPrice(plan);
}
