import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isLikelyFalseInterrupt,
  SPEECH_COACH_V2_MIN_SPEECH_MS,
  SPEECH_COACH_V2_VAD_AMY_SPEAKING,
  SPEECH_COACH_V2_VAD_LEGACY,
  SPEECH_COACH_V2_VAD_LISTENING,
  speechCoachV2TurnDetectionForMode,
} from "../realtime-vad";

describe("realtime-vad", () => {
  it("uses stricter settings than legacy defaults", () => {
    assert.ok(SPEECH_COACH_V2_VAD_LISTENING.threshold > SPEECH_COACH_V2_VAD_LEGACY.threshold);
    assert.ok(
      SPEECH_COACH_V2_VAD_LISTENING.silence_duration_ms
        > SPEECH_COACH_V2_VAD_LEGACY.silence_duration_ms,
    );
  });

  it("disables interrupt while Amy is speaking", () => {
    const amy = speechCoachV2TurnDetectionForMode("amy_speaking");
    assert.equal(amy.interrupt_response, false);
    assert.ok(amy.threshold >= SPEECH_COACH_V2_VAD_LISTENING.threshold);
  });

  it("flags sub-400ms bursts during Amy speech as false interrupts", () => {
    assert.equal(
      isLikelyFalseInterrupt({ amySpeaking: true, speechDurationMs: 250 }),
      true,
    );
    assert.equal(
      isLikelyFalseInterrupt({ amySpeaking: true, speechDurationMs: 500 }),
      false,
    );
    assert.equal(
      isLikelyFalseInterrupt({ amySpeaking: false, speechDurationMs: 200 }),
      false,
    );
  });

  it("minimum speech trigger is 400ms", () => {
    assert.equal(SPEECH_COACH_V2_MIN_SPEECH_MS, 400);
    assert.equal(SPEECH_COACH_V2_VAD_AMY_SPEAKING.interrupt_response, false);
  });
});
