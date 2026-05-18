import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/firebase-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  fetchSetupStatus,
  isSetupComplete,
  type OnboardingStatusPayload,
} from "@/lib/onboarding-status";

export function useOnboardingStatus(enabled = true) {
  const { isSignedIn, isLoaded } = useAuth();
  const authFetch = useAuthFetch();

  return useQuery<OnboardingStatusPayload>({
    queryKey: ["onboarding-status"],
    queryFn: () => fetchSetupStatus(authFetch),
    enabled: enabled && isLoaded && !!isSignedIn,
    staleTime: 30_000,
  });
}

export { isSetupComplete, type OnboardingStatusPayload };
