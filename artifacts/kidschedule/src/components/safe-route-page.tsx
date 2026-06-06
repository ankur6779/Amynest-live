import type { ComponentType } from "react";
import { Suspense } from "react";
import RouteFailedPage from "@/pages/route-failed";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { RouteContentLoadingShell } from "@/components/route-loading-shell";
import { trackRender } from "@/lib/render-loop-guard";
import { isRouteQuarantined } from "@/lib/self-healing/route-quarantine";
import { navigateToSafeRoute } from "@/lib/crash-recovery";

type Props = {
  component: ComponentType | undefined | null;
  label?: string;
  suspense?: boolean;
};

/** Guards missing lazy chunks and isolates page crashes. */
export function SafeRoutePage({
  component: Component,
  label = "Page",
  suspense = true,
}: Props) {
  if (!Component) {
    return <RouteFailedPage />;
  }

  if (isRouteQuarantined(label)) {
    return (
      <AppFallbackUi
        message="This screen was paused to keep AmyNest stable.\nPlease try again or go home."
        onTryAgain={() => {
          window.location.reload();
        }}
        onGoHome={() => navigateToSafeRoute()}
      />
    );
  }

  if (import.meta.env.DEV) {
    trackRender(label);
  }
  const body = <Component />;
  return (
    <AppErrorBoundary label={label}>
      {suspense ? (
        <Suspense fallback={<RouteContentLoadingShell />}>{body}</Suspense>
      ) : (
        body
      )}
    </AppErrorBoundary>
  );
}
