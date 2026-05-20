/**
 * Patches third-party iOS deps for clean TestFlight / Archive builds.
 */
import { copyFileSync, existsSync, dirname, join, resolve } from "node:fs";
import { fileURLToPath } from "node:url";

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
console.log("📱  iOS dependency patches applied");
