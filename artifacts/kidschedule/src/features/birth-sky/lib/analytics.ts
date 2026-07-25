/**
 * Birth Sky analytics facade — client-log channel with scrub (IM-0).
 * Event names are owned by event-taxonomy.ts (do not rename).
 */

import { queueClientLog } from "@/lib/client-logs";
import { scrubBirthSkyAnalyticsProps } from "./analytics-scrub";
import {
  type BirthSkyAnalyticsEvent,
  isBirthSkyEventName,
} from "./event-taxonomy";

export type { BirthSkyAnalyticsEvent } from "./event-taxonomy";
export {
  BIRTH_SKY_EVENT_NAMES,
  BIRTH_SKY_IM0_EMITTED_EVENTS,
  isBirthSkyEventName,
} from "./event-taxonomy";

export function trackBirthSkyEvent(
  event: BirthSkyAnalyticsEvent,
  props?: Record<string, unknown>,
): void {
  if (!isBirthSkyEventName(event)) {
    queueClientLog({
      type: "warning",
      message: `[birth-sky] analytics_unknown_event`,
      meta: { feature: "birth_sky", event: "analytics_unknown_event", attempted_event: String(event) },
    });
    return;
  }

  const scrubbed = scrubBirthSkyAnalyticsProps(props);
  if (!scrubbed.ok) {
    queueClientLog({
      type: "warning",
      message: `[birth-sky] analytics_scrub_rejected`,
      meta: {
        feature: "birth_sky",
        event: "analytics_scrub_rejected",
        reason: scrubbed.reason,
        attempted_event: event,
      },
    });
    return;
  }

  queueClientLog({
    type: "info",
    message: `[birth-sky] ${event}`,
    meta: { feature: "birth_sky", event, ...scrubbed.props },
  });
}
