import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();

vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => track(...args),
  trackFeatureUsage: vi.fn(),
}));

import { trackSessionComplete, trackSessionStart } from "@/features/health-lab/health-lab-analytics";
import { trackFeedLogged, trackGrowthMeasurementAdded, trackInfantHubOpened } from "@/lib/infant-hub-analytics";
import { trackTalkingAmySessionStarted } from "@/lib/talking-amy-telemetry";

describe("feature lifecycle product events", () => {
  beforeEach(() => {
    track.mockClear();
  });

  it("talking amy session start omits the child id", () => {
    trackTalkingAmySessionStarted(42, 3);
    const product = track.mock.calls.find((call) => call[0] === "talking_amy_session_started");
    expect(product?.[1]).toEqual({ feature_name: "talking_amy" });
  });

  it("health lab assessment start and complete omit score and child id", () => {
    trackSessionStart(7, "brush");
    trackSessionComplete(7, {
      gameId: "brush",
      score: 99,
      xpEarned: 10,
      durationMs: 1200,
    });
    const started = track.mock.calls.find((call) => call[0] === "health_lab_assessment_started");
    const completed = track.mock.calls.find((call) => call[0] === "health_lab_assessment_completed");
    expect(started?.[1]).toMatchObject({ feature_name: "health_lab", game_id: "brush" });
    expect(completed?.[1]).toEqual({
      feature_name: "health_lab",
      outcome: "completed",
      game_id: "brush",
      duration_ms: 1200,
    });
    expect(JSON.stringify(completed?.[1])).not.toContain("99");
  });

  it("infant hub sends action signals and skips growth measurements", () => {
    trackInfantHubOpened(3, 8);
    trackFeedLogged(3, 8, "bottle");
    trackGrowthMeasurementAdded(3, 8, ["weight"]);
    const names = track.mock.calls.map((call) => call[0]);
    expect(names).toContain("infant_action");
    expect(names.filter((name) => name === "infant_action")).toHaveLength(2);
    const payloads = track.mock.calls
      .filter((call) => call[0] === "infant_action")
      .map((call) => call[1]);
    expect(payloads).toEqual([
      { feature_name: "infant_hub", action: "hub_opened" },
      { feature_name: "infant_hub", action: "log_created" },
    ]);
    expect(JSON.stringify(payloads)).not.toContain("weight");
  });
});
