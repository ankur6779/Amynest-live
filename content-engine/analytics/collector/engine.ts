import type { CollectRequest, CollectResult } from "../../types/analytics.js";
import type { AnalyticsProvider } from "../providers/types.js";

/** Collect video/channel/shorts metrics through the configured provider. */
export async function collectAnalytics(
  provider: AnalyticsProvider,
  request: CollectRequest,
): Promise<CollectResult> {
  return provider.collect(request);
}
