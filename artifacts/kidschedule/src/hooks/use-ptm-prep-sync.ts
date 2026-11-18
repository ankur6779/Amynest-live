import { parseApiJson } from "@/lib/safe-json-response";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";
import {
  loadPtmPrepLocal,
  writePtmPrepLocal,
} from "@/lib/ptm-prep-storage";
import type {
  PtmPrepSyncPayload,
  PtmReminder,
  PtmSession,
} from "@workspace/ptm-prep";

export function usePtmPrepSync() {
  const authFetch = useAuthFetch();
  const { isSignedIn, userId } = useAuth();
  const syncGenRef = useRef(0);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  const pullFromServer = useCallback(async (): Promise<PtmPrepSyncPayload | null> => {
    if (!isSignedIn || !userId) return null;
    try {
      const res = await authFetch(getApiUrl("/api/ptm-prep/sync"));
      if (!res.ok) return null;
      return await parseApiJson<PtmPrepSyncPayload>(res);
    } catch {
      return null;
    }
  }, [authFetch, isSignedIn, userId]);

  const pushToServer = useCallback(
    async (payload: PtmPrepSyncPayload) => {
      if (!isSignedIn || !userId) return;
      try {
        await authFetch(getApiUrl("/api/ptm-prep/sync"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        /* offline — local copy remains source of truth until next push */
      }
    },
    [authFetch, isSignedIn, userId],
  );

  const schedulePush = useCallback(
    (payload: PtmPrepSyncPayload) => {
      if (!userId) return;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        void pushToServer(payload);
      }, 1200);
    },
    [pushToServer, userId],
  );

  const persist = useCallback(
    (draft: PtmSession | null, history: PtmSession[], reminders: PtmReminder[]) => {
      if (!userId) return emptyForSignedOut();
      const local = loadPtmPrepLocal(userId);
      const payload: PtmPrepSyncPayload = {
        draft,
        history,
        reminders,
        clientUpdatedAt: Math.max(local.clientUpdatedAt, Date.now()),
      };
      writePtmPrepLocal(userId, payload);
      schedulePush(payload);
      return payload;
    },
    [schedulePush, userId],
  );

  useEffect(() => {
    const gen = ++syncGenRef.current;
    setReady(false);
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }

    void (async () => {
      if (isSignedIn && userId) {
        const server = await pullFromServer();
        if (gen !== syncGenRef.current) return;
        if (server) {
          const local = loadPtmPrepLocal(userId);
          const winner =
            server.clientUpdatedAt >= local.clientUpdatedAt ? server : local;
          writePtmPrepLocal(userId, winner);
          if (winner.clientUpdatedAt > server.clientUpdatedAt) {
            await pushToServer(winner);
          }
        }
      }
      if (gen !== syncGenRef.current) return;
      setReady(true);
    })();

    return () => {
      syncGenRef.current += 1;
    };
  }, [isSignedIn, userId, pullFromServer, pushToServer]);

  return { persist, pullFromServer, ready, userId };
}

function emptyForSignedOut(): PtmPrepSyncPayload {
  return { draft: null, history: [], reminders: [], clientUpdatedAt: 0 };
}
