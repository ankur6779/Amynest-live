import { describe, expect, it } from "vitest";
import { shouldProcessLiveCoachSttResult } from "./speech-coach-utils";

describe("shouldProcessLiveCoachSttResult", () => {
  it("waits while Whisper transcription is in flight", () => {
    expect(
      shouldProcessLiveCoachSttResult({
        listening: false,
        transcribing: true,
        transcript: "",
        error: null,
        allowEmptyTranscript: true,
      }),
    ).toBe(false);
  });

  it("scores after transcription completes", () => {
    expect(
      shouldProcessLiveCoachSttResult({
        listening: false,
        transcribing: false,
        transcript: "cat",
        error: null,
        allowEmptyTranscript: false,
      }),
    ).toBe(true);
  });

  it("does not score empty transcript until user explicitly stopped", () => {
    expect(
      shouldProcessLiveCoachSttResult({
        listening: false,
        transcribing: false,
        transcript: "",
        error: null,
        allowEmptyTranscript: false,
      }),
    ).toBe(false);
  });

  it("allows empty transcript after explicit stop or listen timeout", () => {
    expect(
      shouldProcessLiveCoachSttResult({
        listening: false,
        transcribing: false,
        transcript: "",
        error: null,
        allowEmptyTranscript: true,
      }),
    ).toBe(true);
  });
});
