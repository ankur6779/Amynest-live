import type { RouteRedirect } from "./types";

/**
 * Authoritative migration redirect map (Phase 9 / Phase 11).
 * Application of redirects is gated by `migration_mode` / `today_v2` in later sprints.
 * Sprint 0 only registers the map for validation and future consumers.
 */
export const V2_ROUTE_REDIRECTS: readonly RouteRedirect[] = [
  {
    from: "/dashboard",
    to: "/today",
    reason: "Legacy home → Today",
  },
  {
    from: "/parenting-hub",
    to: "/for-child",
    reason: "Hub-as-home → For [Child] treasury",
  },
  {
    from: "/assistant",
    to: "/ask-amy",
    reason: "Assistant → Ask Amy alias",
  },
  {
    from: "/subscription-trial",
    to: "/today",
    reason: "Explore Free / trial interstitial not default post-onboard",
  },
  {
    from: "/learn-with-amy",
    to: "/amy-ai-tutor",
    reason: "Legacy alias → tutor route",
  },
  {
    from: "/profile",
    to: "/parent-profile",
    reason: "Legacy profile alias → Account",
  },
  {
    from: "/parenting-hub/speech-coach",
    to: "/speech-coach",
    reason: "Hub-nested speech → canonical speech",
  },
  {
    from: "/parenting-hub/talking-amy",
    to: "/talking-amy",
    reason: "Hub-nested Talking Amy → canonical",
  },
  {
    from: "/parenting-hub/speech-coach/live",
    to: "/speech-coach/live-session",
    reason: "Hub-nested live speech → canonical",
  },
  {
    from: "/speech-coach/live",
    to: "/speech-coach/live-session",
    reason: "Legacy live path → canonical session",
  },
  {
    from: "/learning-zone/smart-math-tricks",
    to: "/smart-math-tricks",
    reason: "Legacy learning-zone alias",
  },
] as const;

export function getRedirectTarget(path: string): string | null {
  const hit = V2_ROUTE_REDIRECTS.find((r) => r.from === path);
  return hit?.to ?? null;
}
