import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/firebase-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";

export function useProfileComplete() {
  const { isSignedIn } = useAuth();
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => {
      const res = await authFetch("/api/onboarding");
      if (!res.ok) return { onboardingComplete: false, profileComplete: false };
      return res.json() as Promise<{ onboardingComplete: boolean; profileComplete: boolean }>;
    },
    enabled: !!isSignedIn,
    staleTime: 30_000,
  });

  return {
    profileComplete: data?.profileComplete ?? false,
    isLoading,
  };
}
