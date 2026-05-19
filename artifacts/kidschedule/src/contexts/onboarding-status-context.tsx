import {
  createContext,
  useContext,
  useRef,
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

  // Single-flight lock. React StrictMode (and other re-mount races) can fire
  // the queryFn twice in dev, and even in prod a fast re-render can race a
  // retry against the original promise. The ref guarantees that at most one
  // `/api/onboarding` (+ `/api/children`) round-trip is in flight at a time;
  // concurrent callers await the original promise instead of issuing a new
  // network request.
  const inFlightRef = useRef<Promise<SetupStatus> | null>(null);

  return useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: async () => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }
      const run = (async (): Promise<SetupStatus> => {
        const token = await waitForIdToken(getToken);
        if (!token) {
          throw new Error("auth-token-pending");
        }
        const data = await resolveSetupStatus(authFetch);
        persistOnboardingCache(data);
        return data;
      })();
      inFlightRef.current = run;
      try {
        return await run;
      } finally {
        inFlightRef.current = null;
      }
    },
    enabled: isLoaded && isSignedIn,
    staleTime: STALE_MS,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: () => {
      const cached = readOnboardingCache();
      return isSetupComplete(cached) ? cached : undefined;
    },
    // Tight retry budget so the boot gate never sits on retries forever.
    // Previous setting was up to 8 retries with 4s backoff, which produced
    // 30+ seconds of `/api/onboarding` traffic when the token was slow to
    // arrive — see the splash-stuck bug report.
    retry: (failureCount, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "auth-token-pending") return failureCount < 2;
      if (msg === "auth-unauthorized") return false;
      if (error instanceof FetchTimeoutError) return false;
      return failureCount < 1;
    },
    retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 2000),
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
