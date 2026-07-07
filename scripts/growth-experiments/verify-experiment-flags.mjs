#!/usr/bin/env node
/**
 * Phase 0 — verify growth experiment flags are isolated and default OFF.
 *
 * Usage: node scripts/growth-experiments/verify-experiment-flags.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const kidschedule = join(repoRoot, "artifacts/kidschedule/src");

const FLAGS = [
  {
    env: "VITE_FF_VALUE_BRIDGE_INVITES",
    exportName: "FF_VALUE_BRIDGE_INVITES",
    module: "lib/subscription-feature-flags.ts",
    consumers: [
      "lib/value-bridge.ts",
      "components/subscription-value-bridge-banner.tsx",
    ],
    forbiddenImports: ["dashboard-feature-flags", "dashboard-priority"],
  },
  {
    env: "VITE_FF_DASHBOARD_PRIORITY_ORDER",
    exportName: "FF_DASHBOARD_PRIORITY_ORDER",
    module: "lib/dashboard-feature-flags.ts",
    consumers: ["pages/dashboard.tsx", "lib/dashboard-priority.ts"],
    forbiddenImports: ["value-bridge", "subscription-feature-flags"],
  },
];

function read(rel) {
  const path = join(kidschedule, rel);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function assertDefaultFalse(moduleRel, exportName, envKey) {
  const src = read(moduleRel);
  if (!src) return { ok: false, detail: `missing module ${moduleRel}` };
  const re = new RegExp(
    `export const ${exportName} = envFlag\\(\\s*"${envKey}",\\s*(false|true)`,
  );
  const m = src.match(re);
  if (!m) return { ok: false, detail: `could not parse default for ${exportName}` };
  if (m[1] !== "false") {
    return { ok: false, detail: `${exportName} default is ${m[1]}, expected false` };
  }
  return { ok: true, detail: "default false" };
}

function assertNoCrossImports(flag, otherModules) {
  const issues = [];
  for (const consumer of flag.consumers) {
    const src = read(consumer);
    if (!src) continue;
    for (const forbidden of flag.forbiddenImports) {
      if (src.includes(forbidden)) {
        issues.push(`${consumer} imports forbidden ${forbidden}`);
      }
    }
    for (const other of otherModules) {
      if (src.includes(other.exportName) && consumer !== other.module) {
        issues.push(`${consumer} references ${other.exportName}`);
      }
    }
  }
  const prioritySrc = read("lib/dashboard-priority.ts");
  if (prioritySrc && flag.env.includes("DASHBOARD")) {
    if (prioritySrc.includes("FF_VALUE_BRIDGE") || prioritySrc.includes("value-bridge.ts")) {
      issues.push("dashboard-priority imports value-bridge flag");
    }
  }
  const bridgeSrc = read("lib/value-bridge.ts");
  if (bridgeSrc && flag.env.includes("VALUE_BRIDGE")) {
    if (bridgeSrc.includes("FF_DASHBOARD") || bridgeSrc.includes("dashboard-priority")) {
      issues.push("value-bridge imports dashboard flag");
    }
  }
  return issues;
}

function main() {
  const results = [];
  let failed = false;

  for (const flag of FLAGS) {
    const others = FLAGS.filter((f) => f.env !== flag.env);
    const modExists = existsSync(join(kidschedule, flag.module));
    const defaultCheck = assertDefaultFalse(flag.module, flag.exportName, flag.env);
    const cross = assertNoCrossImports(flag, others);

    const row = {
      env: flag.env,
      module: flag.module,
      moduleExists: modExists,
      defaultFalse: defaultCheck.ok,
      defaultDetail: defaultCheck.detail,
      crossImportIssues: cross,
      isolated: modExists && defaultCheck.ok && cross.length === 0,
    };
    results.push(row);
    if (!row.isolated) failed = true;
  }

  const report = {
    verifiedAt: new Date().toISOString(),
    phase: 0,
    rule: "Experiments must not share flag modules or cross-import logic",
    flags: results,
    pass: !failed,
  };

  console.log(JSON.stringify(report, null, 2));
  if (failed) {
    console.error("\nPhase 0 FAILED — fix isolation before enabling experiments.");
    process.exit(1);
  }
  console.log("\nPhase 0 PASSED — flags exist, default false, isolated.");
}

main();
