import type { RouteRiskEntry } from "./types.js";

/**
 * Route risk heatmap — historic crash weighting (playbook + incident history).
 * Live crash_events aggregates augment when DATABASE_URL is set.
 */
const STATIC_ROUTE_RISK: RouteRiskEntry[] = [
  {
    route: "/children/:id",
    historicCrashes: 120,
    p0Incidents: 4,
    affectedUsers: 85,
    releaseRisk: "CRITICAL",
    modifiedInRelease: false,
  },
  {
    route: "/children/new",
    historicCrashes: 15,
    p0Incidents: 1,
    affectedUsers: 12,
    releaseRisk: "HIGH",
    modifiedInRelease: false,
  },
  {
    route: "/dashboard",
    historicCrashes: 45,
    p0Incidents: 2,
    affectedUsers: 40,
    releaseRisk: "HIGH",
    modifiedInRelease: false,
  },
  {
    route: "/routines",
    historicCrashes: 30,
    p0Incidents: 1,
    affectedUsers: 25,
    releaseRisk: "MEDIUM",
    modifiedInRelease: false,
  },
  {
    route: "/onboarding",
    historicCrashes: 20,
    p0Incidents: 1,
    affectedUsers: 18,
    releaseRisk: "MEDIUM",
    modifiedInRelease: false,
  },
  {
    route: "/profile",
    historicCrashes: 8,
    p0Incidents: 0,
    affectedUsers: 6,
    releaseRisk: "LOW",
    modifiedInRelease: false,
  },
];

const CORE_ROUTE_PREFIXES = [
  "/children",
  "/dashboard",
  "/routines",
  "/onboarding",
  "/profile",
  "/hub",
];

export function buildRouteRiskHeatmap(input: {
  changedRoutes?: string[];
  changedFiles?: string[];
}): RouteRiskEntry[] {
  const modifiedRoutes = new Set<string>();

  for (const route of input.changedRoutes ?? []) {
    modifiedRoutes.add(route);
  }

  for (const file of input.changedFiles ?? []) {
    if (file.includes("children/form") || file.includes("children/")) {
      modifiedRoutes.add("/children/:id");
    }
    if (file.includes("dashboard")) modifiedRoutes.add("/dashboard");
    if (file.includes("routines/")) modifiedRoutes.add("/routines");
    if (file.includes("onboarding")) modifiedRoutes.add("/onboarding");
    if (file.includes("profile")) modifiedRoutes.add("/profile");
  }

  return STATIC_ROUTE_RISK.map((entry) => ({
    ...entry,
    modifiedInRelease: [...modifiedRoutes].some(
      (r) => entry.route.startsWith(r.replace(/:.*/, "")) || r === entry.route,
    ),
  })).sort((a, b) => b.p0Incidents - a.p0Incidents || b.historicCrashes - a.historicCrashes);
}

export function isCoreRoute(route: string): boolean {
  return CORE_ROUTE_PREFIXES.some((p) => route.startsWith(p));
}

export async function augmentRouteHeatmapFromDb(
  heatmap: RouteRiskEntry[],
): Promise<RouteRiskEntry[]> {
  if (!process.env.DATABASE_URL) return heatmap;
  try {
    const { aggregateCrashFingerprints } = await import(
      "../crash-intelligence/aggregation-service.js"
    );
    const aggregates = await aggregateCrashFingerprints(50);
    return heatmap.map((entry) => {
      const related = aggregates.filter((a) =>
        a.affectedRoutes.some((r) => r.startsWith(entry.route.replace(/:.*/, ""))),
      );
      if (related.length === 0) return entry;
      const count7d = related.reduce((s, a) => s + a.count7d, 0);
      const users = related.reduce((s, a) => s + a.affectedUsers, 0);
      const p0 = related.filter((a) => a.severity === "P0").length;
      return {
        ...entry,
        historicCrashes: Math.max(entry.historicCrashes, count7d),
        affectedUsers: Math.max(entry.affectedUsers, users),
        p0Incidents: Math.max(entry.p0Incidents, p0),
      };
    });
  } catch {
    return heatmap;
  }
}
