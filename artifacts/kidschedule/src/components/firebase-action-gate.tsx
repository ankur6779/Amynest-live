import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  FIREBASE_ACTION_PATH,
  normalizeFirebaseActionUrl,
} from "@/lib/firebase-action-url-normalize";
import { hasFirebaseActionParams } from "@/lib/firebase-action-params";

/**
 * Normalizes Firebase action URLs before routing (Render static host rewrites
 * /auth/action → /index.html). Always renders children — /auth/action route
 * handles verify + reset.
 */
export function FirebaseActionGate({ children }: { children: ReactNode }) {
  const [pathname, setLocation] = useLocation();

  useEffect(() => {
    const target = normalizeFirebaseActionUrl();
    if (!target) return;

    const current = `${pathname}${window.location.search}${window.location.hash}`;
    if (current !== target) {
      console.info("[firebase-action-gate] Normalizing action URL", {
        from: window.location.href,
        to: target,
      });
      window.history.replaceState(null, "", target);
      setLocation(target);
    }
  }, [pathname, setLocation]);

  return <>{children}</>;
}

/** Run before React route matching (e.g. in index bootstrap). */
export function peekFirebaseActionMode(): string | null {
  if (typeof window === "undefined") return null;
  if (!hasFirebaseActionParams()) return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("mode");
}

export { FIREBASE_ACTION_PATH };
