/**
 * Build-time ElevenLabs phonics generation — minimal pure phoneme hints.
 * Runtime never calls ElevenLabs; output is static /phonics-audio/*.mp3.
 *
 * ElevenLabs speaks ONLY the `text` field. No "sound", no instructions, no letter names.
 * Punctuation (e.g. "b.") helps force a clean stop consonant.
 */

import { DIGRAPHS, LETTER_SOUNDS } from "./dataset.js";

/** All curated phonics audioKeys (letters + digraphs). */
export function getPhonicsCatalogAudioKeys(): string[] {
  const keys = new Set<string>();
  for (const entry of Object.values(LETTER_SOUNDS)) keys.add(entry.audioKey);
  for (const entry of Object.values(DIGRAPHS)) keys.add(entry.audioKey);
  return [...keys].sort();
}

/** audioKey → phoneme label (for logs / human review). */
export function getPhonicsGenerationPhonemeLabel(audioKey: string): string {
  for (const entry of Object.values(LETTER_SOUNDS)) {
    if (entry.audioKey === audioKey) return entry.phoneme;
  }
  for (const entry of Object.values(DIGRAPHS)) {
    if (entry.audioKey === audioKey) return entry.phoneme;
  }
  return audioKey;
}

/**
 * Minimal phoneme hints for ElevenLabs — pure sounds, no extra words.
 * Period on stops (b., k., t.) encourages crisp closure without schwa.
 */
export const ELEVENLABS_SPEAK_TEXT: Record<string, string> = {
  a: "ah",
  b: "b.",
  c: "k.",
  d: "d.",
  e: "eh",
  f: "fff",
  g: "g.",
  h: "hhh",
  i: "ih",
  j: "j.",
  k: "k.",
  l: "lll",
  m: "mmm",
  n: "nnn",
  o: "ah",
  p: "p.",
  q: "kw",
  r: "rrr",
  s: "sss",
  t: "t.",
  u: "uh",
  v: "vvv",
  w: "w",
  x: "ks",
  y: "y",
  z: "zzz",

  sh: "shh",
  ch: "chh",
  th1: "thh",
  th2: "thh",
  ph: "fff",
  ng: "ng",
  wh: "wh",
};

const FORBIDDEN_SPEAK_PATTERNS = [/\bsound\b/i, /\bletter\b/i, /\bsays\b/i, /\bas in\b/i];

/** Every catalog audioKey must have a speak line; none may contain extra words. */
export function assertElevenLabsSpeakTextComplete(): void {
  const keys = getPhonicsCatalogAudioKeys();
  const missing = keys.filter((k) => !ELEVENLABS_SPEAK_TEXT[k]?.trim());
  if (missing.length > 0) {
    throw new Error(`ELEVENLABS_SPEAK_TEXT missing keys: ${missing.join(", ")}`);
  }

  for (const [key, text] of Object.entries(ELEVENLABS_SPEAK_TEXT)) {
    for (const pattern of FORBIDDEN_SPEAK_PATTERNS) {
      if (pattern.test(text)) {
        throw new Error(`ELEVENLABS_SPEAK_TEXT[${key}] contains forbidden phrase: "${text}"`);
      }
    }
  }
}

/** Text ElevenLabs should speak for a curated phonics clip. */
export function getElevenLabsPhonemeSpeakText(audioKey: string): string {
  const key = audioKey.trim().toLowerCase();
  const hint = ELEVENLABS_SPEAK_TEXT[key];
  if (hint) return hint;
  return getPhonicsGenerationPhonemeLabel(key);
}

/** QA brief for human review — never sent to ElevenLabs. */
export function buildPhonicsElevenLabsPrompt(phoneme: string): string {
  return `
Target phoneme: "${phoneme}".
Pure sound only — no "sound", no letter names (bee, cee), no schwa (buh, kuh).
Duration target: 300–800ms; reject if >900ms or <250ms; stop sounds (b,c,d,p,t,k) must be ≤600ms.
`.trim();
}

/** Default ElevenLabs voice — English Indian Female (Amy). */
export const PHONICS_ELEVENLABS_VOICE_ID_DEFAULT = "QbQKfe9vgx5OsbZUvlFv";
export const PHONICS_ELEVENLABS_MODEL_DEFAULT = "eleven_turbo_v2_5";

