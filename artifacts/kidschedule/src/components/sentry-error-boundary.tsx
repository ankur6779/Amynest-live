import type { ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { renderCriticalFallbackHtml } from "@/components/app-fallback-ui";

type Props = {
  children: ReactNode;
};

export function SentryErrorBoundary({ children }: Props) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
            <h1 className="text-xl font-semibold">AmyNest hit a snag</h1>
            <p className="text-muted-foreground max-w-md">{message}</p>
            <button
              type="button"
              className="rounded-xl bg-primary px-4 py-2 text-primary-foreground"
              onClick={() => resetError()}
            >
              Try again
            </button>
          </div>
        );
      }}
      beforeCapture={(scope) => {
        scope.setTag("boundary", "sentry_root");
        if (typeof window !== "undefined") {
          scope.setTag("route", window.location.pathname);
        }
      }}
      showDialog={false}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

/** Minimal fallback when React tree cannot mount at all. */
export function sentryMountFallback(root: HTMLElement): void {
  renderCriticalFallbackHtml(root);
}
