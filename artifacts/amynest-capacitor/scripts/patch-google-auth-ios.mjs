/**
 * Patches @codetrix-studio/capacitor-google-auth for GoogleSignIn 7.1+ (ITMS-91061 privacy manifests).
 * Run before `pod install` (wired into build:ios).
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configDir = resolve(root, "ios-config");
const patchedPlugin = resolve(configDir, "patches/GoogleAuthPlugin.swift");

function findGoogleAuthPluginRoot() {
  const pnpmDir = resolve(root, "../../node_modules/.pnpm");
  const entry = readdirSync(pnpmDir).find((name) =>
    name.startsWith("@codetrix-studio+capacitor-google-auth@"),
  );
  if (!entry) {
    throw new Error(
      "Could not find @codetrix-studio/capacitor-google-auth in node_modules/.pnpm",
    );
  }
  return resolve(
    pnpmDir,
    entry,
    "node_modules/@codetrix-studio/capacitor-google-auth",
  );
}

const pluginRoot = findGoogleAuthPluginRoot();
const podspecPath = resolve(pluginRoot, "CodetrixStudioCapacitorGoogleAuth.podspec");
const pluginDest = resolve(pluginRoot, "ios/Plugin/Plugin.swift");

if (!existsSync(patchedPlugin)) {
  throw new Error(`Missing patched plugin at ${patchedPlugin}`);
}

const podspec = readFileSync(podspecPath, "utf8");
const updatedPodspec = podspec.replace(
  /s\.dependency 'GoogleSignIn', '~> 6\.2\.4'/,
  "s.dependency 'GoogleSignIn', '~> 7.1'",
);
if (updatedPodspec === podspec) {
  if (!podspec.includes("~> 7.1")) {
    console.warn("⚠️  GoogleAuth podspec already patched or unexpected format");
  }
} else {
  writeFileSync(podspecPath, updatedPodspec);
  console.log("✅  CodetrixStudioCapacitorGoogleAuth.podspec → GoogleSignIn ~> 7.1");
}

copyFileSync(patchedPlugin, pluginDest);
console.log("✅  GoogleAuthPlugin.swift (GoogleSignIn 7.x API)");
