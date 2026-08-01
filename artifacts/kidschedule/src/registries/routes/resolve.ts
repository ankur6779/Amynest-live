import { getRouteEntry } from "./catalog";
import { getRedirectTarget } from "./redirects";

export type ResolvedRoute = {
  requested: string;
  canonical: string;
  redirected: boolean;
  owner: string | null;
  featureId: string | null;
};

/**
 * Resolve a path against the registry redirect map (data-only; no navigation).
 * Unknown paths fall back to /today per Migration Blueprint (no orphan rule).
 */
export function resolveRegisteredRoute(path: string): ResolvedRoute {
  const redirectTo = getRedirectTarget(path);
  if (redirectTo) {
    const target = getRouteEntry(redirectTo);
    return {
      requested: path,
      canonical: redirectTo,
      redirected: true,
      owner: target?.owner ?? null,
      featureId: target?.featureId ?? null,
    };
  }

  const entry = getRouteEntry(path);
  if (entry?.redirectTo) {
    const target = getRouteEntry(entry.redirectTo);
    return {
      requested: path,
      canonical: entry.redirectTo,
      redirected: true,
      owner: target?.owner ?? entry.owner,
      featureId: target?.featureId ?? entry.featureId,
    };
  }

  if (entry) {
    return {
      requested: path,
      canonical: entry.path,
      redirected: false,
      owner: entry.owner,
      featureId: entry.featureId,
    };
  }

  return {
    requested: path,
    canonical: "/today",
    redirected: true,
    owner: "today",
    featureId: "today",
  };
}
