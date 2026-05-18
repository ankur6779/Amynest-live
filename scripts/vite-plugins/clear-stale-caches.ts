import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

/**
 * On each dev-server start, drop Vite + Tailwind loader caches so a prior
 * `pnpm install` cannot leave @tailwindcss/node pointing at reshuffled paths.
 */
export function clearStaleCachesPlugin(packageRoot: string): Plugin {
  const dirs = [
    join(packageRoot, "node_modules/.vite"),
    join(packageRoot, "node_modules/.cache/vite"),
    join(packageRoot, "node_modules/.cache/tailwindcss"),
  ];

  return {
    name: "amynest-clear-stale-caches",
    apply: "serve",
    configureServer() {
      for (const dir of dirs) {
        if (!existsSync(dir)) continue;
        rmSync(dir, { recursive: true, force: true });
      }
    },
  };
}
