/**
 * Voice narration helpers — keep scripts natural, short-sentence, 15–30s friendly.
 */

const WORDS_PER_SECOND = 2.4;

export function estimateSpeakingSeconds(script: string): number {
  const words = tokenizeWords(script).length;
  return Math.max(1, Math.round(words / WORDS_PER_SECOND));
}

export function refineVoiceScript(
  script: string,
  targetDurationSeconds: number,
): string {
  const cleaned = script
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();

  const sentences = splitSentences(cleaned);
  const natural = sentences
    .map((s) => ensureShortSentence(s))
    .filter(Boolean);

  const joined = natural.join(" ");
  return fitToDuration(joined, clampTarget(targetDurationSeconds));
}

export function clampTarget(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 30;
  return Math.min(30, Math.max(15, Math.round(durationSeconds)));
}

function fitToDuration(script: string, targetSeconds: number): string {
  const words = tokenizeWords(script);
  const targetWords = Math.round(targetSeconds * WORDS_PER_SECOND);
  if (words.length <= targetWords) return words.join(" ");

  // Prefer ending on a sentence boundary near the target.
  const truncated = words.slice(0, targetWords).join(" ");
  const sentences = splitSentences(truncated);
  if (sentences.length > 1) {
    return sentences.slice(0, -1).join(" ");
  }
  return truncated;
}

function ensureShortSentence(sentence: string): string {
  const words = tokenizeWords(sentence);
  if (words.length <= 16) return sentence.trim();
  // Split long sentences into two calmer chunks.
  const mid = Math.ceil(words.length / 2);
  return `${words.slice(0, mid).join(" ")}. ${words.slice(mid).join(" ")}`;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tokenizeWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}
