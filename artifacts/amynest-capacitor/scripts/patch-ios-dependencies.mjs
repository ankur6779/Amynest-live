/**
 * Patches third-party iOS deps for clean TestFlight / Archive builds.
 */
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const capacitorRoot = resolve(__dirname, "../../..");
const amynestCapRoot = resolve(__dirname, "..");

function findPnpmPackage(prefix) {
  const pnpmDir = join(capacitorRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) return null;
  const entry = readdirSync(pnpmDir).find((name) => name.startsWith(prefix));
  if (!entry) return null;
  return join(pnpmDir, entry, "node_modules");
}

function patchGoogleAuth() {
  const pkgRoot = findPnpmPackage("@codetrix-studio+capacitor-google-auth@");
  if (!pkgRoot) {
    console.warn("⚠️  Skip Google Auth patch — package not found");
    return;
  }
  const file = join(
    pkgRoot,
    "@codetrix-studio",
    "capacitor-google-auth",
    "ios",
    "Plugin",
    "Plugin.swift",
  );
  if (!existsSync(file)) {
    console.warn("⚠️  Skip Google Auth patch — Plugin.swift missing");
    return;
  }
  let src = readFileSync(file, "utf8");
  const before = src;
  src = src.replace(
    "call.getString(\"clientId\") ?? getClientIdValue() as? String",
    "call.getString(\"clientId\") ?? getClientIdValue()",
  );
  // Keep getConfigValue for scopes/bool — warnings suppressed in Podfile post_install.
  if (src !== before) {
    writeFileSync(file, src, "utf8");
    console.log("✅  Patched @codetrix-studio/capacitor-google-auth Plugin.swift");
  }
}

function syncNativeSources() {
  const bounceSrc = join(amynestCapRoot, "ios-config", "BounceDisable.swift");
  const bounceDest = join(amynestCapRoot, "ios/App/App/BounceDisable.swift");
  if (existsSync(bounceSrc) && existsSync(dirname(bounceDest))) {
    copyFileSync(bounceSrc, bounceDest);
    console.log("✅  Synced BounceDisable.swift");
  }
}

patchGoogleAuth();
syncNativeSources();
console.log("📱  iOS dependency patches applied");
