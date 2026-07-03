import type { AnalyticsService } from "./analytics-service";

const originalFetch = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;
let installed = false;

export function installAnalyticsPerformanceBridge(service: AnalyticsService): () => void {
  if (installed || !originalFetch) return () => {};
  installed = true;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.pathname
          : input.url;
    const isApi =
      typeof url === "string" &&
      (url.includes("/api/") || url.startsWith("/api/"));
    const start = isApi ? performance.now() : 0;

    try {
      const res = await originalFetch(input, init);
      if (isApi) {
        service.trackPerformance("api_duration", {
          durationMs: Math.round(performance.now() - start),
          path: url.slice(0, 256),
          success: res.ok,
        });
      }
      return res;
    } catch (err) {
      if (isApi) {
        service.trackPerformance("api_duration", {
          durationMs: Math.round(performance.now() - start),
          path: url.slice(0, 256),
          success: false,
        });
        service.trackError("network", err instanceof Error ? err.message : "fetch failed", {
          route: url,
        });
      }
      throw err;
    }
  };

  if (typeof window !== "undefined" && window.__amynestMark) {
    const startupStart = performance.timeOrigin;
    service.trackPerformance("startup_time", {
      durationMs: Math.round(Date.now() - startupStart),
    });
  }

  return () => {
    if (originalFetch) globalThis.fetch = originalFetch;
    installed = false;
  };
}
