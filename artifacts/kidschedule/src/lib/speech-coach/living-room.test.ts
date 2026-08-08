import { describe, expect, it } from "vitest";
import {
  isSpeechCoachLivingV1Enabled,
  isSpeechCoachQuietId,
  recommendSpeechCoachAction,
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
});
