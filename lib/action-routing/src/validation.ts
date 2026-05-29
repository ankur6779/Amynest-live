import type { ActionTarget } from "./types.js";
import { ACTION_ROUTE_REGISTRY, LEGACY_PATH_TO_TARGET, SPA_ROUTE_PATTERNS } from "./registry.js";
import { NOTIFICATION_CATEGORY_TARGETS } from "./categories.js";

export interface ValidationIssue {
  code: string;
  message: string;
  target?: ActionTarget;
  category?: string;
  path?: string;
}

function patternMatchesRoute(pattern: string, path: string): boolean {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathBase = path.split("?")[0]?.split("#")[0] ?? path;
  const pathParts = pathBase.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((p, i) => p.startsWith(":") || p === pathParts[i]);
}

function pathMatchesSpaCatalog(path: string, catalog: readonly string[]): boolean {
  const base = path.split("?")[0]?.split("#")[0] ?? path;
  const hash = path.includes("#") ? path.slice(path.indexOf("#")) : "";
  for (const pattern of catalog) {
    const [patBase, patHash] = pattern.split("#");
    if (patHash && hash) {
      if (patternMatchesRoute(patBase ?? pattern, base) && hash.startsWith("#tile-")) return true;
      continue;
    }
    if (!patHash && patternMatchesRoute(pattern, base)) return true;
  }
  return false;
}

export function validateActionRouteRegistry(
  spaRoutes: readonly string[] = SPA_ROUTE_PATTERNS,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [target, def] of Object.entries(ACTION_ROUTE_REGISTRY) as [ActionTarget, typeof ACTION_ROUTE_REGISTRY[ActionTarget]][]) {
    if (!def.fallbackTarget || !ACTION_ROUTE_REGISTRY[def.fallbackTarget]) {
      issues.push({
        code: "invalid_fallback",
        message: `ActionTarget "${target}" has invalid fallbackTarget "${def.fallbackTarget}"`,
        target,
      });
    }
    const samplePath = def.path.replace(/:[a-zA-Z]+/g, "1");
    if (!pathMatchesSpaCatalog(samplePath, spaRoutes)) {
      issues.push({
        code: "orphan_route",
        message: `ActionTarget "${target}" path "${def.path}" not in SPA catalog`,
        target,
        path: def.path,
      });
    }
  }

  for (const [legacy, target] of Object.entries(LEGACY_PATH_TO_TARGET)) {
    if (!ACTION_ROUTE_REGISTRY[target]) {
      issues.push({
        code: "legacy_orphan",
        message: `Legacy path "${legacy}" maps to unknown target "${target}"`,
        path: legacy,
        target,
      });
    }
  }

  for (const [category, target] of Object.entries(NOTIFICATION_CATEGORY_TARGETS)) {
    if (!ACTION_ROUTE_REGISTRY[target]) {
      issues.push({
        code: "category_orphan",
        message: `Notification category "${category}" maps to unknown target "${target}"`,
        category,
        target,
      });
    }
  }

  return issues;
}

export function assertValidActionRouting(spaRoutes?: readonly string[]): void {
  const issues = validateActionRouteRegistry(spaRoutes);
  if (issues.length > 0) {
    const msg = issues.map((i) => `[${i.code}] ${i.message}`).join("\n");
    throw new Error(`Action routing validation failed:\n${msg}`);
  }
}
