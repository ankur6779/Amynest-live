import {
  getCoachDialogueExtraAudioTexts,
  getCoachDialogueWarmupPhrases,
  replaceCoachPersonalNameWithFriend,
  type PronouncePrompt,
} from "@workspace/speech-coach";
import { warmSpeechCoach } from "@/lib/global-audio-warmup";
import { hasStaticAudio } from "@/lib/static-audio";
import type { SpeakOptions } from "@/lib/amy-voice-controller";
import { speechCoachPerf, type SpeechCoachCacheAudit } from "@/lib/speech-coach-perf-trace";

type CoachStaticMode = "default" | "phonics";

/** Opening lines + high-frequency feedback phrases for static preload. */
export function buildSpeechCoachSessionWarmupTexts(openingLines: readonly string[]): string[] {
  const merged = [
    ...openingLines,
    ...getCoachDialogueWarmupPhrases(),
    ...getCoachDialogueExtraAudioTexts(),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of merged) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    const friend = replaceCoachPersonalNameWithFriend(t);
    if (friend && friend.toLowerCase() !== key && !seen.has(friend.toLowerCase())) {
      seen.add(friend.toLowerCase());
      out.push(friend);
    }
  }
  return out;
}

/** Static catalog lookup keys for a speak() call (runtime line + friend corpus alias). */
export function buildFeedbackStaticCatalogTexts(
  spokenLines: readonly string[],
  prompt?: PronouncePrompt | null,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
    const friend = replaceCoachPersonalNameWithFriend(t);
    if (friend) {
      const fk = friend.toLowerCase();
      if (!seen.has(fk)) {
        seen.add(fk);
        out.push(friend);
      }
    }
  };
  for (const line of spokenLines) push(line);
  if (prompt) {
    push(prompt.text);
  }
  return out;
}

function lineHasStaticAudio(text: string, mode: CoachStaticMode): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (hasStaticAudio(trimmed, mode)) return true;
  const friend = replaceCoachPersonalNameWithFriend(trimmed);
  return friend !== trimmed && hasStaticAudio(friend, mode);
}

/** Measure static corpus coverage (HIT = line or friend alias in catalog). */
export function auditSpeechCoachStaticCache(
  scope: SpeechCoachCacheAudit["scope"],
  texts: readonly string[],
  mode: CoachStaticMode = "default",
): SpeechCoachCacheAudit {
  const hits: string[] = [];
  const misses: string[] = [];
  for (const text of texts) {
    if (lineHasStaticAudio(text, mode)) hits.push(text);
    else misses.push(text);
  }
  const total = texts.length;
  return {
    scope,
    total,
    hits: hits.length,
    misses: misses.length,
    hitRate: total > 0 ? Math.round((hits.length / total) * 1000) / 1000 : 0,
    missSamples: misses.slice(0, 8),
  };
}

/** Fire-and-forget static audio preload (runs idle — parallel with Amy speaking). */
export function preloadSpeechCoachSessionAudio(openingLines: readonly string[]): void {
  warmSpeechCoach(buildSpeechCoachSessionWarmupTexts(openingLines));
}

/** Feedback TTS with static catalog hints + perf marks (Practice page). */
export async function speakCoachFeedbackLines(
  voice: { speak: (text: string, opts?: SpeakOptions) => Promise<{ success: boolean }> },
  lines: readonly string[],
  prompt: PronouncePrompt | null,
): Promise<void> {
  if (lines.length === 0) return;
  const staticCatalogTexts = buildFeedbackStaticCatalogTexts(lines, prompt);
  speechCoachPerf.recordCacheAudit(auditSpeechCoachStaticCache("feedback", lines));
  speechCoachPerf.mark("feedback_tts_start");
  let markedPlay = false;
  for (const line of lines) {
    const result = await voice.speak(line, {
      mode: "default",
      catalogPlayback: true,
      staticCatalogTexts,
      waitUntilEnd: true,
    });
    if (!markedPlay && result.success) {
      speechCoachPerf.mark("feedback_audio_play_start");
      markedPlay = true;
    }
  }
  speechCoachPerf.mark("feedback_tts_end");
  speechCoachPerf.logSummary("feedback_complete");
}
