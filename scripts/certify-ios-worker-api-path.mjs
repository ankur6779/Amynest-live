#!/usr/bin/env node
/**
 * Certification gate for iOS Capacitor → Cloudflare Worker API migration.
 * Does NOT deploy. Run before shipping a new iOS build or Worker deploy.
 *
 *   node scripts/certify-ios-worker-api-path.mjs
 *   node scripts/certify-ios-worker-api-path.mjs --probe   # live HEAD checks
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROBE = process.argv.includes("--probe");
const WORKER_ORIGIN = "https://www.amynest.in";
const LEGACY_DIRECT_ORIGIN =
  "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io";

const checks = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`✅ PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
  console.error(`❌ FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("=== iOS Capacitor → Cloudflare Worker API certification ===\n");

// 1. Unit tests
const vitest = spawnSync(
  "pnpm",
  ["--filter", "@workspace/kidschedule", "exec", "vitest", "run", "src/lib/api-origin.test.ts"],
  { cwd: root, stdio: "pipe", encoding: "utf8" },
);
if (vitest.status === 0) {
  pass("Vitest api-origin.test.ts");
} else {
  fail("Vitest api-origin.test.ts", vitest.stderr?.slice(0, 400) || vitest.stdout?.slice(0, 400));
}

// 2. Source: native production uses worker origin
const apiTs = read("artifacts/kidschedule/src/lib/api.ts");
if (
  apiTs.includes("resolveProductionWorkerApiOrigin") &&
  apiTs.includes("isNativeAmyNestShell() && workerOrigin")
) {
  pass("getAppApiBaseOrigin routes native production shells to Worker origin");
} else {
  fail("getAppApiBaseOrigin missing native → Worker routing");
}

// 3. Instrumentation headers
if (
  apiTs.includes('headers.set("x-amynest-api-path", "worker")') &&
  apiTs.includes('headers.set("x-amynest-platform", "ios")')
) {
  pass("Instrumentation headers defined (x-amynest-platform, x-amynest-api-path)");
} else {
  fail("Instrumentation headers missing in api.ts");
}

if (read("artifacts/kidschedule/src/lib/api-logger.ts").includes("mergeAmyNestApiClientHeaders")) {
  pass("loggedFetch applies client headers");
} else {
  fail("loggedFetch does not apply mergeAmyNestApiClientHeaders");
}

// 4. Worker CORS for Capacitor
const workerJs = read("infra/cloudflare/amynest-api-proxy/src/worker.js");
if (
  workerJs.includes("capacitor://localhost") &&
  workerJs.includes("resolveAccessControlOrigin")
) {
  pass("Worker CORS reflects Capacitor native origins");
} else {
  fail("Worker missing Capacitor CORS handling — iOS fetch will fail cross-origin");
}

// 5. OTA defaults
const otaPatch = read("artifacts/amynest-capacitor/scripts/patch-capacitor-ota-config.mjs");
if (otaPatch.includes(WORKER_ORIGIN) && !otaPatch.includes(LEGACY_DIRECT_ORIGIN)) {
  pass("OTA patch script defaults to Worker origin");
} else {
  fail("OTA patch script still defaults to direct Coolify origin");
}

const capConfig = read("artifacts/amynest-capacitor/capacitor.config.json");
if (capConfig.includes(`${WORKER_ORIGIN}/api/app/ota/check`)) {
  pass("capacitor.config.json OTA check URL uses Worker");
} else {
  fail("capacitor.config.json OTA check URL not migrated");
}

const manifest = read("artifacts/api-server/ota/manifest.production.json");
if (manifest.includes(`${WORKER_ORIGIN}/api/app/ota/bundle/`)) {
  pass("OTA manifest bundleUrl uses Worker");
} else {
  fail("OTA manifest bundleUrl not on Worker origin");
}

// 6. build-web.mjs bakes VITE_APP_API_ORIGIN
const buildWeb = read("artifacts/amynest-capacitor/scripts/build-web.mjs");
if (buildWeb.includes("VITE_APP_API_ORIGIN") && buildWeb.includes(WORKER_ORIGIN)) {
  pass("build-web.mjs embeds VITE_APP_API_ORIGIN for iOS builds");
} else {
  fail("build-web.mjs missing VITE_APP_API_ORIGIN for iOS");
}

// 7. Optional live probes (Worker deployed with CORS fix)
if (PROBE) {
  console.log("\n--- Live probes (requires network) ---\n");
  try {
    const health = await fetch(`${WORKER_ORIGIN}/api/healthz/audio`, { method: "HEAD" });
    if (health.headers.get("server")?.includes("cloudflare")) {
      pass("Live: API reachable via Worker", WORKER_ORIGIN);
    } else {
      fail("Live: unexpected server header on Worker API");
    }

    const ota = await fetch(`${WORKER_ORIGIN}/api/app/ota/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "ios", version_build: "99" }),
    });
    if (ota.ok) {
      pass("Live: OTA check via Worker", `HTTP ${ota.status}`);
    } else {
      fail("Live: OTA check via Worker", `HTTP ${ota.status}`);
    }

    const corsProbe = await fetch(`${WORKER_ORIGIN}/api/healthz/audio`, {
      method: "HEAD",
      headers: { Origin: "capacitor://localhost" },
    });
    const acao = corsProbe.headers.get("access-control-allow-origin");
    if (acao === "capacitor://localhost") {
      pass("Live: Worker reflects Capacitor Origin for CORS");
    } else {
      fail(
        "Live: Worker CORS for Capacitor",
        `ACAO=${acao ?? "missing"} (deploy Worker CORS fix before iOS ship)`,
      );
    }
  } catch (err) {
    fail("Live probes", err instanceof Error ? err.message : String(err));
  }
} else {
  console.log("\nℹ️  Run with --probe for live Worker/CORS checks (after Worker deploy).\n");
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n=== Result: ${failed.length === 0 ? "CERTIFIED PASS" : "CERTIFIED FAIL"} ===`);
console.log(`Checks: ${checks.length - failed.length}/${checks.length} passed\n`);

if (failed.length > 0) {
  process.exit(1);
}
