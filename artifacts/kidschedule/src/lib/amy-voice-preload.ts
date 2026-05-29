/**
 * Anticipatory Amy voice preloading — predict and warm next likely audio.
 */

import { getCoachDialogueWarmupPhrases } from "@workspace/speech-coach";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import type { AmySpeechPolicy } from "@/lib/amy-speech-mode";
import { warmSpeechCoach } from "@/lib/global-audio-warmup";
import { preloadStaticPhrases } from "@/lib/static-audio";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

const SESSION_HISTORY_MAX = 14;
const sessionPhraseHistory: string[] = [];

const COACH_FOLLOW_UPS = [...getCoachDialogueWarmupPhrases()];

/** Track recent phrases for lightweight next-phrase prediction. */
export function recordAmyVoiceSessionPhrase(text: string): void {
  const t = (text ?? "").trim();
  if (!t) return;
  sessionPhraseHistory.push(t.toLowerCase());
  if (sessionPhraseHistory.length > SESSION_HISTORY_MAX) {
    sessionPhraseHistory.shift();
  }
}

function predictLikelyNextPhrases(policy: AmySpeechPolicy): string[] {
  const predicted: string[] = [];

  if (policy.useSemanticSplit && policy.phrases.length > 1) {
    predicted.push(...policy.phrases.slice(1, 4));
  }

  if (policy.speechMode === "speech_coach" || policy.speechMode === "mixed") {
    if (/\bstep\b/i.test(policy.originalText)) {
      predicted.push("good job", "try again");
    }
    if (/\btry\b/i.test(policy.originalText)) {
      predicted.push("well done", "great work");
    }
  }

  const last = sessionPhraseHistory[sessionPhraseHistory.length - 1];
  if (last?.includes("good") || last?.includes("great")) {
    predicted.push("try again", "keep going");
  } else if (last?.includes("try")) {
    predicted.push(...COACH_FOLLOW_UPS.slice(0, 2));
  }

  return [...new Set(predicted.map((p) => p.trim()).filter(Boolean))].slice(0, 6);
}

/** Preload static audio for upcoming phrases and phonics chunks. */
export function preloadAmyVoiceAnticipatory(policy: AmySpeechPolicy): void {
  const mode: StaticAudioMode = policy.pipelineMode;
  const likely = predictLikelyNextPhrases(policy);

  if (likely.length > 0) {
    preloadStaticPhrases(likely, mode, 6);
    logAmyVoiceDiag("anticipatory_preload", {
      mode: policy.speechMode,
      count: likely.length,
      phrases: likely.slice(0, 3),
    });
  }

  if (policy.speechMode === "phonics" || policy.speechMode === "spelling") {
    void import("@/lib/amy-voice-pipeline").then(({ decomposePhonicsChunks }) => {
      const chunks = decomposePhonicsChunks(policy.normalizedText);
      preloadStaticPhrases(chunks, "phonics", 8);
    });
  }

  if (policy.speechMode === "speech_coach" && policy.phrases.length <= 1) {
    preloadStaticPhrases(COACH_FOLLOW_UPS, mode, 3);
    warmSpeechCoach([...COACH_FOLLOW_UPS, ...likely]);
  }
}

/** Preload the next phrase while the current one is playing. */
export function preloadAmyVoiceNextPhrase(
  phrase: string | undefined,
  mode: StaticAudioMode,
): void {
  const t = (phrase ?? "").trim();
  if (!t) return;
  preloadStaticPhrases([t], mode, 1);
}
