import type { ComponentType } from "react";
import RouteFailedPage from "@/pages/route-failed";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { RouteLoadingShell } from "@/components/route-loading-shell";
import { Suspense } from "react";

type Props = {
  component: ComponentType | undefined | null;
  label?: string;
  suspense?: boolean;
};

/** Guards missing lazy chunks and isolates page crashes. */
export function SafeRoutePage({
  component: Component,
  label = "Page",
  suspense = false,
}: Props) {
  if (!Component) {
    return <RouteFailedPage />;
  }
  const body = <Component />;
  return (
    <AppErrorBoundary label={label}>
      {suspense ? <Suspense fallback={<RouteLoadingShell />}>{body}</Suspense> : body}
    </AppErrorBoundary>
  );
}
