/**
 * Patches @capacitor/ios CapacitorCordova for Xcode 17 / iOS 26 SDK:
 * WKProcessPool is deprecated and can fail the build without pragma guards.
 * Upstream fix: https://github.com/ionic-team/capacitor/commit/b6abcb7
 */
import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const capacitorRoot = resolve(__dirname, "../../..");
const patchDir = resolve(__dirname, "../ios-config/patches/capacitor-cordova");

function findCapacitorIosPackage() {
  const pnpmDir = join(capacitorRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) return null;
  const entry = readdirSync(pnpmDir).find((name) =>
    name.startsWith("@capacitor+ios@"),
  );
  if (!entry) return null;
  return join(
    pnpmDir,
    entry,
    "node_modules",
    "@capacitor",
    "ios",
    "CapacitorCordova",
    "CapacitorCordova",
  );
}

const targets = [
  { patch: "CDVAvailabilityDeprecated.h", dest: "Classes/Public/CDVAvailabilityDeprecated.h" },
  { patch: "CDVWebViewProcessPoolFactory.h", dest: "Classes/Public/CDVWebViewProcessPoolFactory.h" },
  { patch: "CDVWebViewProcessPoolFactory.m", dest: "Classes/Public/CDVWebViewProcessPoolFactory.m" },
  { patch: "CapacitorCordova.h", dest: "CapacitorCordova.h" },
];

const cordovaRoot = findCapacitorIosPackage();
if (!cordovaRoot) {
  console.error("❌  @capacitor/ios not found — run pnpm install from repo root first.");
  process.exit(1);
}

for (const { patch, dest } of targets) {
  const src = join(patchDir, patch);
  const out = join(cordovaRoot, dest);
  if (!existsSync(src)) {
    console.error(`❌  Missing patch file: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, out);
  console.log(`✅  Patched ${dest}`);
}

const pkgPath = join(capacitorRoot, "node_modules", ".pnpm");
const pkgEntry = readdirSync(pkgPath).find((n) => n.startsWith("@capacitor+ios@"));
const version = pkgEntry?.match(/@capacitor\+ios@([^_]+)/)?.[1] ?? "unknown";
console.log(`📦  @capacitor/ios ${version} — WKProcessPool/Xcode 17 patch applied`);
