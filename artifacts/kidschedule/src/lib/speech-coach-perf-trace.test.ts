import { describe, expect, it } from "vitest";
import { _speechCoachPerfDeltaForTests } from "@/lib/speech-coach-perf-trace";

describe("speech-coach-perf-trace", () => {
  it("computes thinking and response deltas from marks", () => {
    const deltas = _speechCoachPerfDeltaForTests({
      recording_stop: 1000,
      stt_start: 1010,
      stt_end: 3500,
      evaluation_start: 3501,
      evaluation_end: 3502,
      feedback_tts_start: 3510,
      feedback_audio_play_start: 3700,
      feedback_tts_end: 5200,
    });
    expect(deltas.thinking_window_ms).toBe(2500);
    expect(deltas.stt_ms).toBe(2490);
    expect(deltas.evaluation_ms).toBe(1);
    expect(deltas.feedback_tts_to_play_ms).toBe(190);
    expect(deltas.response_perceived_ms).toBe(2700);
  });
});
