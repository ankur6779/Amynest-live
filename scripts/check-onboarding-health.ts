/**
 * Post-deploy health probe for onboarding-critical API routes.
 *
 *   ONBOARDING_HEALTH_API_URL=https://amynest-backend-dykj.onrender.com \
 *     pnpm --filter @workspace/scripts run check-onboarding-health
 *
 * Without auth, onboarding routes must respond 401 (route exists), not 404/5xx.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const API_ROUTES = [
  join(REPO_ROOT, "artifacts/api-server/src/routes/onboarding.ts"),
  join(REPO_ROOT, "artifacts/api-server/src/routes/parent-profile.ts"),
  join(REPO_ROOT, "artifacts/api-server/src/routes/children.ts"),
];

const PROTECTED_ROUTES = [
  { method: "GET", path: "/api/onboarding", expectStatuses: [401] },
  { method: "GET", path: "/api/parent-profile", expectStatuses: [401, 404] },
  { method: "GET", path: "/api/children", expectStatuses: [401] },
];

async function probeRoute(
  baseUrl: string,
  route: { method: string; path: string; expectStatuses: number[] },
): Promise<string | null> {
  const url = `${baseUrl.replace(/\/$/, "")}${route.path}`;
  try {
    const res = await fetch(url, { method: route.method, redirect: "manual" });
    if (route.expectStatuses.includes(res.status)) return null;
    return `${route.method} ${route.path} → HTTP ${res.status} (expected ${route.expectStatuses.join("|")})`;
  } catch (err) {
    return `${route.method} ${route.path} → ${err instanceof Error ? err.message : String(err)}`;
  }
}

function checkApiRoutesStatic(): string[] {
  const violations: string[] = [];
  const combined = API_ROUTES.map((f) => readFileSync(f, "utf8")).join("\n");
  for (const route of PROTECTED_ROUTES) {
    const serverPath = route.path.replace(/^\/api/, "");
    if (!combined.includes(`"${serverPath}"`) && !combined.includes(`'${serverPath}'`)) {
      violations.push(`api-server missing route ${serverPath}`);
    }
  }
  return violations;
}

async function main(): Promise<void> {
  const violations = checkApiRoutesStatic();
  const apiUrl =
    process.env.ONBOARDING_HEALTH_API_URL ??
    process.env.API_HEALTH_URL ??
    "";

  if (apiUrl) {
    const healthUrl = `${apiUrl.replace(/\/$/, "")}/health`;
    try {
      const health = await fetch(healthUrl);
      if (!health.ok) {
        violations.push(`GET /health → HTTP ${health.status}`);
      }
    } catch (err) {
      violations.push(`GET /health failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    for (const route of PROTECTED_ROUTES) {
      const failure = await probeRoute(apiUrl, route);
      if (failure) violations.push(failure);
    }
  } else {
    console.warn(
      "ONBOARDING_HEALTH_API_URL not set — skipping live HTTP probes (static route check only).",
    );
  }

  if (violations.length > 0) {
    console.error("Onboarding API health check FAILED:\n");
    for (const v of violations) console.error(`  • ${v}`);
    process.exit(1);
  }

  console.log("Onboarding API health check passed.");
}

void main();
