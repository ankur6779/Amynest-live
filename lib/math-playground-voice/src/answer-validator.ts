import { wordToNumber } from "./number-words";
import type { VoiceScenario, VoiceValidationResult } from "./types";

function normalizeTranscript(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumbers(text: string): number[] {
  const found: number[] = [];
  const digitMatches = text.match(/\d+/g);
  if (digitMatches) {
    for (const m of digitMatches) found.push(Number.parseInt(m, 10));
  }
  for (const token of text.split(" ")) {
    const n = wordToNumber(token);
    if (n !== null) found.push(n);
  }
  return found;
}

function matchesExpected(value: number, expected: number[], kind: VoiceScenario["kind"]): boolean {
  if (expected.includes(value)) return true;
  if (kind === "counting_sequence") {
    return expected.some((e) => Math.abs(e - value) <= 1);
  }
  return false;
}

export interface ValidateVoiceAnswerOpts {
  sttMode?: "native" | "whisper" | "unsupported";
  ageBand?: "2-3" | "4-5" | "6-7" | "7-8";
}

export function validateVoiceAnswer(
  transcript: string,
  scenario: VoiceScenario,
  opts: ValidateVoiceAnswerOpts = {},
): VoiceValidationResult {
  const rawTranscript = transcript.trim();
  if (!rawTranscript) {
    return {
      outcome: "unparseable",
      parsedValue: null,
      confidence: 0,
      rawTranscript,
    };
  }

  const normalized = normalizeTranscript(rawTranscript);
  const numbers = extractNumbers(normalized);

  let parsedValue: number | null = null;
  if (scenario.kind === "counting_sequence" && numbers.length > 0) {
    parsedValue = numbers[numbers.length - 1] ?? null;
  } else if (numbers.length > 0) {
    parsedValue = numbers[numbers.length - 1] ?? null;
  }

  const modeWeight =
    opts.sttMode === "native" ? 1 : opts.sttMode === "whisper" ? 0.85 : 0.6;
  const clarity = parsedValue !== null ? 0.9 : 0.2;
  const confidence = Math.min(1, clarity * modeWeight);

  if (parsedValue === null) {
    return { outcome: "unparseable", parsedValue: null, confidence, rawTranscript };
  }

  const exact = matchesExpected(parsedValue, scenario.expectedAnswers, scenario.kind);
  if (exact) {
    return { outcome: "correct", parsedValue, confidence, rawTranscript };
  }

  const closeTolerance = opts.ageBand === "2-3" ? 1 : 0;
  if (
    closeTolerance > 0 &&
    scenario.expectedAnswers.some((e) => Math.abs(e - parsedValue!) <= closeTolerance)
  ) {
    return { outcome: "close", parsedValue, confidence: confidence * 0.8, rawTranscript };
  }

  return { outcome: "incorrect", parsedValue, confidence, rawTranscript };
}
