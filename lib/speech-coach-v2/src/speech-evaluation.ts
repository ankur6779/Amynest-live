import type {
  SpeechCoachV2EvaluationInput,
  SpeechCoachV2EvaluationResult,
  SpeechCoachV2EvaluationScores,
  ScoringConfidence,
  SpeechTimingMetadata,
} from "./types";
import { childFriendlyFeedback } from "./feedback";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n]!;
}

function editSimilarity(a: string, b: string): number {
  if (!a && !b) return 0;
  if (a === b) return 100;
  const maxLen = Math.max(a.length, b.length, 1);
  return Math.round((1 - levenshtein(a, b) / maxLen) * 100);
}

function wordOverlapScore(expected: string, actual: string): number {
  const expWords = expected.split(" ").filter(Boolean);
  if (expWords.length === 0) return 0;
  const expSet = new Set(expWords);
  const hits = actual.split(" ").filter(Boolean).filter((w) => expSet.has(w)).length;
  return Math.round((hits / expWords.length) * 100);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function countWords(text: string): number {
  return normalize(text).split(" ").filter(Boolean).length;
}

function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(/[.!?]+/).filter((p) => p.trim().length > 0);
  return Math.max(1, parts.length);
}

/** Detect speech disfluencies preserved in raw transcript. */
function detectDisfluency(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (/\b(uh+|um+|er+|ah+)\b/.test(lower)) return true;
  if (/([a-z])\1{2,}/.test(lower)) return true;
  if (/\bwaaa?n?t\b|\bwader\b|\bwata\b|\bth\b|\bfink\b|\blibary\b/.test(lower)) return true;
  return false;
}

/** Articulation proxy from raw speech markers (not normalized STT). */
function estimatePronunciationFromRaw(
  expected: string,
  rawTranscript: string,
  normalizedTranscript: string,
): number {
  const raw = rawTranscript.trim();
  if (!raw) return 0;

  const ne = normalize(expected);
  const nr = normalize(raw);
  const nt = normalize(normalizedTranscript);

  let score = clampScore(Math.max(editSimilarity(ne, nr), wordOverlapScore(ne, nr)));

  if (detectDisfluency(raw)) score -= 18;
  if (/(waaa?n?t|wader|wata|fink|libary|pasghetti|aminal)/i.test(raw)) score -= 25;
  if (raw.length > 0 && nr !== nt) score -= 12;

  const elongationPenalty = (raw.match(/([aeiou])\1{2,}/gi) ?? []).length * 8;
  score -= elongationPenalty;

  return clampScore(score);
}

function scoreTranscriptAccuracy(expected: string, transcript: string): number {
  const ne = normalize(expected);
  const na = normalize(transcript);
  if (!na) return 0;
  if (ne === na) return 100;
  return clampScore(Math.max(editSimilarity(ne, na), wordOverlapScore(ne, na)));
}

function scoreSpeakingRate(timing: SpeechTimingMetadata | undefined, wordCount: number): number {
  const wpm =
    timing?.speechRateWpm
    ?? (timing?.responseSeconds && timing.responseSeconds > 0
      ? (wordCount / timing.responseSeconds) * 60
      : undefined);

  if (!wpm) return wordCount >= 3 ? 70 : 60;
  if (wpm >= 60 && wpm <= 140) return 90;
  if (wpm >= 40 && wpm <= 170) return 75;
  if (wpm < 30) return 55;
  if (wpm > 200) return 58;
  return 68;
}

function scoreFluency(timing: SpeechTimingMetadata | undefined, wordCount: number): number {
  let score = scoreSpeakingRate(timing, wordCount);
  if (timing?.hadDisfluency) score -= 15;
  if ((timing?.pauseCount ?? 0) > 3) score -= 10;
  return clampScore(score);
}

function scoreCompletion(expected: string, transcript: string, attemptedComplete: boolean): number {
  const overlap = wordOverlapScore(normalize(expected), normalize(transcript));
  if (!normalize(transcript)) return 0;
  if (attemptedComplete && overlap >= 50) return clampScore(overlap + 10);
  return overlap;
}

