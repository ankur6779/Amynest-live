#!/usr/bin/env node
/**
 * Zip Capacitor www/ for Apple-compliant OTA (patch-only web bundle).
 *
 * Usage:
 *   node scripts/publish-ota-bundle.mjs --version 1.0.1
 *   node scripts/publish-ota-bundle.mjs --version 1.0.1 --bundle-url https://cdn.example.com/ota/1.0.1.zip
 *
 * Outputs:
 *   ota-bundles/amynest-www-1.0.1.zip
 *   Updates ../../api-server/ota/manifest.production.json (checksum, version, url)
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const capRoot = resolve(__dirname, "..");
const wwwDir = resolve(capRoot, "www");
const outDir = resolve(capRoot, "ota-bundles");
const manifestPath = resolve(capRoot, "../api-server/ota/manifest.production.json");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const version = arg("--version");
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: publish-ota-bundle.mjs --version X.Y.Z [--bundle-url https://...]");
  process.exit(1);
}

if (!existsSync(wwwDir)) {
  console.error(`❌  Missing ${wwwDir} — run pnpm run build:web first.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const zipPath = resolve(outDir, `amynest-www-${version}.zip`);

console.log(`📦  Zipping www → ${zipPath}`);
const zip = spawnSync("zip", ["-r", "-q", zipPath, "."], { cwd: wwwDir, stdio: "inherit" });
if (zip.status !== 0) {
  console.error("❌  zip failed — install zip CLI or zip manually.");
  process.exit(zip.status ?? 1);
}

const buf = readFileSync(zipPath);
const checksum = createHash("sha256").update(buf).digest("hex");
const PRODUCTION_WORKER_API_ORIGIN = "https://www.amynest.in";

const apiOrigin =
  arg("--api-origin")?.replace(/\/$/, "") ||
  process.env.VITE_APP_API_ORIGIN?.replace(/\/$/, "") ||
  PRODUCTION_WORKER_API_ORIGIN;

const bundleUrl =
  arg("--bundle-url") ||
  `${apiOrigin}/api/app/ota/bundle/amynest-www-${version}.zip`;

const bundlesDir = resolve(capRoot, "../api-server/ota/bundles");
mkdirSync(bundlesDir, { recursive: true });
const apiBundlePath = resolve(bundlesDir, `amynest-www-${version}.zip`);
copyFileSync(zipPath, apiBundlePath);
console.log(`📋  Copied → ${apiBundlePath}`);

if (!existsSync(manifestPath)) {
  console.log(`✅  Bundle: ${zipPath}`);
  console.log(`   sha256: ${checksum}`);
  console.log(`   Upload to: ${bundleUrl}`);
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const enableOta = process.argv.includes("--enable");
manifest.enabled = enableOta;
manifest.bundleVersion = version;
manifest.bundleUrl = bundleUrl;
manifest.checksum = checksum;
manifest.policy = "patch-only";
manifest.minNativeBuild = Number(arg("--min-native-build") ?? manifest.minNativeBuild ?? 1);
manifest.releaseNotes =
  arg("--release-notes") ?? manifest.releaseNotes ?? `Web patch ${version}`;
if (!Array.isArray(manifest.changeClasses)) {
  manifest.changeClasses = ["bugfix"];
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`✅  ${zipPath}`);
console.log(`   sha256: ${checksum}`);
console.log(`   manifest: ${manifestPath} (enabled=${manifest.enabled})`);
console.log(`   bundleUrl: ${bundleUrl}`);
