import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { prefetchCommonDestinations } from "@/lib/route-chunk-preload";
import { safePathStartsWith } from "@/lib/safe-route";

/**
 * After the user lands on dashboard, warm the most common hub chunks during
 * idle time so tab / menu navigation feels instant.
 */
export function PostDashboardPrefetch() {
  const [location] = useLocation();
  const warmedRef = useRef(false);

  useEffect(() => {
    if (warmedRef.current) return;
    if (!safePathStartsWith(location, "/dashboard")) return;

    warmedRef.current = true;
    prefetchCommonDestinations();
  }, [location]);

  return null;
}
