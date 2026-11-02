import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getAnalyticsService } from "./analytics-service";
import { featureForRoute, matchAppRoute } from "./route-catalog";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type Visit = {
  path: string;
  pageName: string;
  feature: string | null;
  visitId: string;
  transitionId: string;
  activeMs: number;
  runningSince: number | null;
};

/**
 * One page_view / page_exit per location change.
 * React strict-mode remounts are collapsed with a microtask so rerenders
 * do not create a second page view. Modals are not locations and are ignored.
 * Active duration pauses while the document is hidden.
 */
export function AnalyticsScreenTracker(): null {
  const [location] = useLocation();
  const service = getAnalyticsService();
  const visitRef = useRef<Visit | null>(null);
  const depthsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const path = location || "/";
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const now = Date.now();
      const previous = visitRef.current;
      if (previous && previous.path !== path) {
        const active = previous.runningSince
          ? previous.activeMs + (now - previous.runningSince)
          : previous.activeMs;
        service.trackPageExit(previous.pageName, {
          path: previous.path,
          screen: previous.path,
          page_name: previous.pageName,
          page_visit_id: previous.visitId,
          route_transition_id: previous.transitionId,
          feature_name: previous.feature ?? undefined,
          next_page: matchAppRoute(path),
          active_duration_ms: active,
          page_duration_ms: active,
        });
      }
      if (previous?.path === path) return;

      const pageName = matchAppRoute(path);
      const feature = featureForRoute(path);
      const visit: Visit = {
        path,
        pageName,
        feature,
        visitId: newId(),
        transitionId: newId(),
        activeMs: 0,
        runningSince: document.visibilityState === "hidden" ? null : now,
      };
      visitRef.current = visit;
      depthsRef.current = new Set();
      service.trackPageView(pageName, {
        path,
        screen: path,
        page_name: pageName,
        previous_page: previous?.pageName,
        referrer_page: previous?.pageName,
        page_visit_id: visit.visitId,
        route_transition_id: visit.transitionId,
        feature_name: feature ?? undefined,
        navigation_source: previous ? "spa" : "entry",
      });
      if (feature) {
        service.trackFeatureUsage(feature, "viewed", {
          source: "route",
          page_visit_id: visit.visitId,
        });
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [location, service]);

  useEffect(() => {
    const onVisibility = () => {
      const visit = visitRef.current;
      if (!visit) return;
      const now = Date.now();
      if (document.visibilityState === "hidden") {
        if (visit.runningSince) {
          visit.activeMs += now - visit.runningSince;
          visit.runningSince = null;
        }
      } else if (!visit.runningSince) {
        visit.runningSince = now;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const visit = visitRef.current;
      if (!visit) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      for (const mark of [25, 50, 75, 100] as const) {
        if (pct >= mark && !depthsRef.current.has(mark)) {
          depthsRef.current.add(mark);
          service.trackScrollMilestone(mark, visit.visitId);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [service]);

  useEffect(() => {
    return () => {
      const visit = visitRef.current;
      if (!visit) return;
      const now = Date.now();
      const active = visit.runningSince ? visit.activeMs + (now - visit.runningSince) : visit.activeMs;
      service.trackPageExit(visit.pageName, {
        path: visit.path,
        screen: visit.path,
        page_name: visit.pageName,
        page_visit_id: visit.visitId,
        feature_name: visit.feature ?? undefined,
        active_duration_ms: active,
        page_duration_ms: active,
      });
      visitRef.current = null;
    };
  }, [service]);

  return null;
}
