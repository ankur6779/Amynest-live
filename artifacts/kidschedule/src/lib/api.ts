import { getDefaultApiOrigin, resolveAmynestEnvFromVite } from "@/config";
import { isNativeAmyNestShell } from "@/lib/native-shell";

/**
 * Resolved API origin (no trailing slash).
 * Override with `VITE_APP_API_ORIGIN` in repo-root `.env.development` / `.env.production`.
 */
export function getAppApiBaseOrigin(): string {
  const fromEnv =
    (import.meta.env.VITE_APP_API_ORIGIN as string | undefined)?.trim() ||
    (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.trim() ||
    "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const fallback = getDefaultApiOrigin();

  if (typeof window === "undefined") {
    return fallback;
  }

  if (isNativeAmyNestShell()) {
    return fallback;
  }

  return fallback;
}

/** Default origin for the active Vite mode (dev/staging/prod). */
export const BASE_URL = getDefaultApiOrigin();

if (import.meta.env.DEV) {
  const profile = resolveAmynestEnvFromVite() === "development" ? "DEV" : "PROD";
  console.info(
    `[AmyNest] Web ${profile} — API ${getAppApiBaseOrigin()} (override: VITE_APP_API_ORIGIN)`,
  );
}

/**
 * Returns a URL for calling the backend API.
 * Example: `fetch(getApiUrl("/api/healthz"))` → `https://amynest-backend.onrender.com/api/healthz`
 */
export function getApiUrl(path: string): string {
  const pathPart = path.startsWith("/") ? path : `/${path}`;
  return `${getAppApiBaseOrigin()}${pathPart}`;
}

/**
 * Resolves TTS / media paths returned by the API (`/api/tts/audio/...`) to the
 * backend origin. Required on the static site (amynest-live-1) where relative
 * `/api/*` URLs would hit the CDN, not the API server.
 */
export function resolveApiMediaUrl(pathOrUrl: string): string {
  const u = (pathOrUrl ?? "").trim();
  if (!u) return u;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return getApiUrl(u);
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
