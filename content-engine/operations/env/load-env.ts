import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load KEY=VALUE pairs from dotenv-style files into process.env (non-destructive).
 * Existing non-empty process.env values win.
 */
export function loadEnvFiles(
  paths: string[],
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const loaded: string[] = [];
  for (const path of paths) {
    const absolute = resolve(path);
    if (!existsSync(absolute)) continue;
    const text = readFileSync(absolute, "utf8");
    for (const line of text.split(/\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (env[key] !== undefined && env[key] !== "") continue;
      env[key] = value;
    }
    loaded.push(absolute);
  }
  return loaded;
}

/** Default AmyNest env search order for local/production CLI runs. */
export function loadAmyNestEnvFiles(
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return loadEnvFiles(
    [
      resolve(cwd, ".env"),
      resolve(cwd, ".env.local"),
      resolve(cwd, ".env.development"),
      resolve(cwd, ".env.production"),
      resolve(cwd, "content-engine/.env"),
      resolve(cwd, "../.env"),
      resolve(cwd, "../.env.development"),
    ],
    env,
  );
}
