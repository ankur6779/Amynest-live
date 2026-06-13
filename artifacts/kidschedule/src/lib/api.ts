import {
  getDefaultApiOrigin,
  PRODUCTION_WORKER_API_ORIGIN,
  resolveAmynestEnvFromVite,
  resolveProductionSameOriginApi,
  resolveProductionWorkerApiOrigin,
} from "@/config";
import { isCapacitorNativeShell, isNativeAmyNestShell } from "@/lib/native-shell";

/**
 * Resolved API origin (no trailing slash).
 * Override with `VITE_APP_API_ORIGIN` in repo-root `.env.development` / `.env.production`.
 *
 * Production web on amynest.in uses same-origin `/api/*` (requires Cloudflare
 * Worker proxy — see infra/cloudflare/amynest-api-proxy/).
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

  const sameOrigin = resolveProductionSameOriginApi();
  if (sameOrigin) return sameOrigin;

  const workerOrigin = resolveProductionWorkerApiOrigin();
  if (isNativeAmyNestShell() && workerOrigin) {
    return workerOrigin;
  }

  if (isNativeAmyNestShell()) {
    return fallback;
  }

  return fallback;
}

/** True when API calls target www.amynest.in (Cloudflare Worker → Render). */
export function usesCloudflareWorkerApiPath(apiOrigin?: string): boolean {
  const origin = (apiOrigin ?? getAppApiBaseOrigin()).replace(/\/$/, "");
  return (
    origin === PRODUCTION_WORKER_API_ORIGIN ||
    origin === "https://amynest.in" ||
    origin.endsWith(".amynest.in")
  );
}

/** Client instrumentation for Worker-routed API requests (Capacitor iOS migration). */
export function mergeAmyNestApiClientHeaders(init: RequestInit = {}): RequestInit {
  if (!usesCloudflareWorkerApiPath()) {
    return init;
  }

  const headers = new Headers(init.headers);
  headers.set("x-amynest-api-path", "worker");

  if (isCapacitorNativeShell()) {
    try {
      const cap = (
        window as Window & { Capacitor?: { getPlatform?: () => string } }
      ).Capacitor;
      const platform = cap?.getPlatform?.();
      if (platform === "ios") {
        headers.set("x-amynest-platform", "ios");
      } else if (platform === "android") {
        headers.set("x-amynest-platform", "android");
      }
    } catch {
      /* ignore */
    }
  }

  return { ...init, headers };
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
 * Example: `fetch(getApiUrl("/api/healthz"))` → `https://www.amynest.in/api/healthz` (prod web)
 * or `https://www.amynest.in/api/healthz` (Capacitor iOS prod → Worker)
 */
export function getApiUrl(path: string): string {
  const pathPart = path.startsWith("/") ? path : `/${path}`;
  return `${getAppApiBaseOrigin()}${pathPart}`;
}

/**
 * Resolves TTS / media paths returned by the API (`/api/tts/audio/...`) to the
 * backend origin. Required on the static site (amynest-live-1) where relative
 * `/api/*` URLs would hit the CDN, not the API server.
 *
 * Bundled infant sleep MP3s (`/infant-sleep-audio/...`) and other Vite `public/`
 * assets must stay on the web origin — they are not served by the API server.
 */
export function resolveApiMediaUrl(pathOrUrl: string): string {
  const u = (pathOrUrl ?? "").trim();
  if (!u) return u;
  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("blob:") ||
    u.startsWith("data:")
  ) {
    return u;
  }
  if (u.startsWith("/infant-sleep-audio/")) return u;
  if (u.startsWith("/api/")) return getApiUrl(u);
  if (u.startsWith("/")) return u;
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

/** Crash-safe JSON fetch — never throws; returns `{ fallback: true }` on failure. */
export async function safeFetchJson<T extends Record<string, unknown> = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<(T & { fallback?: boolean }) | { fallback: true }> {
  try {
    const res = await fetch(resolveApiRequestInput(input), init);
    const data = (await res.json()) as T;
    if (!res.ok) {
      console.error("API error: HTTP", res.status, input);
      return { fallback: true };
    }
    return data;
  } catch (e) {
    console.error("API error:", e);
    return { fallback: true };
  }
}
