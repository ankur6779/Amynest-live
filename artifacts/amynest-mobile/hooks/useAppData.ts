import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth";
import { useAppStore } from "@/store/useAppStore";
import { setApiAuthGetter } from "@/services/api";

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Bootstraps the unified app-data layer:
 * 1. Wires the Clerk token getter into the API service
 * 2. Hydrates from AsyncStorage cache for instant UI
 * 3. Fetches fresh data in the background
 * 4. Auto-refreshes every 5 minutes while signed in
 *
 * Mount once at the root layout.
 */
export function useAppDataBootstrap(): void {
  const { isSignedIn, isLoaded, getToken, userId } = useAuth();
  const hydrate = useAppStore((s) => s.hydrateFromCache);
  const fetchAppData = useAppStore((s) => s.fetchAppData);
  const reset = useAppStore((s) => s.reset);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wire Clerk token getter into API service
  useEffect(() => {
    setApiAuthGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      void reset();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const currentUserId = userId ?? null;

    // Stale-while-revalidate: cache → fresh (scoped per user)
    void (async () => {
      await hydrate(currentUserId);
      await fetchAppData({ silent: true, userId: currentUserId });
    })();

    // Auto-refresh
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      void fetchAppData({ silent: true, userId: currentUserId });
    }, AUTO_REFRESH_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSignedIn, isLoaded, userId, hydrate, fetchAppData, reset]);
}
