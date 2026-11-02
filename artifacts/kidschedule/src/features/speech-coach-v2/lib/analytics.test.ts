// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushAnalytics } from "@/lib/analytics";
import { resetAnalyticsServiceForTests } from "@/lib/analytics/analytics-service";
import { trackSpeechCoachV2SessionComplete, trackSpeechCoachV2SessionStart } from "./analytics";

vi.mock("@/lib/api", () => ({
  getApiUrl: (path: string) => path,
}));

vi.mock("@/lib/firebase-subscription-attribution", () => ({
  trackFirebaseQualitySignal: vi.fn(),
}));

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  resetAnalyticsServiceForTests();
});

describe("speech coach product events", () => {
  it("emits the named session events and feature start or completion without a child id on the feature event", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    trackSpeechCoachV2SessionStart({ childId: 7, sessionId: "sess-1", ageBand: "3-4" });
    trackSpeechCoachV2SessionComplete({
      childId: 7,
      sessionId: "sess-1",
      durationSeconds: 40,
      starsEarned: 2,
      phaseReached: "celebration",
    });
    await flushAnalytics(fetchMock);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as {
      events: Array<{ name: string; props: Record<string, unknown> }>;
    };
    const names = body.events.map((event) => event.name);
    expect(names).toContain("speech_coach_v2_session_start");
    expect(names).toContain("speech_coach_v2_session_complete");
    expect(names).toContain("feature_started");
    expect(names).toContain("feature_completed");
    const feature = body.events.find((event) => event.name === "feature_started");
    expect(feature?.props.feature_name).toBe("speech_session");
    expect(feature?.props.childId).toBeUndefined();
    expect(JSON.stringify(feature?.props)).not.toMatch(/transcript|child_name/);
  });
});
