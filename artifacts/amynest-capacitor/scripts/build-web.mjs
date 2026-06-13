import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function readReplitRevenueCatIosKey(root) {
  try {
    const text = readFileSync(resolve(root, ".replit"), "utf8");
    const m = text.match(
      /EXPO_PUBLIC_REVENUECAT_IOS_API_KEY\s*=\s*"([^"]+)"/,
    );
    return m?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const capacitorEnv = {
  ...loadEnvFile(resolve(repoRoot, ".env")),
  ...loadEnvFile(resolve(__dirname, "..", ".env")),
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const revenueCatIosKey =
  process.env.VITE_REVENUECAT_IOS_API_KEY?.trim() ||
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ||
  readReplitRevenueCatIosKey(repoRoot) ||
  "";

if (!revenueCatIosKey) {
  console.warn(
    "⚠️  VITE_REVENUECAT_IOS_API_KEY not set — iOS In-App Purchase will show “billing unavailable”.",
  );
  console.warn(
    "    Set your production RevenueCat App Store key (appl_…) before build:ios.",
  );
} else if (revenueCatIosKey.startsWith("appl_")) {
  console.log("✅  RevenueCat production iOS key (appl_…) will be embedded in www/");
} else if (revenueCatIosKey.startsWith("test_")) {
  console.warn(
    "⚠️  test_ key detected — use production appl_ key for App Store builds, not RevenueCat test store.",
  );
}

const PRODUCTION_WORKER_API_ORIGIN = "https://www.amynest.in";

run("pnpm", ["run", "build:web"], {
  env: {
    BASE_PATH: "/",
    PORT: "3000",
    VITE_AMYNEST_ENV: "production",
    VITE_AMYNEST_CAPACITOR_IOS_BUILD: "true",
    VITE_APP_API_ORIGIN: PRODUCTION_WORKER_API_ORIGIN,
    VITE_FIREBASE_API_KEY: capacitorEnv.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: capacitorEnv.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: capacitorEnv.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: capacitorEnv.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MESSAGING_SENDER_ID: capacitorEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    ...(revenueCatIosKey ? { VITE_REVENUECAT_IOS_API_KEY: revenueCatIosKey } : {}),
  },
});

run("node", [resolve(__dirname, "copy-www.mjs")], {
  cwd: resolve(__dirname, ".."),
});

run("node", [resolve(__dirname, "patch-capacitor-ota-config.mjs")], {
  cwd: resolve(__dirname, ".."),
  env: {
    VITE_APP_API_ORIGIN: PRODUCTION_WORKER_API_ORIGIN,
    OTA_UPDATE_API_ORIGIN: process.env.OTA_UPDATE_API_ORIGIN,
    OTA_BUILTIN_BUNDLE_VERSION: process.env.OTA_BUILTIN_BUNDLE_VERSION,
  },
});
