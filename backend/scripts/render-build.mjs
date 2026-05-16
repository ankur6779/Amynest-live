import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function run(cmd, args, opts = {}) {
  console.log(`[render-build] ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: opts.shell ?? false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasPnpm() {
  return spawnSync("pnpm", ["--version"], { stdio: "ignore" }).status === 0;
}

if (!hasPnpm()) {
  run("corepack", ["enable"], { shell: true });
  run("corepack", ["prepare", "pnpm@9.15.0", "--activate"], { shell: true });
}

run("pnpm", ["install", "--frozen-lockfile"]);
run("pnpm", ["--filter", "@workspace/api-server", "build"]);

console.log("[render-build] api-server build complete");
