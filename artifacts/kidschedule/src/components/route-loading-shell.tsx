import { useLocation } from "wouter";
import { SmartRouteFallback } from "@/components/smart-route-fallback";
import {
  isV2SurfacePath,
  V2CalmLoadingShell,
} from "@/v2/shell/V2CalmLoadingShell";

/**
 * Auth / boot loading.
 * V2 surfaces: calm prepare only — never MEET AMY remount.
 * Classic surfaces: delayed full splash.
 */
export function RouteLoadingShell() {
  const [location] = useLocation();
  if (isV2SurfacePath(location)) {
    return <V2CalmLoadingShell />;
  }
  return <SmartRouteFallback mode="full" />;
}

/** Lazy chunk inside Layout — page skeleton after 150ms if chunk still loading. */
export function RouteContentLoadingShell() {
  return <SmartRouteFallback mode="content" />;
}
