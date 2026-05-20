import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

run("pnpm", ["run", "build:web"], {
  env: {
    BASE_PATH: "/",
    PORT: "3000",
    VITE_AMYNEST_ENV: "production",
    ...(revenueCatIosKey ? { VITE_REVENUECAT_IOS_API_KEY: revenueCatIosKey } : {}),
  },
});

run("node", [resolve(__dirname, "copy-www.mjs")], {
  cwd: resolve(__dirname, ".."),
});
