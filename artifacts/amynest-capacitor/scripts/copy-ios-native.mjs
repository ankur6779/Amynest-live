import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configDir = resolve(root, "ios-config");
const appDir = resolve(root, "ios/App/App");

const copies = [
  ["AmyNestFcmBridge.swift", "AmyNestFcmBridge.swift"],
  ["GoogleService-Info.plist", "GoogleService-Info.plist"],
  ["BounceDisable.swift", "BounceDisable.swift"],
  ["MicPermissionPlugin.swift", "MicPermissionPlugin.swift"],
];

mkdirSync(appDir, { recursive: true });

for (const [src, dest] of copies) {
  const from = resolve(configDir, src);
  const to = resolve(appDir, dest);
  if (!existsSync(from)) {
    console.warn(`⚠️  Skip missing ${src}`);
    continue;
  }
  copyFileSync(from, to);
  console.log(`✅  ${dest}`);
}

console.log("📱  iOS native files synced to ios/App/App/");
