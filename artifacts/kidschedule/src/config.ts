/**
 * Default API origins when `VITE_APP_API_ORIGIN` is unset.
 * Override per environment via repo-root `.env.development` / `.env.production`.
 */
export const API_ORIGINS = {
  production: "https://amynest-backend.onrender.com",
  development: "https://amynest-dev.onrender.com",
  local: "http://localhost:5000",
} as const;

export type AmynestEnv = "development" | "production";

export function resolveAmynestEnvFromVite(): AmynestEnv {
  const fromEnv = (import.meta.env.VITE_AMYNEST_ENV as string | undefined)?.trim().toLowerCase();
  if (fromEnv === "dev" || fromEnv === "development") return "development";
  if (fromEnv === "prod" || fromEnv === "production") return "production";
  return import.meta.env.PROD ? "production" : "development";
}

/** Resolved default backend origin (no trailing slash). */
export function getDefaultApiOrigin(): string {
  const env = resolveAmynestEnvFromVite();
  const useLocal =
    import.meta.env.DEV &&
    (import.meta.env.VITE_USE_LOCAL_API as string | undefined)?.trim() === "1";
  if (useLocal) return API_ORIGINS.local;
  return env === "production" ? API_ORIGINS.production : API_ORIGINS.development;
}

/** @deprecated Use `getDefaultApiOrigin()` — kept for existing imports. */
export const BASE_URL = getDefaultApiOrigin();
