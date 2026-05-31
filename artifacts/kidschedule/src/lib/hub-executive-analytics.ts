import { queueClientLog } from "@/lib/client-logs";

export type HubExecutiveEvent =
  | "hub_executive_view"
  | "hub_executive_tile_open"
  | "hub_executive_primary_action_tap"
  | "hub_executive_ask_amy"
  | "hub_executive_section_expand"
  | "hub_executive_retry"
  | "hub_executive_error";

let viewLoggedSession = false;

export function trackHubExecutiveEvent(
  event: HubExecutiveEvent,
  meta?: Record<string, string | number | boolean | null>,
): void {
  if (event === "hub_executive_view" && viewLoggedSession) return;
  if (event === "hub_executive_view") viewLoggedSession = true;

  queueClientLog({
    type: event === "hub_executive_error" ? "warning" : "info",
    message: `hub_executive:${event}`,
    context: "parent_hub",
    meta: { event, ...meta },
  });
}

export function resetHubExecutiveViewDedupe(): void {
  viewLoggedSession = false;
}

/** Performance budget targets documented for CI / manual review */
export const HUB_EXECUTIVE_PERF_BUDGET = {
  maxJsonBytes: 200_000,
  staleTimeMs: 300_000,
  skeletonPaintMs: 100,
  p95FetchMs: 2_000,
} as const;
