/**
 * Inject OTA (Capgo) settings into capacitor.config.json after web build.
 * Keeps updateUrl on HTTPS API; never sets server.url (bundled www stays primary).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(root, "capacitor.config.json");

const apiOrigin =
  process.env.VITE_APP_API_ORIGIN?.trim()?.replace(/\/$/, "") ||
  process.env.OTA_UPDATE_API_ORIGIN?.trim()?.replace(/\/$/, "") ||
  "https://amynest-backend-dykj.onrender.com";

const bundleVersion =
  process.env.OTA_BUILTIN_BUNDLE_VERSION?.trim() || "1.0.0";

if (!existsSync(configPath)) {
  console.warn("⚠️  patch-capacitor-ota-config: no capacitor.config.json");
  process.exit(0);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
config.plugins = config.plugins ?? {};
// Default OFF for local/Xcode builds: production OTA manifest (e.g. 1.0.1) can
// overwrite a fresh www/ bundle from Xcode and revert auth fixes. Enable only
// in release CI: CAPACITOR_OTA_AUTO_UPDATE=true
const otaAutoUpdate = process.env.CAPACITOR_OTA_AUTO_UPDATE === "true";

config.plugins.CapacitorUpdater = {
  autoUpdate: otaAutoUpdate,
  autoDeletePrevious: true,
  resetWhenUpdate: true,
  directUpdate: false,
  allowModifyUrl: false,
  statsUrl: "",
  updateUrl: `${apiOrigin}/api/app/ota/check`,
  version: bundleVersion,
  defaultChannel: "production",
};

if (config.server?.url) {
  delete config.server.url;
}

writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`, "utf8");
console.log(
  `✅  CapacitorUpdater → ${config.plugins.CapacitorUpdater.updateUrl} (builtin ${bundleVersion}, autoUpdate=${otaAutoUpdate})`,
);
