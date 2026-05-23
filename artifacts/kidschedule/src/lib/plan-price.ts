import type { PlanCard } from "@/hooks/use-subscription";

/** Display price from API (formattedPrice) or derive from amount + currency. */
export function displayPlanPrice(
  plan: Pick<PlanCard, "price" | "currency" | "formattedPrice">,
): string {
  if (plan.formattedPrice) return plan.formattedPrice;
  if (plan.currency === "USD") return `$${plan.price.toFixed(2)}`;
  if (plan.currency === "INR") return `₹${plan.price}`;
  return `${plan.currency} ${plan.price}`;
}