export const PHONICS_ELEVENLABS_VOICE_SETTINGS = {
  stability: 0.65,
  similarity_boost: 0.75,
  style: 0,
} as const;

export const PHONICS_MIN_MP3_BYTES = 500;
export const PHONICS_TARGET_DURATION_MS = { min: 300, max: 800 } as const;
/** Minimum playable length on mobile (reject below). */
export const PHONICS_MIN_REJECT_DURATION_MS = 250;
export const PHONICS_MAX_REJECT_DURATION_MS = 900;
/** Stop consonant audioKeys — must stay short (no letter-name drift). */
export const PHONICS_STOP_SOUND_KEYS = ["b", "c", "d", "p", "t", "k"] as const;
export const PHONICS_STOP_SOUND_MAX_DURATION_MS = 600;
/** mp3_44100_128 from ElevenLabs output_format. */
export const PHONICS_MP3_BITRATE_KBPS = 128;

export type PhonemeMetrics = {
  key: string;
  durationMs: number;
  size: number;
  fallback?: boolean;
  accepted?: boolean;
  reason?: string;
};

export function shouldLogPhonemeMetrics(): boolean {
  if (process.env.PHONICS_LOG_METRICS === "1") return true;
  if (process.env.PHONICS_LOG_METRICS === "0") return false;
  return process.env.NODE_ENV !== "production";
}

/** Dev / QA consistency log for phonics clip generation. */
export function logPhonemeMetrics(metrics: PhonemeMetrics): void {
  if (!shouldLogPhonemeMetrics()) return;
  console.log("[phonics-metrics]", JSON.stringify(metrics));
}

export function isPhonicsStopSoundKey(audioKey: string): boolean {
  return (PHONICS_STOP_SOUND_KEYS as readonly string[]).includes(audioKey.trim().toLowerCase());
}

export type PhonicsMp3Validation = {
  ok: boolean;
  estimatedDurationMs: number;
  byteLength: number;
  reason?: string;
};

/** Estimate MP3 duration from file size (128kbps CBR). */
export function estimateMp3DurationMs(
  byteLength: number,
  bitrateKbps = PHONICS_MP3_BITRATE_KBPS,
): number {
  if (byteLength <= 0 || bitrateKbps <= 0) return 0;
  return Math.round((byteLength * 8) / (bitrateKbps * 1000) * 1000);
}

/**
 * Validate generated phonics clip before accepting.
 * Rejects: too small, too short (<250ms), too long (>900ms), stop sounds >600ms.
 */
export function validatePhonicsMp3Buffer(
  buffer: Buffer | Uint8Array,
  audioKey?: string,
): PhonicsMp3Validation {
  const byteLength = buffer.byteLength;
  const estimatedDurationMs = estimateMp3DurationMs(byteLength);
  const key = audioKey?.trim().toLowerCase();

  if (byteLength < PHONICS_MIN_MP3_BYTES) {
    return {
      ok: false,
      estimatedDurationMs,
      byteLength,
      reason: `too_small (${byteLength} bytes)`,
    };
  }

  if (estimatedDurationMs < PHONICS_MIN_REJECT_DURATION_MS) {
    return {
      ok: false,
      estimatedDurationMs,
      byteLength,
      reason: `too_short_for_mobile (~${estimatedDurationMs}ms < ${PHONICS_MIN_REJECT_DURATION_MS}ms)`,
    };
  }

  if (key && isPhonicsStopSoundKey(key) && estimatedDurationMs > PHONICS_STOP_SOUND_MAX_DURATION_MS) {
    return {
      ok: false,
      estimatedDurationMs,
      byteLength,
      reason: `too_long_for_stop_sound (~${estimatedDurationMs}ms > ${PHONICS_STOP_SOUND_MAX_DURATION_MS}ms)`,
    };
  }

  if (estimatedDurationMs > PHONICS_MAX_REJECT_DURATION_MS) {
    return {
      ok: false,
      estimatedDurationMs,
      byteLength,
      reason: `too_long (~${estimatedDurationMs}ms > ${PHONICS_MAX_REJECT_DURATION_MS}ms)`,
    };
  }

  return { ok: true, estimatedDurationMs, byteLength };
}

/** CVC blend keys: c(k) + a + t → "cat". */
export const PHONICS_CVC_SMOKE_KEYS = ["c", "a", "t"] as const;
