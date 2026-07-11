import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { AuthBootShell } from "@/components/auth-boot-shell";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import {
  isOnboardingStatusBootLoading,
  useOnboardingStatus,
} from "@/contexts/onboarding-status-context";
import { devLog } from "@/lib/dev-log";
import { setNavigationBootstrapComplete } from "@/lib/navigation-orchestrator";
import { trackStartupFunnel } from "@/lib/startup-funnel";
import {
  forceSyncAuthFromCurrentUser,
  hasUsableAuthSession,
} from "@/lib/firebase-auth-listener";

// Hard ceiling: even if the onboarding query is still retrying after this
// many ms, we let the app render. The page-level guards (HomeRedirect,
// ProtectedRoute, OnboardingRouteGuard) all handle `isError` / `isPending`
// fallbacks themselves, so it is safe — and far better than a frozen splash.
const BOOT_HARD_TIMEOUT_MS = 8000;

/**
 * Single boot gate: Firebase auth + one onboarding-status fetch (signed-in only).
 *
 * Implements the "isAppReady" pattern: a one-way latch. Once we flip ready,
 * we never flip back to "loading" again, even if a downstream query starts
 * refetching. That stops any chance of the splash re-appearing mid-session
 * and bouncing the route guards into another /api/onboarding storm.
 */
export function AppInitGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, authStatus } = useAuth();
  const { user } = useUser();
  const onboarding = useOnboardingStatus();

  const authLoading = !isLoaded || authStatus === "loading";
  const signedIn = isSignedIn && authStatus === "authenticated";
  const setupBootLoading = signedIn && isOnboardingStatusBootLoading(onboarding);

  const [isAppReady, setIsAppReady] = useState(false);
  // Hard timeout — drives `forcedReady`. Once true, never resets.
  const [forcedReady, setForcedReady] = useState(false);

  // One-way latch: as soon as auth + onboarding both resolve once, we lock
  // `isAppReady` to true. Subsequent refetches never re-trigger the splash.
  // Note: no state read inside the effect that depends on `isAppReady` itself
  // (would cause the BAD pattern called out in the bug report).
  useEffect(() => {
    if (authStatus === "timeout" && hasUsableAuthSession()) {
      forceSyncAuthFromCurrentUser();
    }
  }, [authStatus]);

  useEffect(() => {
    if (isAppReady) return;
    if (authStatus === "timeout" && !hasUsableAuthSession()) return;
    if (authLoading) return;
    if (setupBootLoading) return;
    setIsAppReady(true);
  }, [isAppReady, authStatus, authLoading, setupBootLoading]);

  // Hard guard: force-render the app after BOOT_HARD_TIMEOUT_MS even if
  // something downstream is still stuck. The route guards take over from
  // here. Single-flight: the timer is set once on mount, never restarted.
  const hardTimeoutSetRef = useRef(false);
  useEffect(() => {
    if (hardTimeoutSetRef.current) return;
    hardTimeoutSetRef.current = true;
    const id = window.setTimeout(() => {
      setForcedReady(true);
    }, BOOT_HARD_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, []);

  const ready = isAppReady || forcedReady;

  useEffect(() => {
    if (!ready) return;
    trackStartupFunnel("router_ready");
  }, [ready]);

  useEffect(() => {
    setNavigationBootstrapComplete(ready);
    return () => setNavigationBootstrapComplete(false);
  }, [ready]);

  useEffect(() => {
    devLog("[boot] Auth loading:", authLoading, "authStatus:", authStatus);
    devLog("[boot] User:", user?.id ?? null);
    devLog(
      "[boot] App ready:",
      ready,
      "setupBootLoading:",
      setupBootLoading,
      "forcedReady:",
      forcedReady,
    );
  }, [authLoading, authStatus, user?.id, ready, setupBootLoading, forcedReady]);

  if (authStatus === "timeout" && !forcedReady && !hasUsableAuthSession()) {
    return (
      <AppFallbackUi
        title="Sign-in check timed out"
        message="Firebase auth did not respond in time. Reload to try again."
        onReload={() => window.location.reload()}
      />
    );
  }

  if (!ready) {
    return <AuthBootShell />;
  }

  return <>{children}</>;
}
