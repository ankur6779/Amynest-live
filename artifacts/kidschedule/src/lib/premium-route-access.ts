export type PremiumRouteAccessState =
  | { kind: "loading" }
  | { kind: "retry" }
  | { kind: "allowed" }
  | { kind: "denied" };

/**
 * Fail-closed premium route gate.
 * Never returns "allowed" without confirmed entitlements granting access.
 */
export function resolvePremiumRouteAccess(input: {
  hasPremiumRoute: boolean;
  entitlementsResolved: boolean;
  accessKey: string | undefined;
  entitlements: Record<string, boolean> | null | undefined;
  loadingTimedOut: boolean;
}): PremiumRouteAccessState {
  if (!input.hasPremiumRoute) return { kind: "allowed" };

  if (!input.entitlementsResolved) {
    return input.loadingTimedOut ? { kind: "retry" } : { kind: "loading" };
  }

  if (input.accessKey && input.entitlements?.[input.accessKey] === true) {
    return { kind: "allowed" };
  }

  return { kind: "denied" };
}
