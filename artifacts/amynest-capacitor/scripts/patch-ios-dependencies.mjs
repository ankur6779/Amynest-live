/**
 * Patches third-party iOS deps for clean TestFlight / Archive builds.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const amynestCapRoot = resolve(__dirname, "..");

function syncNativeSources() {
  const bounceSrc = join(amynestCapRoot, "ios-config", "BounceDisable.swift");
  const bounceDest = join(amynestCapRoot, "ios/App/App/BounceDisable.swift");
  if (existsSync(bounceSrc) && existsSync(dirname(bounceDest))) {
    copyFileSync(bounceSrc, bounceDest);
    console.log("✅  Synced BounceDisable.swift");
  }
}

syncNativeSources();

const geolocationPatch = spawnSync(
  "node",
  [join(__dirname, "patch-geolocation-ios.mjs")],
  { stdio: "inherit", cwd: join(__dirname, "..") },
);
if (geolocationPatch.status !== 0) {
  process.exit(geolocationPatch.status ?? 1);
}

console.log("📱  iOS dependency patches applied");
