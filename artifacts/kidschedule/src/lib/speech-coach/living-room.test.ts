import { describe, expect, it } from "vitest";
import {
  isSpeechCoachLivingV1Enabled,
  recommendSpeechCoachAction,
  SPEECH_COACH_QUIET_DESTINATIONS,
  SPEECH_COACH_QUIET_PATHS,
} from "./living-room";

describe("speech-coach living-room", () => {
  it("exposes five quiet destinations", () => {
    expect(SPEECH_COACH_QUIET_DESTINATIONS).toHaveLength(5);
    expect(SPEECH_COACH_QUIET_PATHS).toHaveLength(5);
  });

  it("recommends V2 practice when enabled", () => {
    const r = recommendSpeechCoachAction({
      ageMonths: 48,
      hour: 10,
      v2Enabled: true,
    });
    expect(r.kind).toBe("route");
    expect(r.href).toBe("/speech-coach-v2");
    expect(r.title).toBe("Practice with Amy");
  });

  it("recommends bedtime confidence at night without V2", () => {
    const r = recommendSpeechCoachAction({
      ageMonths: 48,
      hour: 21,
      v2Enabled: false,
    });
    expect(r.kind).toBe("scroll");
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

  it("living flag defaults ON", () => {
    expect(isSpeechCoachLivingV1Enabled()).toBe(true);
  });
});
