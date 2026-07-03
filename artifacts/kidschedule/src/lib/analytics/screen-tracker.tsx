import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getAnalyticsService } from "./analytics-service";

function pathToScreen(path: string): string {
  const base = path.split("?")[0] || "/";
  return base;
}

/**
 * Automatic screen_view / screen_leave on every route change.
 * Mount once inside the router.
 */
export function AnalyticsScreenTracker(): null {
  const [location] = useLocation();
  const service = getAnalyticsService();
  const prevPath = useRef<string | null>(null);
  const enteredAt = useRef<number>(Date.now());

  useEffect(() => {
    const path = location || "/";
    const screen = pathToScreen(path);
    const now = Date.now();

    if (prevPath.current !== null && prevPath.current !== path) {
      service.trackScreenLeave(pathToScreen(prevPath.current), now - enteredAt.current, screen);
    }

    service.trackScreenView(path);
    prevPath.current = path;
    enteredAt.current = now;
  }, [location, service]);

  useEffect(() => {
    return () => {
      if (prevPath.current) {
        service.trackScreenLeave(
          pathToScreen(prevPath.current),
          Date.now() - enteredAt.current,
        );
      }
    };
  }, [service]);

  return null;
}
