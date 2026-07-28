import type { CaptionSegment } from "../types/content-package.js";

/**
 * Split narration into timed caption segments.
 * Timing is seconds-based for future FFmpeg burn-in.
 */
export function buildCaptions(
  voiceScript: string,
  totalDurationSeconds: number,
): CaptionSegment[] {
  const duration = Math.max(5, totalDurationSeconds);
  const chunks = chunkScript(voiceScript);
  if (chunks.length === 0) {
    return [
      {
        start: 0,
        end: duration,
        text: voiceScript.trim() || "AmyNest AI",
        style: "default",
        position: "bottom",
      },
    ];
  }

  const weights = chunks.map((c) => Math.max(1, c.split(/\s+/).length));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const segments: CaptionSegment[] = [];
  let cursor = 0;

  chunks.forEach((text, index) => {
    const share = weights[index]! / weightSum;
    const span = index === chunks.length - 1 ? duration - cursor : duration * share;
    const start = round2(cursor);
    const end = round2(index === chunks.length - 1 ? duration : cursor + span);
    segments.push({
      start,
      end: Math.max(start + 0.4, end),
      text,
      style: classifyStyle(text, index, chunks.length),
      position: "bottom",
    });
    cursor = segments[segments.length - 1]!.end;
  });

  // Guarantee monotonic non-overlapping timeline ending at duration.
  const last = segments[segments.length - 1]!;
  last.end = duration;
  return segments;
}

function chunkScript(script: string): string[] {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    if (words.length <= 10) {
      chunks.push(sentence);
      continue;
    }
    for (let i = 0; i < words.length; i += 8) {
      chunks.push(words.slice(i, i + 8).join(" "));
    }
  }
  return chunks;
}

function classifyStyle(
  text: string,
  index: number,
  total: number,
): CaptionSegment["style"] {
  if (index === total - 1 || /\b(try|download|amynest)\b/i.test(text)) return "cta";
  if (text.trim().endsWith("?")) return "question";
  if (index === 0) return "emphasis";
  return "default";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
