/**
 * Layer 4 — offline emergency audio (no API / GCS).
 * Web Audio tones + speech synthesis for A–Z and common coaching phrases.
 */

import { getPhonicsAudioText, normalizePhonicsLetterKey } from "@workspace/phonics-sounds";
import { audioManager } from "@/lib/audio-manager";
import { isAudioUnlocked, shouldUseWebAudioUnlock } from "@/lib/tts-guard";

const EMERGENCY_WORDS: Record<string, string> = {
  yes: "yes",
  no: "no",
  good: "good",
  "good job": "good job",
  "good job!": "good job",
  "try again": "try again",
  "try again!": "try again",
  "well done": "well done",
  "well done!": "well done",
  great: "great",
  amazing: "amazing",
  listen: "listen",
  hello: "hello",
  hi: "hi",
};

let audioCtx: AudioContext | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesPreloaded = false;

const PREFERRED_VOICE_NAMES = [
  "samantha",
  "karen",
  "moira",
  "google us english",
  "microsoft zira",
  "english united states",
  "en-us",
];

function pickNaturalVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pool = en.length > 0 ? en : voices;
  for (const pref of PREFERRED_VOICE_NAMES) {
    const match = pool.find((v) => v.name.toLowerCase().includes(pref));
    if (match) return match;
  }
  return pool.find((v) => v.localService) ?? pool[0] ?? null;
}

function cacheSpeechSynthesisVoice(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return;
  cachedVoice = pickNaturalVoice(voices);
  voicesPreloaded = true;
}

/** Preload and cache a consistent en voice for fast synthesis fallback. */
export function preloadSpeechSynthesisVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  cacheSpeechSynthesisVoice();
  window.speechSynthesis.onvoiceschanged = () => cacheSpeechSynthesisVoice();
  if (!voicesPreloaded) {
    window.speechSynthesis.getVoices();
  }
}

export function getCachedSpeechSynthesisVoice(): SpeechSynthesisVoice | null {
  if (!cachedVoice) cacheSpeechSynthesisVoice();
  return cachedVoice;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || !shouldUseWebAudioUnlock() || !isAudioUnlocked()) {
    return null;
  }
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

/** Short teaching tone — distinct pitch per letter index. */
export async function playPhonicsPlaceholderTone(letterIndex = 0): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = 280 + (letterIndex % 12) * 35;
    osc.frequency.value = base;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.24);
    await new Promise<void>((r) => setTimeout(r, 260));
    return true;
  } catch {
    return false;
  }
}

/** Natural speech fallback — full phrase via browser speechSynthesis (no phonics). */
export function playNaturalSpeechSynthesis(
  text: string,
  rate = 0.92,
): Promise<boolean> {
  return speakWithSynthesis(text, rate);
}

function speakWithSynthesis(text: string, rate = 0.92): Promise<boolean> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = getCachedSpeechSynthesisVoice();
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-US";
      u.rate = Math.min(1.1, Math.max(0.75, rate));
      u.pitch = 1.05;
      u.volume = 1;
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      window.speechSynthesis.speak(u);
      setTimeout(() => finish(true), Math.min(4000, 400 + text.length * 80));
    } catch {
      resolve(false);
    }
  });
}

export function resolveEmergencyPhrase(rawText: string): string | null {
  const text = (rawText ?? "").trim();
  if (!text) return null;
  const norm = text.toLowerCase();
  if (EMERGENCY_WORDS[norm]) return EMERGENCY_WORDS[norm];
  const key = normalizePhonicsLetterKey(text);
  if (key) return getPhonicsAudioText(key);
  if (text.length === 1 && /[a-z]/i.test(text)) return getPhonicsAudioText(text);
  return text.length <= 40 ? text : null;
}

/** Play emergency phrase: synthesis first, then placeholder tone. */
export async function playEmergencyPhrase(rawText: string): Promise<boolean> {
  const phrase = resolveEmergencyPhrase(rawText);
  if (!phrase) {
    const idx = (rawText.codePointAt(0) ?? 65) % 26;
    return playPhonicsPlaceholderTone(idx);
  }
  const spoke = await speakWithSynthesis(phrase);
  if (spoke) return true;
  const key = normalizePhonicsLetterKey(phrase) ?? phrase[0]?.toLowerCase() ?? "a";
  const idx = key.charCodeAt(0) - 97;
  return playPhonicsPlaceholderTone(Number.isFinite(idx) ? idx : 0);
}

export type ForceEmergencyPlaybackResult =
  | { success: true; forced: true; layer: "emergency_local" }
  | { success: false; error: string };

/** Last-resort audible output — no blob/src/ownership validation. */
export async function playFallbackTone(): Promise<boolean> {
  return playPhonicsPlaceholderTone(0);
}

/**
 * Absolute last audio guarantee — speak raw text via synthesis with no validation,
 * then a placeholder tone if synthesis is unavailable.
 */
export async function forceEmergencyPlayback(
  text: string,
): Promise<ForceEmergencyPlaybackResult> {
  const speakText = (text ?? "").trim() || " ";

  try {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(speakText);
      const voice = getCachedSpeechSynthesisVoice();
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-US";
      u.rate = 0.92;
      u.pitch = 1.05;
      u.volume = 1;
      window.speechSynthesis.speak(u);
      return { success: true, forced: true, layer: "emergency_local" };
    }
  } catch {
    /* fall through to tone */
  }

  try {
    const tone = await playFallbackTone();
    if (tone) {
      return { success: true, forced: true, layer: "emergency_local" };
    }
  } catch {
    /* fall through */
  }

  return { success: false, error: "total_audio_failure" };
}

export async function playEmergencyViaAudioElement(objectUrl: string): Promise<boolean> {
  try {
    const audio = audioManager.create(objectUrl);
    const played = await audioManager.play(
      audio,
      { source: "emergency", channel: "speech", interrupt: true, srcType: "static" },
      { channel: "speech", interrupt: true, maxRetries: 1 },
    );
    if (!played) return false;
    const end = await audioManager.waitUntilEnd(audio, () => false);
    return end.ok;
  } catch {
    return false;
  }
}
