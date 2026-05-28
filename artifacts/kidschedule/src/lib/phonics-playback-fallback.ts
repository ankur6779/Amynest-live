/**
 * Learning-safe phonics playback fallback — speech synthesis before tone.
 * Final order: static MP3 → speech fallback → tone (rare).
 */

import { getPhonemeSynthesisText } from "@workspace/phonics-sounds";
import { playFallbackTone, playPhonicsPlaceholderTone } from "@/lib/emergency-audio";
import {
  logAudioHealthFailure,
  logAudioHealthFallback,
  logAudioHealthSuccess,
} from "@/lib/audio-health";

export type PhonemeFallbackResult =
  | { success: true; fallback: "voice" | "tone" }
  | { success: false; error: string };

function synthesisSpeak(text: string, rate = 0.8): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = "en-US";
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);
      window.speechSynthesis.speak(utterance);
      window.setTimeout(() => finish(true), Math.min(2500, 500 + text.length * 90));
    } catch {
      resolve(false);
    }
  });
}

function fallbackSpeakText(audioKey: string): string {
  // Browser TTS reads bare letters as alphabet names; use phoneme-forcing spellings.
  return getPhonemeSynthesisText(audioKey);
}

/** Speech synthesis phoneme — learning-safe vs tone beep. */
export async function playPhonemeFallbackVoice(audioKey: string): Promise<PhonemeFallbackResult> {
  const key = audioKey.trim().toLowerCase();
  const text = fallbackSpeakText(key);
  const spoke = await synthesisSpeak(text, 0.8);
  if (spoke) {
    logAudioHealthFallback("static", "emergency");
    logAudioHealthSuccess({ layer: "emergency", fallbackUsed: true });
    return { success: true, fallback: "voice" };
  }

  const idx = Math.max(0, (key.codePointAt(0) ?? 97) - 97);
  const tone = (await playPhonicsPlaceholderTone(idx)) || (await playFallbackTone());
  if (tone) {
    logAudioHealthFallback("static", "emergency");
    logAudioHealthSuccess({ layer: "emergency", fallbackUsed: true });
    return { success: true, fallback: "tone" };
  }

  return { success: false, error: "phonics_fallback_exhausted" };
}

export function logPhonicsPlaybackFailure(key: string, reason: string): void {
  const payload = { key, reason, timestamp: Date.now() };
  console.warn("[phonics-playback-failure]", payload);
  logAudioHealthFailure(`phonics_${reason}`, "static");
}
