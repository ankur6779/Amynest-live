/**
 * Continuity Room copy — remain present, never money-first.
 * Premium is not an upgrade — permission for Amy to continue caring.
 * Plans never compared. Relationships protected.
 * Success = reassurance only — no marketing, no feature list, no pricing.
 */

export const PREMIUM_SUCCESS_HEADLINE = "We're staying with Amy";

export const PREMIUM_SUCCESS_BODY =
  "Amy remains present with you. Come back whenever you need the next step.";

export const PREMIUM_ALREADY_HEADLINE = "Amy is already present";

export const PREMIUM_ALREADY_BODY =
  "Your relationship with Amy is already held. Come back whenever you need the next step.";

export const PREMIUM_OFFLINE_GENERAL =
  "You're offline right now. Connect to the internet, then try again.";

export const PREMIUM_OFFLINE_RESTORE =
  "We can't return you to your place while you're offline. Connect to the internet, then tap Try again.";

export const PREMIUM_OFFLINE_PURCHASE =
  "Amy can't stay present while you're offline. Connect to the internet, then try again.";

export const PREMIUM_OFFLINE_RETRY_LABEL = "Try again";

/**
 * Quiet how — SKU capability kept; never store period / price comparison.
 * Prices stay off Nest surface (store sheet after permission).
 */
export function buildContinuityPlanPlaceLabel(plan: {
  id: string;
  title: string;
  period?: string | null;
}): string {
  const period = (plan.period ?? "").toLowerCase();
  if (plan.id === "monthly" || period === "month") {
    return "Stay present · month by month";
  }
  if (plan.id === "yearly" || period === "year") {
    return "Stay present · through the year";
  }
  return plan.title;
}

/** Journey support — permission to continue caring, not upgrade. */
export function buildPremiumJourneySupport(
  name: string | null | undefined,
  concernLabel: string | null | undefined,
): string {
  const who = name?.trim() || null;
  const concern = concernLabel?.trim() || null;
  if (who && concern) {
    return `Permission for Amy to keep caring for ${who}'s ${concern} — the relationship you've already begun.`;
  }
  if (concern) {
    return `Permission for Amy to keep caring about your ${concern} — the relationship you've already begun.`;
  }
  if (who) {
    return `Permission for Amy to keep caring for ${who} — the relationship you've already begun.`;
  }
  return "Permission for Amy to keep caring — the relationship you've already begun.";
}
