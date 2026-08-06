/**
 * Suspense fallback — full splash for classic boot; calm V2 shell for V2 paths.
 * Presentation craft only (C0-1). No routing changes.
 */

import { useLocation } from "wouter";
import { RouteLoadingShell } from "@/components/route-loading-shell";
import {
  isV2SurfacePath,
  V2CalmLoadingShell,
} from "@/v2/shell/V2CalmLoadingShell";

export function AppSuspenseFallback() {
  const [location] = useLocation();
  if (isV2SurfacePath(location)) {
    return <V2CalmLoadingShell />;
  }
  return <RouteLoadingShell />;
}
