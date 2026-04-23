import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAuth } from "@/lib/firebase-auth";
import { useNetworkStore, selectIsOnline } from "@/store/useNetworkStore";
import { useAppStore } from "@/store/useAppStore";
import { syncOfflineData, setSyncAuthGetter } from "@/utils/syncService";
import { readQueue, setQueueUserId, clearQueue } from "@/utils/offlineQueue";

/**
 * Bootstraps the offline-first sync system:
 * 1. Initializes NetInfo listener
 * 2. Wires Clerk auth getter into the sync service
 * 3. Drains the offline action queue:
 *    - on mount
 *    - whenever the device comes back online
 *    - whenever the app foregrounds
 * 4. After a successful drain, refreshes /api/app-data
 *
 * Mount once at the root layout, alongside useAppDataBootstrap.
 */
export function useOfflineSyncBootstrap(): void {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const initNet = useNetworkStore((s) => s.init);
  const isOnline = useNetworkStore(selectIsOnline);
  const setQueueLength = useAppStore((s) => s.setQueueLength);
  const setSyncing = useAppStore((s) => s.setSyncing);
  const fetchAppData = useAppStore((s) => s.fetchAppData);

  const lastOnlineRef = useRef<boolean>(true);
  const drainingRef = useRef<boolean>(false);

  // Wire Clerk token getter
  useEffect(() => {
    setSyncAuthGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  // Initialize NetInfo
  useEffect(() => {
    const unsub = initNet();
    return () => {
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, [initNet]);

  // Scope the offline queue to the current user (prevents cross-account replay)
  useEffect(() => {
    setQueueUserId(userId ?? null);
    void readQueue().then((q) => setQueueLength(q.length));
  }, [userId, setQueueLength]);

  // On sign-out, drop the anon queue so stale items don't replay later
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      void clearQueue(null);
      setQueueLength(0);
    }
  }, [isLoaded, isSignedIn, setQueueLength]);

  const drain = async (): Promise<void> => {
    if (!isSignedIn) return;
    if (drainingRef.current) return;
    const queue = await readQueue();
    if (queue.length === 0) return;
    drainingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncOfflineData();
      const after = await readQueue();
      setQueueLength(after.length);
      if (result.succeeded > 0) {
        // Pull fresh server truth after applying queued mutations
        await fetchAppData({ silent: true });
      }
    } finally {
      drainingRef.current = false;
      setSyncing(false);
    }
  };

  // On reconnect (offline -> online), drain
  useEffect(() => {
    if (!isLoaded) return;
    const wasOffline = !lastOnlineRef.current;
    lastOnlineRef.current = isOnline;
    if (isOnline && wasOffline) {
      void drain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isLoaded]);

  // On mount (signed in & online), drain
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isOnline) return;
    void drain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  // On app foreground, drain
  useEffect(() => {
    const onChange = (state: AppStateStatus): void => {
      if (state === "active" && useNetworkStore.getState().isConnected) {
        void drain();
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
