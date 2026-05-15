import { isNativeAmyNestShell } from "@/lib/native-shell";

/**
 * Production web app host — same host that serves `/api/*` in production.
 * Used when the UI runs inside a native shell (Capacitor / Android WebView)
 * where `fetch("/api/...")` would otherwise resolve against `capacitor://` or
 * `file://` and never reach the real backend.
 *
 * Override with `VITE_APP_API_ORIGIN` (or `VITE_APP_ORIGIN`) in `.env` for
 * staging builds, e.g. `https://staging.example.com` (no trailing slash).
 */
const DEFAULT_PRODUCTION_APP_ORIGIN = "https://amynest.in";

/**
 * Returns the API origin prefix for native shells / env overrides.
 * Empty string when the app should use same-origin relative `/api/...`
 * (normal browser on amynest.in).
 */
export function getAppApiBaseOrigin(): string {
  const fromEnv =
    (import.meta.env.VITE_APP_API_ORIGIN as string | undefined)?.trim() ||
    (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.trim() ||
    "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && isNativeAmyNestShell()) {
    return DEFAULT_PRODUCTION_APP_ORIGIN;
  }
  return "";
}

/**
 * Returns a URL for calling the backend API.
 * - Browser / PWA on amynest.in: returns the path only (same-origin).
 * - Native shells: returns absolute `https://amynest.in/...` (or env override).
 */
export function getApiUrl(path: string): string {
  const pathPart = path.startsWith("/") ? path : `/${path}`;
  const origin = getAppApiBaseOrigin();
  if (!origin) return pathPart;
  return `${origin}${pathPart}`;
}

/**
 * Rewrites same-origin-style `/api/...` request targets for native shells.
 * Used by `loggedFetch` so all `authFetch("/api/...")` calls hit production.
 */
export function resolveApiRequestInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string" && input.startsWith("/api")) {
    return getApiUrl(input);
  }
  return input;
}
