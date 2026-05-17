/**
 * Loads repo-root `.env*` files before the rest of the server boots.
 * `AMYNEST_ENV` is the source of truth for DEV vs PROD (not only NODE_ENV).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

export type AmynestEnv = "development" | "production";

const LOADED_FLAG = "__AMYNEST_ENV_LOADED__";

function findRepoRoot(): string {
  const starts = [
    process.cwd(),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".."),
  ];

  for (const start of starts) {
    let dir = path.resolve(start);
    while (dir !== path.dirname(dir)) {
      if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
        return dir;
      }
      dir = path.dirname(dir);
    }
  }

  return process.cwd();
}

/** Resolve DEV vs PROD — explicit `AMYNEST_ENV` wins over NODE_ENV. */
export function resolveAmynestEnv(): AmynestEnv {
  const raw = process.env["AMYNEST_ENV"]?.trim().toLowerCase();
  if (raw === "dev" || raw === "development") return "development";
  if (raw === "prod" || raw === "production") return "production";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function loadEnvFile(filePath: string, override: boolean): void {
  if (!existsSync(filePath)) return;
  dotenvConfig({ path: filePath, override, quiet: true });
}

/** Load `.env`, `.env.local`, `.env.{development|production}`, and optional `.local` overrides. */
export function loadAmynestEnvFiles(): AmynestEnv {
  if (process.env[LOADED_FLAG] === "1") {
    return resolveAmynestEnv();
  }

  const repoRoot = findRepoRoot();
  const preset = resolveAmynestEnv();

  loadEnvFile(path.join(repoRoot, ".env"), false);
  loadEnvFile(path.join(repoRoot, ".env.local"), true);
  loadEnvFile(path.join(repoRoot, `.env.${preset}`), true);
  loadEnvFile(path.join(repoRoot, `.env.${preset}.local`), true);

  const amynestEnv = resolveAmynestEnv();
  process.env["AMYNEST_ENV"] = amynestEnv;
  process.env[LOADED_FLAG] = "1";

  if (!process.env["PORT"]?.trim() && amynestEnv === "development") {
    process.env["PORT"] = "5000";
  }

  return amynestEnv;
}

export function amynestEnvLabel(env: AmynestEnv = resolveAmynestEnv()): "DEV" | "PROD" {
  return env === "development" ? "DEV" : "PROD";
}

/** Console + structured log line — safe to call once at startup. */
export function logAmynestEnvironment(): void {
  const env = loadAmynestEnvFiles();
  const label = amynestEnvLabel(env);
  const renderService = process.env["RENDER_SERVICE_NAME"];
  const apiPublicUrl = process.env["API_PUBLIC_URL"];

  const parts = [
    `[AmyNest] Running in ${label} mode`,
    `(AMYNEST_ENV=${env}`,
    `NODE_ENV=${process.env.NODE_ENV ?? "unset"}`,
  ];
  if (renderService) parts.push(`Render=${renderService}`);
  if (apiPublicUrl) parts.push(`API=${apiPublicUrl}`);
  parts.push(")");

  console.log(parts.join(", "));
}

// Side-effect: load env as soon as this module is imported.
loadAmynestEnvFiles();
