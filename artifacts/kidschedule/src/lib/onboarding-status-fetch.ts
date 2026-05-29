import { waitForIdToken } from "@/lib/auth-token";
import {
  persistOnboardingCache,
  readOnboardingCache,
  repairLocalFromServerComplete,
  resolveSetupStatus,
  type SetupStatus,
} from "@/lib/setup-status";

type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type GetTokenFn = (opts?: { skipCache?: boolean }) => Promise<string | null>;

let inFlight: Promise<SetupStatus> | null = null;

/**
 * Single-flight `/api/onboarding` fetch while a request is in flight.
 * Concurrent callers (StrictMode remounts, parallel hooks) share one promise.
 */
export async function fetchOnboardingStatusOnce(
  authFetch: AuthFetchFn,
  getToken: GetTokenFn,
): Promise<SetupStatus> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const token = await waitForIdToken(getToken);
    if (!token) {
      throw new Error("auth-token-pending");
    }
    const data = await resolveSetupStatus(authFetch);
    const cached = readOnboardingCache();
    const repaired = repairLocalFromServerComplete(data, cached);
    persistOnboardingCache(repaired);
    return repaired;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function resetOnboardingFetchLock(): void {
  inFlight = null;
}
