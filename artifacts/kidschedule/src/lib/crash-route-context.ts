/**
 * Lightweight crash diagnostics for error boundaries — no PII beyond route/user id.
 */
import { apiLogger } from "@/lib/api-logger";

export type CrashRouteContext = {
  route: string;
  href: string;
  buildVersion?: string;
  lastSuccessfulScreen?: string;
  lastApi?: {
    endpoint: string;
    method: string;
    status: number | null;
    error: string | null;
    responseTime: number | null;
    at: string;
  };
  recentApiFailures: Array<{
    endpoint: string;
    method: string;
    status: number | null;
    error: string | null;
    at: string;
  }>;
};

let lastSuccessfulScreen: string | undefined;

/** Call when a route mounts successfully (best-effort). */
export function markSuccessfulScreen(path?: string): void {
  if (typeof window === "undefined") return;
  lastSuccessfulScreen = path ?? window.location.pathname;
}

function readBuildVersion(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return (
    document.querySelector('meta[name="app-build-version"]')?.getAttribute("content") ??
    document.querySelector('meta[name="amynest-deploy"]')?.getAttribute("content") ??
    undefined
  );
}

/** Snapshot for crash reports — never throws. */
export function getCrashRouteContext(): CrashRouteContext {
  const route = typeof window !== "undefined" ? window.location.pathname : "";
  const href = typeof window !== "undefined" ? window.location.href : "";
  const entries = [...apiLogger.getEntries()];
  const last = entries[0];
  const failures = entries
    .filter((e) => e.error || (e.status != null && e.status >= 400))
    .slice(0, 5)
    .map((e) => ({
      endpoint: e.endpoint,
      method: e.method,
      status: e.status,
      error: e.error,
      at: e.timestamp,
    }));

  return {
    route,
    href,
    buildVersion: readBuildVersion(),
    lastSuccessfulScreen,
    lastApi: last
      ? {
          endpoint: last.endpoint,
          method: last.method,
          status: last.status,
          error: last.error,
          responseTime: last.responseTime,
          at: last.timestamp,
        }
      : undefined,
    recentApiFailures: failures,
  };
}
