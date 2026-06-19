import type { ProductionCrashPayload } from "@/lib/production-crash-overlay";

export function reportProductionCrash(payload: ProductionCrashPayload): void {
  void import("@/lib/crash-report").then(({ reportCrash }) =>
    reportCrash({
      kind: payload.kind,
      message: payload.message,
      stack: payload.stack,
      component: payload.detail,
      errorId: payload.errorId,
      meta: {
        source: payload.source,
        line: payload.line,
        col: payload.col,
        href: payload.href,
        route: payload.route,
      },
    }),
  );
}

export function reportReactRecoveryCrash(input: {
  message: string;
  stack?: string;
  componentStack?: string;
}): Promise<{ errorId: string }> {
  return import("@/lib/crash-report").then(({ reportCrash }) =>
    reportCrash({
      kind: "react.recovery",
      message: input.message,
      stack: input.stack,
      componentStack: input.componentStack,
      component: "ReactInstanceRecovery",
    }),
  );
}
