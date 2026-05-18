/**
 * Render worker entry: ensure dist/worker/index.mjs exists, then run it.
 * Rebuilds when the bundle is missing (e.g. build ran with NODE_ENV=production
 * and skipped esbuild devDependencies).
 */
import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerBundle = path.join(pkgDir, "dist/worker/index.mjs");

async function ensureBundle() {
  try {
    await access(workerBundle);
    return;
  } catch {
    console.error(`[worker] Bundle missing at ${workerBundle} — running build…`);
  }

  const build = spawnSync(process.execPath, ["./build.mjs"], {
    cwd: pkgDir,
    stdio: "inherit",
    env: process.env,
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }

  try {
    await access(workerBundle);
  } catch {
    console.error(`[worker] Build finished but bundle still missing: ${workerBundle}`);
    process.exit(1);
  }
}

await ensureBundle();

const env = {
  ...process.env,
  AMYNEST_ENV: process.env.AMYNEST_ENV ?? "production",
  AMYNEST_AI_WORKER_MODE: "standalone",
};

const run = spawnSync(
  process.execPath,
  ["--enable-source-maps", workerBundle],
  { cwd: pkgDir, stdio: "inherit", env },
);

process.exit(run.status ?? 1);
