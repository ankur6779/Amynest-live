/**
 * RevenueCat period_type on INITIAL_PURCHASE.
 * TRIAL is a free trial start. It is not a paid purchase.
 * INTRO stays in the paid class because it is a billed introductory period.
 * A missing period_type is not proof of a trial.
 */
export type StorePurchaseClass = "trial" | "paid";

export function classifyRevenueCatInitialPurchase(
  periodType: string | null | undefined,
): StorePurchaseClass {
  const value = (periodType ?? "").trim().toUpperCase();
  if (value === "TRIAL") return "trial";
  return "paid";
}
