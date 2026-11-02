import { track, type AnalyticsEventName, type AnalyticsEventProps } from "@/lib/analytics";

/** Product-spine emit. Never throws into a feature flow. */
export function safeProductTrack<E extends AnalyticsEventName>(
  name: E,
  props: AnalyticsEventProps<E>,
): void {
  try {
    track(name, props);
  } catch {
    /* measurement must not break the feature */
  }
}
