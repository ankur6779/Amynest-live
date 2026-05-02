// Pure-JS WAV synth for white / pink / brown noise. Works in browser and
// React Native — no DOM, no Web Audio, no Buffer dependency. Output is a
// seamless looping mono PCM16 WAV byte array that consumers (e.g. expo-audio
// after writing to a temp file) can play back with `loop = true`.

import type { SynthKind } from "./parentHub.ts";

const DEFAULT_SAMPLE_RATE = 22050;
const DEFAULT_DURATION_S = 4;

function buildWavHeader(numSamples: number, sampleRate: number): Uint8Array {
  const byteRate = sampleRate * 2;
  const dataSize = numSamples * 2;
  const buf = new ArrayBuffer(44);
  const view = new DataView(buf);
  // "RIFF"
  view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46);
  view.setUint32(4, 36 + dataSize, true);
  // "WAVE"
  view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45);
  // "fmt "
  view.setUint8(12, 0x66); view.setUint8(13, 0x6d); view.setUint8(14, 0x74); view.setUint8(15, 0x20);
  view.setUint32(16, 16, true);          // PCM chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits/sample
  // "data"
  view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61);
  view.setUint32(40, dataSize, true);
  return new Uint8Array(buf);
}

function clamp16(x: number): number {
  if (x > 1) x = 1;
  else if (x < -1) x = -1;
  return Math.round(x * 32767);
}

/** Cross-fade the last `tailSamples` of the buffer with the first `tailSamples`
 *  so the loop boundary is click-free. */
function smoothLoop(samples: Float32Array, tailSamples: number): void {
  const n = samples.length;
  if (tailSamples <= 0 || tailSamples * 2 >= n) return;
  for (let i = 0; i < tailSamples; i++) {
    const w = i / tailSamples;
    const head = samples[i];
    const tail = samples[n - tailSamples + i];
    samples[i] = tail * (1 - w) + head * w;
    samples[n - tailSamples + i] = samples[i];
  }
}

function generateWhite(n: number): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (Math.random() * 2 - 1) * 0.45;
  return out;
}

function generatePink(n: number): Float32Array {
  // Voss–McCartney approximation — same recipe as the web sound engine.
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11 * 4;
    b6 = w * 0.115926;
  }
  return out;
}

function generateBrown(n: number): Float32Array {
  // Random walk integrator — heavy low end, gentle "fan / rumble" feel.
  const out = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    out[i] = last * 3.5 * 0.9;
  }
  return out;
}

function generateNoise(kind: SynthKind, n: number): Float32Array {
  if (kind === "white") return generateWhite(n);
  if (kind === "pink") return generatePink(n);
  return generateBrown(n);
}

function floatToWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const numSamples = samples.length;
  const header = buildWavHeader(numSamples, sampleRate);
  const out = new Uint8Array(header.length + numSamples * 2);
  out.set(header, 0);
  for (let i = 0; i < numSamples; i++) {
    const v = clamp16(samples[i]);
    out[44 + i * 2]     = v & 0xff;
    out[44 + i * 2 + 1] = (v >> 8) & 0xff;
  }
  return out;
}

export interface SynthOptions {
  /** Total clip length in seconds. Defaults to 4 — small enough to be cheap,
   *  long enough to hide the loop seam under a 0.25s cross-fade. */
  durationSeconds?: number;
  /** Sample rate in Hz. 22050 is plenty for soothing band-limited noise and
   *  halves the byte count vs. 44100. */
  sampleRate?: number;
}

/**
 * Build a mono 16-bit PCM WAV that contains a seamlessly looping clip of the
 * requested noise colour. Returns the raw bytes — the caller is responsible
 * for getting them to a player (e.g. write to a temp file via
 * expo-file-system, then hand the file URI to expo-audio).
 */
export function buildNoiseWav(
  kind: SynthKind,
  options: SynthOptions = {},
): Uint8Array {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const durationSeconds = options.durationSeconds ?? DEFAULT_DURATION_S;
  const numSamples = Math.max(1, Math.floor(sampleRate * durationSeconds));

  const samples =
    kind === "white" ? generateWhite(numSamples)
    : kind === "pink"  ? generatePink(numSamples)
    : generateBrown(numSamples);

  // 0.25s cross-fade at the loop boundary kills clicks for all three colours.
  smoothLoop(samples, Math.floor(sampleRate * 0.25));

  return floatToWav(samples, sampleRate);
}

