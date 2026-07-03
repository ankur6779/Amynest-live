import type { AnalyticsService } from "./analytics-service";

export function installAnalyticsErrorBridge(service: AnalyticsService): () => void {
  if (typeof window === "undefined") return () => {};

  const onError = (event: ErrorEvent) => {
    service.trackError("unhandled", event.message || "unknown error", {
      route: window.location.pathname,
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const msg =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason ?? "rejection");
    service.trackError("unhandled", msg.slice(0, 500), {
      route: window.location.pathname,
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

/** Called from React error boundaries */
export function trackReactAnalyticsError(
  service: AnalyticsService,
  error: Error,
  route?: string,
): void {
  service.trackError("react", error.message, { route });
}
