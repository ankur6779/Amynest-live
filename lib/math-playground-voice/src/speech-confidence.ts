import type { VoiceValidationResult } from "./types";

export interface SpeechConfidenceInput {
  sttMode: "native" | "whisper" | "unsupported";
  validation: VoiceValidationResult;
  transcriptLength: number;
  listeningDurationMs: number;
}

/** Combines STT mode and validation clarity into a 0–1 voice confidence score. */
export function computeVoiceConfidence(input: SpeechConfidenceInput): number {
  const { sttMode, validation, transcriptLength, listeningDurationMs } = input;

  const modeBase =
    sttMode === "native" ? 0.95 : sttMode === "whisper" ? 0.8 : 0.5;

  const lengthFactor = transcriptLength > 0 ? Math.min(1, transcriptLength / 12) : 0.3;
  const durationFactor =
    listeningDurationMs > 0
      ? Math.min(1, listeningDurationMs / 4_000)
      : 0.5;

  const outcomeFactor =
    validation.outcome === "correct"
      ? 1
      : validation.outcome === "close"
        ? 0.75
        : validation.outcome === "incorrect"
          ? 0.55
          : 0.25;

  const raw =
    modeBase * 0.4 +
    validation.confidence * 0.3 +
    lengthFactor * 0.1 +
    durationFactor * 0.1 +
    outcomeFactor * 0.1;

  return Math.round(Math.min(1, raw) * 100) / 100;
}
