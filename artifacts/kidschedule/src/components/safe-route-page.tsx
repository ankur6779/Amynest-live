import type { ComponentType } from "react";
import { Suspense, useEffect, useState } from "react";
import RouteFailedPage from "@/pages/route-failed";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { RouteContentLoadingShell } from "@/components/route-loading-shell";

const ROUTE_FALLBACK_DELAY_MS = 120;

function DelayedRouteContentLoadingShell() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShow(true), ROUTE_FALLBACK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;
  return <RouteContentLoadingShell />;
}

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
  const body = <Component />;
  return (
    <AppErrorBoundary label={label}>
      {suspense ? (
        <Suspense fallback={<DelayedRouteContentLoadingShell />}>{body}</Suspense>
      ) : (
        body
      )}
    </AppErrorBoundary>
  );
}
