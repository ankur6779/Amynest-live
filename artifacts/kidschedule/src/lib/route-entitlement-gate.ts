/**
 * Entitlement decisions for route guards that use a loading-shell timeout.
 *
 * Loading shells must never fail-open into paid content when entitlement /
 * journey state is still unknown after the timeout.
 */

/** True only when entitlements explicitly grant the premium access key. */
export function isPremiumRouteAccessGranted(
  entitlements: Record<string, unknown> | null | undefined,
  accessKey: string,
): boolean {
  return entitlements?.[accessKey] === true;
}

/**
 * After a learning-journey load timeout with no access payload, keep the
 * route locked for non-premium users (fail closed).
 */
export function shouldFailClosedLearningJourneyOnTimeout(input: {
  gateTimedOut: boolean;
  hasAccess: boolean;
}): boolean {
  return input.gateTimedOut && !input.hasAccess;
}
