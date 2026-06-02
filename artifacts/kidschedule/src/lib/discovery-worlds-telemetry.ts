import { queueClientLog } from "@/lib/client-logs";
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
}
