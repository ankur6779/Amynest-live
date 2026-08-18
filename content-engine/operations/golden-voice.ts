/**
 * P0: Golden Script → immutable narration/captions (no topic overwrite).
 */

import type { ContentPackage } from "../types/content-package.js";
import type { GoldenScript } from "../golden-scripts/types.js";

const SPEECH_TEMPLATE_MARKERS = [
  "speech struggle",
  "speech practice",
  "speak into the mic",
  "shame flickers",
  "sound tumbles",
  "braver, not smaller",
  "what if speech practice felt safe",
] as const;

export function tokenizeWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter(Boolean);
}

export function wordCoveragePercent(expected: string, actual: string): number {
  const exp = new Set(tokenizeWords(expected));
  if (exp.size === 0) return 0;
  const act = new Set(tokenizeWords(actual));
  let hit = 0;
  for (const w of exp) if (act.has(w)) hit += 1;
  return (100 * hit) / exp.size;
}

function ctaSpokenLine(script: GoldenScript): string {
  const lines = script.cta
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const download = lines.find((l) => /download/i.test(l));
  if (download && /play|app store|amynest/i.test(script.cta)) {
    return "Download AmyNest AI on Google Play and the App Store.";
  }
  return download || "Download AmyNest AI on Google Play and the App Store.";
}

/**
 * Build narration + captions ONLY from Golden Script approved fields.
 * No paraphrasing. No Speech Practice fallback.
 */
export function buildGoldenVoiceAndCaptions(
  script: GoldenScript,
  targetDurationSeconds: number,
): {
  voiceScript: string;
  captions: ContentPackage["captions"];
  beats: string[];
} {
  const beats = [
    script.selectedHook.text.trim(),
    script.parentingSituation.trim(),
    script.problem.trim(),
    script.productEntryBeat.trim(),
    script.hopeClose.trim(),
    ctaSpokenLine(script),
  ].filter((b) => b.length > 0);

  if (beats.length < 4) {
    throw new Error(
      `Golden ${script.id}: insufficient approved narration beats (${beats.length})`,
    );
  }

  const voiceScript = beats.join(" ");
  assertGoldenVoiceIntegrity(script, voiceScript);

  const n = beats.length;
  const slice = targetDurationSeconds / n;
  const captions: ContentPackage["captions"] = beats.map((text, i) => {
    const start = Number((i * slice).toFixed(2));
    const end = Number(
      (i === n - 1 ? targetDurationSeconds : (i + 1) * slice).toFixed(2),
    );
    return {
      start,
      end,
      text: text.length > 56 ? `${text.slice(0, 53)}...` : text,
      style: (i === 0 ? "emphasis" : i === n - 1 ? "cta" : "default") as
        | "emphasis"
        | "cta"
        | "default",
      position: "bottom" as const,
    };
  });

  return { voiceScript, captions, beats };
}

/**
 * Fail-fast: VO must belong to this Golden (feature/topic), never a foreign template.
 */
export function assertGoldenVoiceIntegrity(
  script: GoldenScript,
  voiceScript: string,
): void {
  const voice = voiceScript.toLowerCase();
  const feature = script.featureName.trim();
  if (!feature) {
    throw new Error(`Golden ${script.id}: featureName missing`);
  }

  // Hardcoded Speech Practice mic template is forbidden unless this Golden IS Speech Practice.
  const isSpeechPracticeGolden = /speech practice/i.test(feature);
  if (!isSpeechPracticeGolden) {
    for (const marker of SPEECH_TEMPLATE_MARKERS) {
      if (voice.includes(marker)) {
        throw new Error(
          `Golden ${script.id} topic integrity FAIL: narration contains foreign Speech Practice marker "${marker}" (feature="${feature}")`,
        );
      }
    }
  }

  // Approved Golden beats must survive into VO (not a different topic).
  const situationCov = wordCoveragePercent(script.parentingSituation, voiceScript);
  const productCov = wordCoveragePercent(script.productEntryBeat, voiceScript);
  const hopeCov = wordCoveragePercent(script.hopeClose, voiceScript);
  if (situationCov < 55 || productCov < 55 || hopeCov < 55) {
    throw new Error(
      `Golden ${script.id} topic integrity FAIL: narration coverage too low vs Golden beats (situation=${situationCov.toFixed(1)}% product=${productCov.toFixed(1)}% hope=${hopeCov.toFixed(1)}%)`,
    );
  }

  // Must include Download CTA line family
  if (!/download\s+amynest/i.test(voiceScript)) {
    throw new Error(
      `Golden ${script.id} topic integrity FAIL: narration missing Download AmyNest CTA`,
    );
  }
}

export function expectedNarrationFloorSeconds(voiceScript: string): number {
  const words = tokenizeWords(voiceScript).length;
  // ~2.5 words/sec speaking rate; require ≥70% of that floor
  return Math.max(8, (words / 2.5) * 0.7);
}

export function splitExactBeatsForTts(voiceScript: string): string[] {
  // Preserve wording: split only on sentence boundaries / long clauses.
  const parts = voiceScript
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [voiceScript.trim()];
}

/** Minimum transcript coverage of approved narration (fail below this). */
export const MIN_NARRATION_TRANSCRIPT_COVERAGE_PCT = 70;

export function assertNarrationAudioComplete(options: {
  voiceScript: string;
  audioPath: string;
  probeDurationSeconds: (path: string) => number;
  transcriptText?: string | null;
}): {
  durationSeconds: number;
  floorSeconds: number;
  transcriptCoveragePct: number | null;
} {
  const durationSeconds = options.probeDurationSeconds(options.audioPath);
  const floorSeconds = expectedNarrationFloorSeconds(options.voiceScript);
  if (!(durationSeconds >= floorSeconds)) {
    throw new Error(
      `TTS incompleteness FAIL: audio ${durationSeconds.toFixed(2)}s < floor ${floorSeconds.toFixed(2)}s for ${tokenizeWords(options.voiceScript).length} words (path=${options.audioPath})`,
    );
  }

  let transcriptCoveragePct: number | null = null;
  if (options.transcriptText != null && options.transcriptText.trim()) {
    transcriptCoveragePct = wordCoveragePercent(
      options.voiceScript,
      options.transcriptText,
    );
    if (transcriptCoveragePct < MIN_NARRATION_TRANSCRIPT_COVERAGE_PCT) {
      throw new Error(
        `TTS transcript coverage FAIL: ${transcriptCoveragePct.toFixed(1)}% < ${MIN_NARRATION_TRANSCRIPT_COVERAGE_PCT}% (audio may be truncated or wrong topic)`,
      );
    }
  }

  return { durationSeconds, floorSeconds, transcriptCoveragePct };
}
