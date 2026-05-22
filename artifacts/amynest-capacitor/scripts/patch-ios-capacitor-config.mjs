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

/** iOS Capacitor loads live www (see amynest-capacitor/capacitor.config.json). */
const REQUIRED_SERVER_URL = "https://www.amynest.in";

if (!existsSync(configPath)) {
  console.warn("⚠️  Skip patch-ios-capacitor-config — no ios/App/App/capacitor.config.json");
  process.exit(0);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const list = Array.isArray(config.packageClassList) ? [...config.packageClassList] : [];
let changed = false;

if (!config.server) config.server = {};
if (config.server.url !== REQUIRED_SERVER_URL) {
  config.server.url = REQUIRED_SERVER_URL;
  config.server.iosScheme = "https";
  config.server.androidScheme = "https";
  changed = true;
}

for (const plugin of REQUIRED_LOCAL_PLUGINS) {
  if (!list.includes(plugin)) {
    list.push(plugin);
    changed = true;
  }
}

if (!changed) {
  console.log("✅  capacitor.config.json already lists local iOS plugins");
  process.exit(0);
}

config.packageClassList = list;
writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`, "utf8");
console.log(`✅  Patched packageClassList (+ ${REQUIRED_LOCAL_PLUGINS.join(", ")})`);
