import { isNativeAmyNestShell } from "@/lib/native-shell";

/** Live API on Render (production + native shells + deployed web). */
const PRODUCTION_API_ORIGIN = "https://amynest-live.onrender.com";

/** Local api-server (`artifacts/api-server`, default PORT 8080). */
const LOCAL_DEV_API_ORIGIN = "http://localhost:8080";

/**
 * API origin for `fetch(\`${BASE_URL}/api/...\`)` and `getApiUrl("/api/...")`.
 *
 * - Local browser dev (localhost / 127.0.0.1): local api-server
 * - Capacitor / Android WebView / production web: Render
 *
 * Override anytime with `VITE_APP_API_ORIGIN` in `.env` (no trailing slash).
 */
export function getAppApiBaseOrigin(): string {
  const fromEnv =
    (import.meta.env.VITE_APP_API_ORIGIN as string | undefined)?.trim() ||
    (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.trim() ||
    "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (typeof window === "undefined") {
    return PRODUCTION_API_ORIGIN;
  }

  if (isNativeAmyNestShell()) {
    return PRODUCTION_API_ORIGIN;
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return LOCAL_DEV_API_ORIGIN;
  }

  return PRODUCTION_API_ORIGIN;
}

/** Resolved API base URL (no trailing slash). */
export const BASE_URL = getAppApiBaseOrigin();

/**
 * Returns a URL for calling the backend API.
 * Example: `fetch(getApiUrl("/api/health"))` → `https://amynest-live.onrender.com/api/health`
 */
export function getApiUrl(path: string): string {
  const pathPart = path.startsWith("/") ? path : `/${path}`;
  const origin = getAppApiBaseOrigin();
  return `${origin}${pathPart}`;
}

/**
 * Rewrites same-origin-style `/api/...` request targets for native shells and
 * absolute-base deployments. Used by `loggedFetch` so all `authFetch("/api/...")`
 * calls hit the configured backend.
 */
export function resolveApiRequestInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string" && input.startsWith("/api")) {
    return getApiUrl(input);
  }
  return input;
}