function deriveConfidence(input: {
  transcriptAccuracy: number;
  pronunciationEstimate: number;
  rawTranscript: string;
  normalizedTranscript: string;
  timing?: SpeechTimingMetadata;
}): ScoringConfidence {
  const raw = input.rawTranscript.trim();
  const normalizedGap =
    raw.length > 0 && normalize(raw) !== normalize(input.normalizedTranscript) ? 1 : 0;
  const pronunciationGap = Math.abs(input.transcriptAccuracy - input.pronunciationEstimate);

  if (
    input.transcriptAccuracy >= 88
    && input.pronunciationEstimate >= 82
    && pronunciationGap <= 12
    && !detectDisfluency(raw)
    && normalizedGap === 0
  ) {
    return "HIGH";
  }

  if (
    input.transcriptAccuracy >= 70
    && input.pronunciationEstimate >= 55
    && pronunciationGap <= 25
  ) {
    return "MEDIUM";
  }

  if (
    input.transcriptAccuracy >= 85
    && input.pronunciationEstimate < 65
  ) {
    return "LOW";
  }

  const slowStruggle =
    (input.timing?.responseSeconds ?? 0) > 8
    && countWords(input.normalizedTranscript) <= 4
    && input.transcriptAccuracy >= 80;

  if (slowStruggle || detectDisfluency(raw) || pronunciationGap > 30) {
    return "LOW";
  }

  return input.pronunciationEstimate >= 70 ? "MEDIUM" : "LOW";
}

/** Audio-aware speech evaluation — never equates STT text match with pronunciation. */
export function evaluateSpeechResponse(
  input: SpeechCoachV2EvaluationInput,
): SpeechCoachV2EvaluationResult {
  const {
    expected,
    transcript,
    rawTranscript = transcript,
    timing,
    attemptedComplete = true,
  } = input;

  const transcriptAccuracy = scoreTranscriptAccuracy(expected, transcript);
  const pronunciationEstimate = estimatePronunciationFromRaw(expected, rawTranscript, transcript);
  const wordCount = timing?.wordCount ?? countWords(transcript);
  const speakingRateScore = scoreSpeakingRate(timing, wordCount);
  const fluencyScore = scoreFluency(
    {
      ...timing,
      hadDisfluency: timing?.hadDisfluency ?? detectDisfluency(rawTranscript),
    },
    wordCount,
  );
  const completionScore = scoreCompletion(expected, transcript, attemptedComplete);
  const scoringConfidence = deriveConfidence({
    transcriptAccuracy,
    pronunciationEstimate,
    rawTranscript,
    normalizedTranscript: transcript,
    timing,
  });

  let effectivePronunciation = pronunciationEstimate;
  if (scoringConfidence === "LOW") {
    effectivePronunciation = Math.min(effectivePronunciation, 62);
  }

  const confidenceScore = clampScore(
    40 + effectivePronunciation * 0.35 + fluencyScore * 0.25 + completionScore * 0.2,
  );

  const overallScore = clampScore(
    scoringConfidence === "LOW"
      ? Math.min(
          effectivePronunciation * 0.45 + fluencyScore * 0.2 + completionScore * 0.2,
          68,
        )
      : effectivePronunciation * 0.4
        + transcriptAccuracy * 0.15
        + fluencyScore * 0.2
        + completionScore * 0.15
        + confidenceScore * 0.1,
  );

  const scores: SpeechCoachV2EvaluationScores = {
    transcriptAccuracy,
    pronunciationEstimate: effectivePronunciation,
    fluencyScore,
    speakingRateScore,
    confidenceScore,
    completionScore,
    overallScore,
    scoringConfidence,
    accuracyScore: effectivePronunciation,
  };

  const needsRetry = scoringConfidence === "LOW" || overallScore < 65;
  const childFeedback = childFriendlyFeedback(scores, needsRetry, scoringConfidence);

  return {
    ...scores,
    childFeedback,
    needsRetry,
    wordsSpoken: wordCount,
    sentencesCompleted: countSentences(transcript),
  };
}
