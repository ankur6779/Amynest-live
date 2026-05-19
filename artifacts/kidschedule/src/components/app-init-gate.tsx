import { useEffect, type ReactNode } from "react";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { AuthBootShell } from "@/components/auth-boot-shell";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import {
  isOnboardingStatusBootLoading,
  useOnboardingStatus,
} from "@/contexts/onboarding-status-context";

/**
 * Single boot gate: Firebase auth + one onboarding-status fetch (signed-in only).
 * Avoids stacking loaders and duplicate /api/onboarding calls from route guards.
 */
export function AppInitGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, authStatus } = useAuth();
  const { user } = useUser();
  const onboarding = useOnboardingStatus();

  const authLoading = !isLoaded || authStatus === "loading";
  const signedIn = isSignedIn && authStatus === "authenticated";
  const setupBootLoading = signedIn && isOnboardingStatusBootLoading(onboarding);
  const isAppReady = !authLoading && !setupBootLoading;

  useEffect(() => {
    console.log("[boot] Auth loading:", authLoading, "authStatus:", authStatus);
    console.log("[boot] User:", user?.id ?? null);
    console.log("[boot] App ready:", isAppReady, "setupBootLoading:", setupBootLoading);
  }, [authLoading, authStatus, user?.id, isAppReady, setupBootLoading]);

  if (authStatus === "timeout") {
    return (
      <AppFallbackUi
        title="Sign-in check timed out"
        message="Firebase auth did not respond in time. Reload to try again."
        onReload={() => window.location.reload()}
      />
    );
  }

  if (!isAppReady) {
    return <AuthBootShell />;
  }

  return <>{children}</>;
}
