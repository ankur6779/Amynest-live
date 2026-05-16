import { BASE_URL } from "@/config";
import { isNativeAmyNestShell } from "@/lib/native-shell";

/**
 * Resolved API origin (no trailing slash).
 * Override with `VITE_APP_API_ORIGIN` in `.env` for local or staging backends.
 */
export function getAppApiBaseOrigin(): string {
  const fromEnv =
    (import.meta.env.VITE_APP_API_ORIGIN as string | undefined)?.trim() ||
    (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.trim() ||
    "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (typeof window === "undefined") {
    return BASE_URL;
  }

  if (isNativeAmyNestShell()) {
    return BASE_URL;
  }

  return BASE_URL;
}

/** Same as `getAppApiBaseOrigin()` — use with `fetch(\`${BASE_URL}/api/...\`)`. */
export { BASE_URL };

/**
 * Returns a URL for calling the backend API.
 * Example: `fetch(getApiUrl("/api/healthz"))` → `https://amynest-live.onrender.com/api/healthz`
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
