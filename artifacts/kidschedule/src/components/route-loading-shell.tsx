import { SmartRouteFallback } from "@/components/smart-route-fallback";

/** Auth / boot — splash only after 150ms if still resolving. */
export function RouteLoadingShell() {
  return <SmartRouteFallback mode="full" />;
}

/** Lazy chunk inside Layout — page skeleton after 150ms if chunk still loading. */
export function RouteContentLoadingShell() {
  return <SmartRouteFallback mode="content" />;
}
