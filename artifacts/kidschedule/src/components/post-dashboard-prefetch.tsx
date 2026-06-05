import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  prefetchCommonDestinations,
  prefetchLikelyNextRoutes,
} from "@/lib/route-chunk-preload";
import { safePathStartsWith } from "@/lib/safe-route";

/**
 * Background prefetch: common hubs after dashboard, then likely next screens
 * on every route change (tab-bar adjacency).
 */
export function PostDashboardPrefetch() {
  const [location] = useLocation();
  const warmedRef = useRef(false);

  useEffect(() => {
    prefetchLikelyNextRoutes(location);
  }, [location]);

  useEffect(() => {
    if (warmedRef.current) return;
    if (!safePathStartsWith(location, "/dashboard")) return;

    warmedRef.current = true;
    prefetchCommonDestinations();
  }, [location]);

  return null;
}
