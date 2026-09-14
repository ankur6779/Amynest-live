/**
 * Frontend premium-route decision helper.
 * UNKNOWN and missing flags are DENY — never fail-open to premium UI.
 */
export type PremiumAccessDecision = "ALLOW" | "DENY" | "UNKNOWN";

export function decidePremiumRouteAccess(input: {
  flag: boolean | null | undefined;
  entitlementsResolved: boolean;
  timedOut?: boolean;
}): PremiumAccessDecision {
  if (input.flag === true) {
    return input.entitlementsResolved ? "ALLOW" : "UNKNOWN";
  }
  if (input.flag === false) return "DENY";
  if (!input.entitlementsResolved && !input.timedOut) return "UNKNOWN";
  return "DENY";
}

export function decideLearningJourneyAccess(input: {
  isPremium: boolean;
  journeyLocked: boolean;
  hasJourneyAccess: boolean;
  hasChild: boolean;
  timedOut: boolean;
  journeyError?: boolean;
}): PremiumAccessDecision {
  if (input.isPremium) return "ALLOW";
  if (input.journeyLocked) return "DENY";
  if (input.hasJourneyAccess) return "ALLOW";
  if (input.hasChild && (input.timedOut || input.journeyError)) return "DENY";
  if (!input.hasChild) return "ALLOW";
  return "UNKNOWN";
}
