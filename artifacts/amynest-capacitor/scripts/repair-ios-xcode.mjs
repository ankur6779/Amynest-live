/**
 * Repair CocoaPods + open the correct Xcode workspace.
 * Fixes "No such module FBSDKCoreKit" when Pods are stale or App.xcodeproj was opened.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const capRoot = resolve(__dirname, "..");
const iosAppDir = join(capRoot, "ios", "App");
const workspace = join(iosAppDir, "App.xcworkspace");
const podsRoot = join(iosAppDir, "Pods", "FBSDKCoreKit");

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: opts.cwd ?? iosAppDir,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("🔧  Repairing iOS CocoaPods (AmyNest)…\n");

if (!existsSync(join(iosAppDir, "Podfile"))) {
  console.error(`❌  Podfile not found: ${join(iosAppDir, "Podfile")}`);
  process.exit(1);
}

run("pod", ["deintegrate"], { cwd: iosAppDir });
run("pod", ["install", "--repo-update"], { cwd: iosAppDir });

if (!existsSync(podsRoot)) {
  console.error("❌  FBSDKCoreKit pod missing after pod install.");
  process.exit(1);
}

console.log("\n🧹  Clearing Xcode DerivedData for App…");
run("bash", [
  "-lc",
  "rm -rf ~/Library/Developer/Xcode/DerivedData/App-* 2>/dev/null || true",
]);

if (!existsSync(workspace)) {
  console.error(`❌  Workspace not found: ${workspace}`);
  process.exit(1);
}

console.log(`\n✅  Opening ${workspace}`);
console.log("    (Use App.xcworkspace — never App.xcodeproj)\n");
run("open", ["-a", "Xcode", workspace]);
