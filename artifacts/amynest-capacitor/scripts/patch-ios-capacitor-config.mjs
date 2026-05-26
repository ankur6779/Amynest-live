/**
 * `cap sync ios` regenerates ios/App/App/capacitor.config.json and often drops
 * local in-app plugins from packageClassList. MicPermissionPlugin must stay
 * registered or iOS never shows the microphone permission dialog.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(root, "ios/App/App/capacitor.config.json");
const REQUIRED_LOCAL_PLUGINS = ["MicPermissionPlugin"];

if (!existsSync(configPath)) {
  console.warn("⚠️  Skip patch-ios-capacitor-config — no ios/App/App/capacitor.config.json");
  process.exit(0);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const list = Array.isArray(config.packageClassList) ? [...config.packageClassList] : [];
let changed = false;

// StatusBarPlugin lets us call StatusBar.setOverlaysWebView({ overlay: false })
// from native-shell.ts so iOS reserves the status-bar strip OUTSIDE the WKWebView.
// Without it the iOS clock floats on top of the header and steals taps.
const STATUS_BAR_CLASS = "StatusBarPlugin";
if (!list.includes(STATUS_BAR_CLASS)) {
  list.push(STATUS_BAR_CLASS);
  changed = true;
}

// Capacitor iOS must ship bundled www — remote server.url hides stale-cache issues
// and breaks offline review; App Store build reads ios/App/App/public directly.
if (config.server?.url) {
  delete config.server.url;
  changed = true;
}
if (config.server && config.server.iosScheme !== "capacitor") {
  config.server.iosScheme = "capacitor";
  changed = true;
}

for (const plugin of REQUIRED_LOCAL_PLUGINS) {
  if (!list.includes(plugin)) {
    list.push(plugin);
    changed = true;
  }
}

if (!list.includes("SignInWithApple") && list.some((p) => p.includes("SignIn"))) {
  /* cap sync usually keeps SignInWithApple — no-op */
}

if (!changed) {
  console.log("✅  capacitor.config.json already patched for iOS");
  process.exit(0);
}

config.packageClassList = list;
writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`, "utf8");
console.log("✅  Patched ios/App/App/capacitor.config.json (bundled www + local plugins)");
