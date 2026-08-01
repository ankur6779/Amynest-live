import { V2_ROUTE_REGISTRY } from "./catalog";
import { V2_ROUTE_REDIRECTS } from "./redirects";
import type { RouteRegistryEntry } from "./types";

export type RouteRegistryValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

const REQUIRED_MVP_PATHS = [
  "/today",
  "/ask-amy",
  "/for-child",
  "/front-door",
  "/speech-coach",
  "/talking-amy",
  "/dashboard",
  "/parenting-hub",
  "/assistant",
] as const;

export function validateRouteRegistry(
  entries: readonly RouteRegistryEntry[] = V2_ROUTE_REGISTRY,
): RouteRegistryValidationIssue[] {
  const issues: RouteRegistryValidationIssue[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry.path.startsWith("/")) {
      issues.push({
        code: "invalid_path",
        message: `Path must start with /: ${entry.path}`,
        path: entry.path,
      });
    }
    if (!entry.owner) {
      issues.push({
        code: "missing_owner",
        message: `Route missing owner: ${entry.path}`,
        path: entry.path,
      });
    }
    if (seen.has(entry.path)) {
      issues.push({
        code: "duplicate_path",
        message: `Duplicate route path: ${entry.path}`,
        path: entry.path,
      });
    }
    seen.add(entry.path);

    if (
      (entry.lifecycle === "redirect" ||
        entry.lifecycle === "alias" ||
        entry.lifecycle === "deprecated" ||
        entry.lifecycle === "archived_experience") &&
      !entry.redirectTo
    ) {
      issues.push({
        code: "missing_redirect",
        message: `Lifecycle ${entry.lifecycle} requires redirectTo: ${entry.path}`,
        path: entry.path,
      });
    }
  }

  for (const required of REQUIRED_MVP_PATHS) {
    if (!seen.has(required)) {
      issues.push({
        code: "missing_mvp_route",
        message: `MVP route missing from registry: ${required}`,
        path: required,
      });
    }
  }

  const dashboard = V2_ROUTE_REDIRECTS.find((r) => r.from === "/dashboard");
  if (!dashboard || dashboard.to !== "/today") {
    issues.push({
      code: "redirect_map",
      message: "Redirect map must include /dashboard → /today",
      path: "/dashboard",
    });
  }

  const hub = V2_ROUTE_REDIRECTS.find((r) => r.from === "/parenting-hub");
  if (!hub || hub.to !== "/for-child") {
    issues.push({
      code: "redirect_map",
      message: "Redirect map must include /parenting-hub → /for-child",
      path: "/parenting-hub",
    });
  }

  return issues;
}

export function assertRouteRegistryValid(
  entries: readonly RouteRegistryEntry[] = V2_ROUTE_REGISTRY,
): void {
  const issues = validateRouteRegistry(entries);
  if (issues.length > 0) {
    const detail = issues.map((i) => `${i.code}: ${i.message}`).join("\n");
    throw new Error(`Route Registry validation failed:\n${detail}`);
  }
}
