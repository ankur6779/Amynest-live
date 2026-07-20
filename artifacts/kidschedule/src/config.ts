/**
 * Default API origins when `VITE_APP_API_ORIGIN` is unset.
 * Override per environment via repo-root `.env.development` / `.env.production`.
 *
 * Referral share links use `VITE_APP_WEB_ORIGIN` (see `lib/referral-links.ts`).
 */
export const API_ORIGINS = {
  // Production API is Coolify behind Cloudflare (www.amynest.in).
  production: "https://www.amynest.in",
  development: "http://localhost:5000",
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

const PRODUCTION_SAME_ORIGIN_HOSTS = new Set(["www.amynest.in", "amynest.in"]);

/** Production API via Cloudflare Worker (Capacitor iOS + explicit overrides). */
export const PRODUCTION_WORKER_API_ORIGIN = "https://www.amynest.in";

/**
 * Cloudflare Worker API origin for native/bundled shells that are not on amynest.in.
 * Capacitor iOS loads bundled www/ (capacitor://localhost) — same Worker path as web.
 */
export function resolveProductionWorkerApiOrigin(): string | null {
  if (!import.meta.env.PROD) return null;
  if (resolveAmynestEnvFromVite() !== "production") return null;
  return PRODUCTION_WORKER_API_ORIGIN;
}

/**
 * When the app runs on amynest.in / www.amynest.in, route `/api/*` through the
 * same origin (Cloudflare Worker → Coolify backend). Applies to browser and
 * Android WebView shells that load the production site.
 */
export function resolveProductionSameOriginApi(): string | null {
  if (!import.meta.env.PROD) return null;
  if (resolveAmynestEnvFromVite() !== "production") return null;
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  if (!PRODUCTION_SAME_ORIGIN_HOSTS.has(host)) return null;
  return window.location.origin.replace(/\/$/, "");
}

/** @deprecated Use `getDefaultApiOrigin()` — kept for existing imports. */
export const BASE_URL = getDefaultApiOrigin();
