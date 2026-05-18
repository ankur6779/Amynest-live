import { RouteLoadingShell } from "@/components/route-loading-shell";

/** Shown while async AI data is loading or not yet available — avoids render crashes. */
export function ApiDataLoader() {
  return <RouteLoadingShell />;
}
