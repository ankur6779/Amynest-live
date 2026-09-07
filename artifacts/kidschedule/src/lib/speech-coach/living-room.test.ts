import { describe, expect, it } from "vitest";
import {
  isSpeechCoachLivingV1Enabled,
  isSpeechCoachQuietId,
  isSpeechCoachModulePath,
  livingSpeechLivePracticeHref,
  livingSpeechLivePracticeLabel,
  livingSpeechTalkHref,
  livingSpeechTalkLandingLabel,
  parseSpeechCoachChildIdParam,
  recommendSpeechCoachAction,
  resolveSpeechCoachChildId,
  SPEECH_COACH_MORE_SESSIONS,
  SPEECH_COACH_QUIET_DESTINATIONS,
  SPEECH_COACH_QUIET_PATHS,
} from "./living-room";

describe("speech-coach living-room", () => {
  it("exposes five quiet destinations", () => {
    expect(SPEECH_COACH_QUIET_DESTINATIONS).toHaveLength(5);
    expect(SPEECH_COACH_QUIET_PATHS).toHaveLength(5);
  });

  it("keeps V2 enabled from diverting the living open", () => {
    const r = recommendSpeechCoachAction({
      ageMonths: 48,
      hour: 10,
      v2Enabled: true,
    });
    expect(r.kind).toBe("deepen");
    expect(r.sectionId).toBe("speech-section-practice");
    expect(r.title).toBe("Sounds & words");
  });

  it("recommends bedtime confidence at night", () => {
    const r = recommendSpeechCoachAction({
      ageMonths: 48,
      hour: 21,
      v2Enabled: true,
    });
    expect(r.kind).toBe("deepen");
    expect(r.sectionId).toBe("speech-section-affirmations");
  });

  it("recommends play for younger children by day", () => {
    const r = recommendSpeechCoachAction({
      ageMonths: 30,
      hour: 11,
      v2Enabled: false,
    });
    expect(r.sectionId).toBe("speech-section-games");
  });

  it("humanizes more-nest session labels", () => {
    expect(SPEECH_COACH_MORE_SESSIONS).toHaveLength(6);
    expect(SPEECH_COACH_MORE_SESSIONS.every((s) => s.label.length > 2)).toBe(
      true,
    );
    expect(SPEECH_COACH_MORE_SESSIONS.map((s) => s.key)).not.toContain("");
  });

  it("guards quiet ids", () => {
    expect(isSpeechCoachQuietId("speech-section-practice")).toBe(true);
    expect(isSpeechCoachQuietId("speech-section-dashboard")).toBe(false);
  });

  it("living flag defaults ON", () => {
    expect(isSpeechCoachLivingV1Enabled()).toBe(true);
  });

  it("primary live practice reuses the existing live-session route", () => {
    expect(livingSpeechLivePracticeLabel()).toBe("Start live practice");
    expect(livingSpeechLivePracticeHref(7)).toBe(
      "/speech-coach/live-session?preset=quick&childId=7",
    );
    expect(livingSpeechLivePracticeHref(null, "bedtime")).toBe(
      "/speech-coach/live-session?preset=bedtime",
    );
  });

  it("preserves an explicit child over URL and stored fallbacks", () => {
    expect(
      resolveSpeechCoachChildId({
        eligibleIds: [1, 2, 3],
        selectedId: 2,
        urlChildId: 1,
        storedChildId: 3,
      }),
    ).toBe(2);
    expect(
      resolveSpeechCoachChildId({
        eligibleIds: [1, 2, 3],
        selectedId: null,
        urlChildId: 3,
        storedChildId: 1,
      }),
    ).toBe(3);
    expect(
      resolveSpeechCoachChildId({
        eligibleIds: [1, 2],
        selectedId: 9,
        urlChildId: 9,
        storedChildId: 2,
      }),
    ).toBe(2);
    expect(parseSpeechCoachChildIdParam("3")).toBe(3);
    expect(parseSpeechCoachChildIdParam("nope")).toBeNull();
  });

  it("reuses the existing Talk with Amy route", () => {
    expect(livingSpeechTalkLandingLabel()).toBe("Talk with Amy");
    expect(livingSpeechTalkHref(4)).toBe("/speech-coach/talk?childId=4");
    expect(livingSpeechTalkHref(null)).toBe("/speech-coach/talk");
    expect(isSpeechCoachModulePath("/speech-coach/talk")).toBe(true);
    expect(isSpeechCoachModulePath("/dashboard")).toBe(false);
  });
});
