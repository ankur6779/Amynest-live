import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { normalizeFirebaseActionUrl } from "@/lib/firebase-action-url-normalize";
import { FIREBASE_ACTION_PATH, hasFirebaseActionParams } from "@/lib/firebase-action-params";

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

    const targetPath = target.split("?")[0] || FIREBASE_ACTION_PATH;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === target) return;

    console.info("[firebase-action-gate] Normalizing action URL", {
      from: window.location.href,
      to: target,
    });
    window.history.replaceState(null, "", target);
    if (pathname !== targetPath) {
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
