import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { logNavEvent } from "@/lib/navigation-log";
import {
  beginPopstateSkip,
  endPopstateSkip,
  getRecentRoutes,
  normalizeRoutePath,
  shouldReplaceNavigation,
  shouldSkipPopstateRoute,
} from "@/lib/navigation-stack";
import {
  consumeAuthoritativeTransition,
  recordSanitizedTransition,
} from "@/lib/route-history-manager";

/**
 * Tracks SPA route transitions and guards Android PWA hardware-back against
 * duplicate history entries (e.g. Parent Hub ↔ Speech Coach loops).
 */
export function NavigationHistoryGuard() {
  const [location] = useLocation();
  const prevLocationRef = useRef<string | null>(null);
  const popstateInstalledRef = useRef(false);

  useEffect(() => {
    if (popstateInstalledRef.current || typeof window === "undefined") return;
    popstateInstalledRef.current = true;

    const onPopState = () => {
      const path = normalizeRoutePath(window.location.pathname);
      const from = prevLocationRef.current ?? path;

      if (shouldSkipPopstateRoute(path)) {
        logNavEvent("popstate-skip-duplicate", { path, from });
        beginPopstateSkip();
        try {
          window.history.go(-1);
        } catch {
          endPopstateSkip();
          return;
        }
        window.setTimeout(endPopstateSkip, 50);
        return;
      }

      recordSanitizedTransition(from, path, "pop");
      prevLocationRef.current = path;
      logNavEvent("popstate", { path, from });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const normalized = normalizeRoutePath(location);
    const stack = getRecentRoutes();
    if (stack[stack.length - 1] === normalized) {
      prevLocationRef.current = normalized;
      return;
    }
    const prev = prevLocationRef.current;
    if (prev && prev !== normalized) {
      const authoritative = consumeAuthoritativeTransition(normalized);
      const method =
        authoritative ??
        (shouldReplaceNavigation(prev, normalized) ? "replace" : "push");
      recordSanitizedTransition(prev, normalized, method);
    } else if (!prev) {
      const authoritative = consumeAuthoritativeTransition(normalized);
      recordSanitizedTransition(
        normalized,
        normalized,
        authoritative ?? "replace",
      );
    }
    prevLocationRef.current = normalized;
  }, [location]);

  return null;
}
