import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";
import {
  STORAGE_KEY_DRAFT,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_REMINDERS,
  type PtmPrepSyncPayload,
  type PtmReminder,
  type PtmSession,
} from "@workspace/ptm-prep";

function loadLocal(): PtmPrepSyncPayload {
  if (typeof window === "undefined") {
    return { draft: null, history: [], reminders: [], clientUpdatedAt: 0 };
  }
  try {
    const draftRaw = window.localStorage.getItem(STORAGE_KEY_DRAFT);
    const historyRaw = window.localStorage.getItem(STORAGE_KEY_HISTORY);
    const remindersRaw = window.localStorage.getItem(STORAGE_KEY_REMINDERS);
    return {
      draft: draftRaw ? (JSON.parse(draftRaw) as PtmSession) : null,
      history: historyRaw ? (JSON.parse(historyRaw) as PtmSession[]) : [],
      reminders: remindersRaw ? (JSON.parse(remindersRaw) as PtmReminder[]) : [],
      clientUpdatedAt: Number(window.localStorage.getItem("amynest.ptm_prep.client_updated_at.v1") ?? 0),
    };
  } catch {
    return { draft: null, history: [], reminders: [], clientUpdatedAt: 0 };
  }
}

function writeLocal(payload: PtmPrepSyncPayload): void {
  if (typeof window === "undefined") return;
  try {
    if (payload.draft) {
      window.localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(payload.draft));
    } else {
      window.localStorage.removeItem(STORAGE_KEY_DRAFT);
    }
    window.localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(payload.history));
    window.localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(payload.reminders));
    window.localStorage.setItem(
      "amynest.ptm_prep.client_updated_at.v1",
      String(payload.clientUpdatedAt),
    );
  } catch {
    /* ignore quota errors */
  }
}

export function usePtmPrepSync() {
  const authFetch = useAuthFetch();
  const { isSignedIn } = useAuth();
  const syncedRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  const pullFromServer = useCallback(async (): Promise<PtmPrepSyncPayload | null> => {
    if (!isSignedIn) return null;
    try {
      const res = await authFetch(getApiUrl("/api/ptm-prep/sync"));
      if (!res.ok) return null;
      return (await res.json()) as PtmPrepSyncPayload;
    } catch {
      return null;
    }
  }, [authFetch, isSignedIn]);

  const pushToServer = useCallback(
    async (payload: PtmPrepSyncPayload) => {
      if (!isSignedIn) return;
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
    [authFetch, isSignedIn],
  );

  const schedulePush = useCallback(
    (payload: PtmPrepSyncPayload) => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        void pushToServer(payload);
      }, 1200);
    },
    [pushToServer],
  );

  const persist = useCallback(
    (draft: PtmSession | null, history: PtmSession[], reminders: PtmReminder[]) => {
      const local = loadLocal();
      const payload: PtmPrepSyncPayload = {
        draft,
        history,
        reminders,
        clientUpdatedAt: Math.max(local.clientUpdatedAt, Date.now()),
      };
      writeLocal(payload);
      schedulePush(payload);
      return payload;
    },
    [schedulePush],
  );

  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    void (async () => {
      if (isSignedIn) {
        const server = await pullFromServer();
        if (server) {
          const local = loadLocal();
          const winner =
            server.clientUpdatedAt >= local.clientUpdatedAt ? server : local;
          writeLocal(winner);
          if (winner.clientUpdatedAt > server.clientUpdatedAt) {
            await pushToServer(winner);
          }
        }
      }
      setReady(true);
    })();
  }, [isSignedIn, pullFromServer, pushToServer]);

  return { persist, pullFromServer, ready };
}
