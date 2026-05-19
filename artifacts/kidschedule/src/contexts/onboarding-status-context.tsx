import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { waitForIdToken } from "@/lib/auth-token";
import { FetchTimeoutError } from "@/lib/fetch-with-timeout";
import {
  isSetupComplete,
  persistOnboardingCache,
  readOnboardingCache,
  resolveSetupStatus,
  type SetupStatus,
} from "@/lib/setup-status";

const ONBOARDING_QUERY_KEY = ["onboarding-status"] as const;
const STALE_MS = 5 * 60 * 1000;

function useOnboardingStatusQuery(): UseQueryResult<SetupStatus, Error> {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const authFetch = useAuthFetch();

  return useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: async () => {
      const token = await waitForIdToken(getToken);
      if (!token) {
        throw new Error("auth-token-pending");
      }
      const data = await resolveSetupStatus(authFetch);
      persistOnboardingCache(data);
      return data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: STALE_MS,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: () => {
      const cached = readOnboardingCache();
      return isSetupComplete(cached) ? cached : undefined;
    },
    retry: (failureCount, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "auth-token-pending") return failureCount < 8;
      if (msg === "auth-unauthorized") return false;
      if (error instanceof FetchTimeoutError) return failureCount < 1;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(300 * 2 ** attempt, 4000),
  });
}

const OnboardingStatusContext = createContext<UseQueryResult<SetupStatus, Error> | null>(
  null,
);

export function OnboardingStatusProvider({ children }: { children: ReactNode }) {
  const query = useOnboardingStatusQuery();
  return (
    <OnboardingStatusContext.Provider value={query}>
      {children}
    </OnboardingStatusContext.Provider>
  );
}

export function useOnboardingStatus(): UseQueryResult<SetupStatus, Error> {
  const ctx = useContext(OnboardingStatusContext);
  if (!ctx) {
    throw new Error("useOnboardingStatus must be used within OnboardingStatusProvider");
  }
  return ctx;
}

/** True only on the first load when there is no cached/placeholder data yet. */
export function isOnboardingStatusBootLoading(
  query: Pick<UseQueryResult<SetupStatus, Error>, "isPending" | "data">,
): boolean {
  return query.isPending && query.data === undefined;
}
