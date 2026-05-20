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

run("pnpm", ["run", "build:web"], {
  env: {
    BASE_PATH: "/",
    PORT: "3000",
    VITE_AMYNEST_ENV: "production",
  },
});

run("node", [resolve(__dirname, "copy-www.mjs")], {
  cwd: resolve(__dirname, ".."),
});
