/**
 * Regression gate — permanent phonics route + data guards (chunk-split + symbol crash).
 *
 *   pnpm --filter @workspace/scripts run check-phonics-route-gate
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const KS = join(REPO_ROOT, "artifacts/kidschedule");

type GateResult = { id: string; ok: boolean; detail?: string };

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

function fileExists(rel: string): boolean {
  try {
    statSync(join(REPO_ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

function checkBuildTimeMeta(): GateResult {
  const metaPath = "artifacts/kidschedule/src/data/phonics-audio-map-meta.ts";
  if (!fileExists(metaPath)) {
    return { id: "meta_file", ok: false, detail: "Missing phonics-audio-map-meta.ts — run gen-phonics-audio-map-meta.mjs" };
  }
  const content = read(metaPath);
  const match = content.match(/PHONICS_BUNDLED_ASSET_COUNT\s*=\s*(\d+)/);
  const count = match ? Number(match[1]) : 0;
  if (count < 100) {
    return { id: "meta_count", ok: false, detail: `PHONICS_BUNDLED_ASSET_COUNT=${count} (need >= 100)` };
  }
  return { id: "meta_count", ok: true, detail: `${count} bundled assets in build-time meta` };
}

function checkPrebuildGeneratesMeta(): GateResult {
  const pkg = read("artifacts/kidschedule/package.json");
  if (!pkg.includes("gen-phonics-audio-map-meta.mjs")) {
    return { id: "prebuild_meta", ok: false, detail: "kidschedule prebuild must run gen-phonics-audio-map-meta.mjs" };
  }
  return { id: "prebuild_meta", ok: true };
}

function checkSyncRouteGate(): GateResult {
  const validation = read("artifacts/kidschedule/src/lib/phonics-manifest-validation.ts");
  if (!validation.includes("isPhonicsBundledManifestShipped()")) {
    return {
      id: "sync_route_gate",
      ok: false,
      detail: "isPhonicsModuleAvailable must use isPhonicsBundledManifestShipped (build-time meta)",
    };
  }
  if (validation.includes("getPhonicsManifestValidation().assetCount")) {
    return {
      id: "sync_route_gate",
      ok: false,
      detail: "isPhonicsModuleAvailable must not depend on async manifest validation cache",
    };
  }
  return { id: "sync_route_gate", ok: true };
}

function checkPhonicsPageNoAsyncBlock(): GateResult {
  const page = read("artifacts/kidschedule/src/pages/phonics.tsx");
  if (page.includes("manifestLoaded") || page.includes("setPhonicsAvailable")) {
    return {
      id: "phonics_page_async",
      ok: false,
      detail: "phonics.tsx must not block on async manifestLoaded/phonicsAvailable state",
    };
  }
  if (!page.includes("isPhonicsModuleAvailable()")) {
    return { id: "phonics_page_async", ok: false, detail: "phonics.tsx must gate with isPhonicsModuleAvailable()" };
  }
  return { id: "phonics_page_async", ok: true };
}

function checkBundledManifestLoader(): GateResult {
  const loader = read("artifacts/kidschedule/src/lib/phonics-bundled-manifest.ts");
  if (!loader.includes("record.default ?? record")) {
    return {
      id: "manifest_loader",
      ok: false,
      detail: "phonics-bundled-manifest must parse JSON via default ?? record (Vite chunk compat)",
    };
  }
  if (!loader.includes("__amynestPhonicsBundledManifest")) {
    return {
      id: "manifest_loader",
      ok: false,
      detail: "phonics-bundled-manifest must cache on globalThis for split chunks",
    };
  }
  return { id: "manifest_loader", ok: true };
}

function checkHookSanitize(): GateResult {
  const hook = read("artifacts/kidschedule/src/hooks/use-phonics-data.ts");
  const count = (hook.match(/sanitizeDisplayPhonicsItems/g) ?? []).length;
  if (count < 3) {
    return {
      id: "hook_sanitize",
      ok: false,
      detail: "use-phonics-data must sanitize API/fallback rows and final items/dailyItems",
    };
  }
  if (!hook.includes("items = sanitizeDisplayPhonicsItems(items)")) {
    return { id: "hook_sanitize", ok: false, detail: "use-phonics-data must sanitize final items before return" };
  }
  return { id: "hook_sanitize", ok: true };
}

function checkJourneyHabitSanitize(): GateResult {
  const habit = read("artifacts/kidschedule/src/lib/phonics-journey-habit.ts");
  if (!habit.includes("sanitizeDisplayPhonicsItems(items)")) {
    return {
      id: "habit_infer_today",
      ok: false,
      detail: "inferTodayFromProgress must sanitize items before reading .symbol",
    };
  }
  return { id: "habit_infer_today", ok: true };
}

function runGate(): void {
  const results: GateResult[] = [
    checkBuildTimeMeta(),
    checkPrebuildGeneratesMeta(),
    checkSyncRouteGate(),
    checkPhonicsPageNoAsyncBlock(),
    checkBundledManifestLoader(),
    checkHookSanitize(),
    checkJourneyHabitSanitize(),
  ];

  console.log("\n[check:phonics-route-gate]\n");
  for (const r of results) {
    const icon = r.ok ? "✔" : "✗";
    console.log(`  ${icon} [${r.id}]${r.detail ? ` ${r.detail}` : ""}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);

  if (failed.length > 0) {
    console.error("[check:phonics-route-gate] FAIL — permanent phonics route guards regressed.\n");
    process.exit(1);
  }
  console.log("[check:phonics-route-gate] PASS\n");
}

runGate();
