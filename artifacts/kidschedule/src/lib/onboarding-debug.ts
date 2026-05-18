import type { ShimUser } from "@/lib/firebase-auth-context";
import type { Entitlements } from "@/hooks/use-subscription";

/** Production-safe debug logs for onboarding → dashboard handoff. */
export function logOnboardingState(
  phase: string,
  user: ShimUser | null | undefined,
  extras?: {
    entitlements?: Entitlements | null;
    isLoaded?: boolean;
    isSignedIn?: boolean;
  },
): void {
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "";
  console.log(`[onboarding] ${phase}`, {
    userId: user?.id ?? null,
    firstName: user?.firstName ?? "",
    email,
    profile: {
      name: user?.fullName ?? "",
      imageUrl: user?.imageUrl ?? null,
    },
    plan: extras?.entitlements?.plan ?? null,
    isPremium: extras?.entitlements?.isPremium ?? null,
    authLoaded: extras?.isLoaded ?? null,
    isSignedIn: extras?.isSignedIn ?? null,
  });
}

export function logDashboardMount(payload: {
  user: ShimUser | null | undefined;
  isLoaded: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  loadingSummary?: boolean;
  subLoading?: boolean;
}): void {
  console.log("[dashboard] mount", {
    userId: payload.user?.id ?? null,
    firstName: payload.user?.firstName ?? "",
    isLoaded: payload.isLoaded,
    isSignedIn: payload.isSignedIn,
    isLoading: payload.isLoading,
    loadingSummary: payload.loadingSummary ?? null,
    subLoading: payload.subLoading ?? null,
  });
}
