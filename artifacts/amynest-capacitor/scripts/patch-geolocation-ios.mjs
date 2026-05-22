/**
 * Patches @capacitor/geolocation for Xcode main-thread analyzer warnings on
 * CLLocationManager.locationServicesEnabled() (App Store / Archive builds).
 */
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const patchFile = resolve(
  __dirname,
  "../ios-config/patches/geolocation/GeolocationPlugin.swift",
);

function findGeolocationPluginSwift() {
  const pnpmDir = join(repoRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) return null;

  const entry = readdirSync(pnpmDir).find((name) =>
    name.startsWith("@capacitor+geolocation@"),
  );
  if (!entry) return null;

  return join(
    pnpmDir,
    entry,
    "node_modules",
    "@capacitor",
    "geolocation",
    "ios",
    "Sources",
    "GeolocationPlugin",
    "GeolocationPlugin.swift",
  );
}

const dest = findGeolocationPluginSwift();
if (!dest) {
  console.error(
    "❌  @capacitor/geolocation not found — run pnpm install from repo root first.",
  );
  process.exit(1);
}

if (!existsSync(patchFile)) {
  console.error(`❌  Missing patch file: ${patchFile}`);
  process.exit(1);
}

copyFileSync(patchFile, dest);
console.log("✅  Patched GeolocationPlugin.swift (main-thread locationServicesEnabled fix)");
