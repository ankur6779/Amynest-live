import type { AnalyticsService } from "./analytics-service";
import { reportCrash } from "@/lib/crash-report";

export function installAnalyticsErrorBridge(_service: AnalyticsService): () => void {
  if (typeof window === "undefined") return () => {};

  const onError = (event: ErrorEvent) => {
    void reportCrash({
      kind: "window.error",
      message: event.message || "unknown error",
      stack: event.error instanceof Error ? event.error.stack : undefined,
      component: "window",
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : String(reason ?? "rejection");
    void reportCrash({
      kind: "unhandled.rejection",
      message: message.slice(0, 500),
      stack: reason instanceof Error ? reason.stack : undefined,
      component: "promise",
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

/** Called from React error boundaries when orchestrator is not used. */
export function trackReactAnalyticsError(
  _service: AnalyticsService,
  error: Error,
  route?: string,
  component?: string,
  componentStack?: string,
): void {
  void reportCrash({
    kind: "react.render",
    message: error.message,
    stack: error.stack,
    component: component ?? "React",
    componentStack,
    meta: { route },
  });
}
