import type { ComponentType } from "react";
import { Suspense } from "react";
import RouteFailedPage from "@/pages/route-failed";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { RouteContentLoadingShell } from "@/components/route-loading-shell";

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
        <Suspense fallback={<RouteContentLoadingShell />}>{body}</Suspense>
      ) : (
        body
      )}
    </AppErrorBoundary>
  );
}
