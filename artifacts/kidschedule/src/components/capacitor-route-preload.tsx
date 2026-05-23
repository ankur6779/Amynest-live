import { useEffect } from "react";
import { isAndroidLiteClient } from "@/lib/device-lite";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { prefetchCapacitorHotRoutes } from "@/lib/route-chunk-preload";

/** Warm bottom-nav route chunks on native / Android after first paint. */
export function CapacitorRoutePreload() {
  useEffect(() => {
    if (!isNativeAmyNestShell() && !isAndroidLiteClient()) return;

    const delayMs = isNativeAmyNestShell() ? 900 : 1400;
    const timer = window.setTimeout(() => {
      prefetchCapacitorHotRoutes();
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
