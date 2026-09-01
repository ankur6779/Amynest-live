import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  "";

if (!revenueCatIosKey) {
  console.error(
    "❌  VITE_REVENUECAT_IOS_API_KEY (or EXPO_PUBLIC_REVENUECAT_IOS_API_KEY) is required for iOS builds.",
  );
  console.error(
    "    Export the RevenueCat App Store public SDK key (appl_…) before running build:ios.",
  );
  process.exit(1);
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
