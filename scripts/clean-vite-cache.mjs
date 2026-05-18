#!/usr/bin/env node
/**
 * Remove Vite / Vitest / Tailwind dependency-prebundle caches.
 *
 * After `pnpm install`, hoisted package paths can change while
 * `node_modules/.vite` still references old chunk paths — e.g.
 * `vite/dist/node/chunks/dist.js` or `@tailwindcss/node` loader paths.
 * Symptom: "Meet Amy" splash shows, then blank screen / crash before onboarding.
 *
 * Usage:
 *   node scripts/clean-vite-cache.mjs
 *   node scripts/clean-vite-cache.mjs --package=kidschedule
 *   node scripts/clean-vite-cache.mjs --dist
 */
import { existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const VITE_PACKAGES = {
  kidschedule: "artifacts/kidschedule",
  splash: "artifacts/amynest-splash",
  reels: "artifacts/reels",
  "mockup-sandbox": "artifacts/mockup-sandbox",
};

const CACHE_RELATIVE = [
  "node_modules/.vite",
  "node_modules/.vitest",
  "node_modules/.cache/vite",
  "node_modules/.cache/tailwindcss",
];

const args = process.argv.slice(2);
const withDist = args.includes("--dist");
const packageArg = args.find((a) => a.startsWith("--package="));
const onlyPackage = packageArg?.split("=")[1];

function cleanDir(baseDir) {
  let removed = 0;
  for (const rel of CACHE_RELATIVE) {
    const full = join(baseDir, rel);
    if (!existsSync(full)) continue;
    rmSync(full, { recursive: true, force: true });
    console.log(`[clean-vite-cache] removed ${full}`);
    removed += 1;
  }
  if (withDist) {
    for (const distRel of ["dist", "dist/public"]) {
      const distPath = join(baseDir, distRel);
      if (!existsSync(distPath)) continue;
      rmSync(distPath, { recursive: true, force: true });
      console.log(`[clean-vite-cache] removed ${distPath}`);
      removed += 1;
    }
  }
  return removed;
}

function targets() {
  if (onlyPackage) {
    const rel = VITE_PACKAGES[onlyPackage];
    if (!rel) {
      console.error(
        `[clean-vite-cache] unknown package "${onlyPackage}" (known: ${Object.keys(VITE_PACKAGES).join(", ")})`,
      );
      process.exit(1);
    }
    return [join(repoRoot, rel)];
  }
  return [repoRoot, ...Object.values(VITE_PACKAGES).map((p) => join(repoRoot, p))];
}

let total = 0;
for (const dir of targets()) {
  total += cleanDir(dir);
}

if (withDist && !onlyPackage) {
  const turbo = join(repoRoot, ".turbo");
  if (existsSync(turbo)) {
    rmSync(turbo, { recursive: true, force: true });
    console.log(`[clean-vite-cache] removed ${turbo}`);
    total += 1;
  }
}

if (total === 0) {
  console.log("[clean-vite-cache] no stale caches found");
} else {
  console.log(
    `[clean-vite-cache] cleared ${total} path(s) — restart dev servers if they were running`,
  );
}
