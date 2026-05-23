import { useNetworkStore, selectIsOnline } from "@/store/useNetworkStore";
import { useAppStore } from "@/store/useAppStore";
import { enqueueAction, queueLength, type QueuedActionType } from "@/utils/offlineQueue";
import { syncOfflineData } from "@/utils/syncService";

/**
 * Submit an action: enqueue it durably, then if online try to drain the
 * queue immediately. Otherwise it stays queued for the next reconnect.
 *
 * Returns:
 *   - { mode: "online" }  if the queue is empty after the call (action sent)
 *   - { mode: "queued" }  if it was retained for later sync
 */
export async function submitAction(
  type: QueuedActionType,
  payload: Record<string, unknown>,
): Promise<{ mode: "online" | "queued" }> {
  const online = selectIsOnline(useNetworkStore.getState());

  await enqueueAction(type, payload);
  let len = await queueLength();
  useAppStore.getState().setQueueLength(len);

  if (!online) return { mode: "queued" };

  useAppStore.getState().setSyncing(true);
  let drainedAny = false;
  try {
    const result = await syncOfflineData();
    drainedAny = result.succeeded > 0;
  } finally {
    useAppStore.getState().setSyncing(false);
  }
  len = await queueLength();
  useAppStore.getState().setQueueLength(len);

  // Refresh canonical app-data snapshot if any mutation actually landed.
  if (drainedAny) {
    void useAppStore.getState().fetchAppData({ silent: true });
  }

  return len === 0 ? { mode: "online" } : { mode: "queued" };
}
