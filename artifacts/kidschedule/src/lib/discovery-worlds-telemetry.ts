import { queueClientLog } from "@/lib/client-logs";
import { safeProductTrack } from "@/lib/analytics/safe-product-track";
import {
  buildDiscoveryWorldsAnalyticsMeta,
  formatDiscoveryWorldsLogMessage,
  type DiscoveryWorldsAnalyticsEvent,
  type WorldId,
} from "@workspace/world-engine";

/**
 * Platform telemetry for new discovery worlds.
 * Animal World continues using trackAnimalWorldEvent (unchanged).
 */
export function trackDiscoveryWorldsEvent(
  worldId: WorldId,
  event: DiscoveryWorldsAnalyticsEvent,
  detail: Record<string, unknown> = {},
): void {
  queueClientLog({
    type: "info",
    message: formatDiscoveryWorldsLogMessage(worldId, event),
    meta: buildDiscoveryWorldsAnalyticsMeta(worldId, event, detail),
  });
  if (event !== "world_daily_adventure_complete") return;
  safeProductTrack("discovery_completed", {
    feature_name: "discovery_worlds",
    world_id: String(worldId).slice(0, 64),
    outcome: "complete",
  });
}
