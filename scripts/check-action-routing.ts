/**
 * check-action-routing.ts — CI gate: every ActionTarget and notification category must resolve to a valid SPA route.
 *
 * Run: pnpm run check:action-routing
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidActionRouting,
  validateActionRouteRegistry,
  resolveDeepLinkPath,
  NOTIFICATION_CATEGORY_TARGETS,
} from "../lib/action-routing/src/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_CORE = join(__dirname, "../artifacts/kidschedule/src/AppCore.tsx");

function extractSpaRoutesFromAppCore(): string[] {
  const src = readFileSync(APP_CORE, "utf8");
  const routes = new Set<string>();
  const re = /<Route\s+path="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const p = m[1]!;
    if (!p.includes(":") || p.includes(":id") || p.includes(":code") || p.includes(":routineId")) {
      routes.add(p.startsWith("/") ? p : `/${p}`);
    }
  }
  routes.add("/parenting-hub#tile-story-hub");
  routes.add("/parenting-hub#tile-phonics");
  return [...routes];
}

function main(): void {
  const spaRoutes = extractSpaRoutesFromAppCore();
  const issues = validateActionRouteRegistry(spaRoutes);

  const brokenCategories: string[] = [];
  for (const cat of Object.keys(NOTIFICATION_CATEGORY_TARGETS)) {
    const resolved = resolveDeepLinkPath("", cat);
    const base = resolved.path.split("?")[0]?.split("#")[0] ?? resolved.path;
    const ok =
      spaRoutes.some((r) => {
        const rBase = r.split("#")[0];
        return rBase === base || r === resolved.path;
      }) ||
      resolved.path.startsWith("/parenting-hub#");
    if (!ok) brokenCategories.push(`${cat} -> ${resolved.path}`);
  }

  if (issues.length > 0 || brokenCategories.length > 0) {
    console.error("\n[check:action-routing] FAILED\n");
    for (const i of issues) console.error(`  [${i.code}] ${i.message}`);
    for (const b of brokenCategories) console.error(`  [category] ${b}`);
    process.exit(1);
  }

  assertValidActionRouting(spaRoutes);
  console.log(`[check:action-routing] OK — ${spaRoutes.length} SPA routes, ${Object.keys(NOTIFICATION_CATEGORY_TARGETS).length} notification categories`);
}

main();
