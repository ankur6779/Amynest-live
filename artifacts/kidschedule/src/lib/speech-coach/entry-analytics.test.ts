import { afterEach, describe, expect, it, vi } from "vitest";
import { recordSanitizedTransition, resetRouteHistoryForTests } from "@/lib/route-history-manager";

const track = vi.fn();

vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => track(...args),
}));

describe("speech_coach_entry", () => {
  afterEach(() => {
    resetRouteHistoryForTests();
    track.mockClear();
  });

  it("fires once when entering Speech Coach from Home, not from live-session", async () => {
    const { resetSpeechCoachEntryForTests, trackSpeechCoachLandingEntry } =
      await import("./entry-analytics");
    resetSpeechCoachEntryForTests();

    recordSanitizedTransition("/dashboard", "/speech-coach", "push");
    trackSpeechCoachLandingEntry({ childId: 7, living: true });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("speech_coach_entry", {
      source: "today-home",
      child_id: 7,
      living: true,
    });

    track.mockClear();
    recordSanitizedTransition("/speech-coach", "/speech-coach/live-session", "push");
    recordSanitizedTransition("/speech-coach/live-session", "/speech-coach", "push");
    trackSpeechCoachLandingEntry({ childId: 7, living: true });
    expect(track).not.toHaveBeenCalled();
  });

  it("does not fire twice on a remount from the same outside source", async () => {
    const { resetSpeechCoachEntryForTests, trackSpeechCoachLandingEntry } =
      await import("./entry-analytics");
    resetSpeechCoachEntryForTests();
    recordSanitizedTransition("/parenting-hub", "/speech-coach", "push");
    trackSpeechCoachLandingEntry({ childId: 2, living: true });
    trackSpeechCoachLandingEntry({ childId: 2, living: true });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("speech_coach_entry", {
      source: "rooms",
      child_id: 2,
      living: true,
    });
  });
});