// ─── Melody / lullaby synth ────────────────────────────────────────────────
// MIDI-ish freqs covering one gentle octave — enough for nursery lullabies.
export const NOTE_FREQ = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
} as const;

export type Note = {
  /** Hertz. 0 = rest. */
  freqHz: number;
  /** Duration of this note in milliseconds. */
  durMs: number;
};

export interface MelodyOptions {
  sampleRate?: number;
  /** Peak amplitude per note (0..1). Defaults to 0.32. */
  amplitude?: number;
  /** Optional bed of synthesised noise mixed under the melody. */
  noiseBed?: { kind: SynthKind; level: number };
}

/**
 * Build a mono PCM16 WAV containing a sine-wave melody. Each note has a
 * short attack + release envelope so adjacent notes don't click. Optional
 * noise bed is mixed underneath at `noiseBed.level` (e.g. 0.45 for a soft
 * "lullaby through white noise" effect). The first/last 30ms are faded so
 * the file loops without a seam.
 */
export function buildMelodyWav(
  notes: readonly Note[],
  opts: MelodyOptions = {},
): Uint8Array {
  const sampleRate = opts.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const amplitude = opts.amplitude ?? 0.32;
  const totalMs = notes.reduce((s, n) => s + Math.max(0, n.durMs), 0);
  const totalSamples = Math.max(1, Math.round((totalMs / 1000) * sampleRate));
  const buf = new Float32Array(totalSamples);

  let cursor = 0;
  for (const note of notes) {
    const noteSamples = Math.max(0, Math.round((note.durMs / 1000) * sampleRate));
    if (note.freqHz <= 0 || noteSamples === 0) {
      cursor += noteSamples;
      continue;
    }
    const omega = (2 * Math.PI * note.freqHz) / sampleRate;
    const attack = Math.max(64, Math.floor(noteSamples * 0.08));
    const release = Math.max(96, Math.floor(noteSamples * 0.18));
    const limit = Math.min(noteSamples, totalSamples - cursor);
    for (let i = 0; i < limit; i++) {
      let env = 1;
      if (i < attack) env = i / attack;
      else if (i > noteSamples - release) {
        env = Math.max(0, (noteSamples - i) / release);
      }
      buf[cursor + i] += env * amplitude * Math.sin(omega * i);
    }
    cursor += noteSamples;
  }

  if (opts.noiseBed) {
    const level = Math.max(0, Math.min(1, opts.noiseBed.level));
    const bed = generateNoise(opts.noiseBed.kind, totalSamples);
    for (let i = 0; i < totalSamples; i++) buf[i] += bed[i] * level;
  }

  // 30ms fade in/out so the looped file doesn't click at the seam.
  const fade = Math.min(Math.floor(0.03 * sampleRate), Math.floor(totalSamples / 4));
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    buf[i] *= g;
    buf[totalSamples - 1 - i] *= g;
  }

  return floatToWav(buf, sampleRate);
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Pure-JS base64 encoder for the WAV byte array — kept inline so we don't
 * depend on Buffer/atob (not present on every RN runtime).
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result +=
      BASE64_ALPHABET[(n >> 18) & 63] +
      BASE64_ALPHABET[(n >> 12) & 63] +
      BASE64_ALPHABET[(n >> 6) & 63] +
      BASE64_ALPHABET[n & 63];
  }
  const remaining = bytes.length - i;
  if (remaining === 1) {
    const n = bytes[i] << 16;
    result +=
      BASE64_ALPHABET[(n >> 18) & 63] +
      BASE64_ALPHABET[(n >> 12) & 63] +
      "==";
  } else if (remaining === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    result +=
      BASE64_ALPHABET[(n >> 18) & 63] +
      BASE64_ALPHABET[(n >> 12) & 63] +
      BASE64_ALPHABET[(n >> 6) & 63] +
      "=";
  }
  return result;
}
