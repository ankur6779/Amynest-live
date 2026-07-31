/**
 * Optional cloud-sync port for Discovery Worlds progress.
 * LocalStorage remains the source of truth until a remote adapter is wired.
 * Dual-write / pull-merge can be added without changing callers.
 */

import type {
  HubDailyAdventureProgress,
  WorldId,
  WorldProgressV2,
} from "@workspace/world-engine";

export type DiscoveryProgressSyncPort = {
  pullWorldProgress?(
    worldId: WorldId,
    childId: number,
  ): Promise<WorldProgressV2 | null>;
  pushWorldProgress?(
    worldId: WorldId,
    childId: number,
    progress: WorldProgressV2,
  ): Promise<void>;
  pullHubDaily?(childId: number): Promise<HubDailyAdventureProgress | null>;
  pushHubDaily?(childId: number, progress: HubDailyAdventureProgress): Promise<void>;
};

let syncPort: DiscoveryProgressSyncPort | null = null;

export function setDiscoveryProgressSyncPort(port: DiscoveryProgressSyncPort | null): void {
  syncPort = port;
}

export function getDiscoveryProgressSyncPort(): DiscoveryProgressSyncPort | null {
  return syncPort;
}

/** Fire-and-forget push; never throws into gameplay paths. */
export function notifyWorldProgressSaved(
  worldId: WorldId,
  childId: number,
  progress: WorldProgressV2,
): void {
  const push = syncPort?.pushWorldProgress;
  if (!push) return;
  void Promise.resolve(push(worldId, childId, progress)).catch(() => {
    /* remote optional */
  });
}

export function notifyHubDailySaved(
  childId: number,
  progress: HubDailyAdventureProgress,
): void {
  const push = syncPort?.pushHubDaily;
  if (!push) return;
  void Promise.resolve(push(childId, progress)).catch(() => {
    /* remote optional */
  });
}
