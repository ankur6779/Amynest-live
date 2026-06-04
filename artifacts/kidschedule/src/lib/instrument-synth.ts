/**
 * Playable instrument audio engine for Instrument World.
 *
 * Hybrid design:
 *  - Pitched instruments (piano, xylophone, strings, wind...) are synthesised
 *    live with the Web Audio API so notes are polyphonic, latency-free and need
 *    zero extra audio assets.
 *  - Percussion instruments reuse their existing recorded clip, decoded once
 *    into an AudioBuffer and replayed polyphonically as one-shots.
 *
 * SFX/instrument playback only — never route narration, Amy voice, phonics or
 * Speech Coach audio through this module.
 */

import { getProceduralAudioContext } from "@/lib/procedural-sfx";

export type InstrumentTimbre =
  | "piano"
  | "mallet" // xylophone, glockenspiel, steel drum
  | "kalimba"
  | "organ"
  | "pluck" // guitar, ukulele, banjo, harp
  | "twang" // sitar, banjo (brighter pluck)
  | "bow" // violin, cello (sustained string)
  | "reed" // clarinet, saxophone, oboe, harmonica
  | "brass" // trumpet, trombone, tuba, bugle
  | "flute"; // flute, recorder, pan flute

type Partial = { mult: number; type: OscillatorType; gain: number };

type TimbrePreset = {
  partials: Partial[];
  attackMs: number;
  /** Total time the note rings before it has fully decayed to silence. */
  decayMs: number;
  /** When > 0 the note sustains at this fraction of peak before release. */
  sustain: number;
  gain: number;
  /** Optional low-pass cutoff (Hz) to soften bright waveforms. */
  lowpass?: number;
  /** Pitch vibrato depth in cents (bowed/wind realism). */
  vibratoCents?: number;
};

const PRESETS: Record<InstrumentTimbre, TimbrePreset> = {
  piano: {
    partials: [
      { mult: 1, type: "triangle", gain: 1 },
      { mult: 2, type: "sine", gain: 0.35 },
      { mult: 3, type: "sine", gain: 0.12 },
    ],
    attackMs: 4,
    decayMs: 1700,
    sustain: 0,
    gain: 0.5,
  },
  mallet: {
    partials: [
      { mult: 1, type: "sine", gain: 1 },
      { mult: 3.01, type: "sine", gain: 0.5 },
      { mult: 5.4, type: "sine", gain: 0.18 },
    ],
    attackMs: 2,
    decayMs: 750,
    sustain: 0,
    gain: 0.45,
  },
  kalimba: {
    partials: [
      { mult: 1, type: "sine", gain: 1 },
      { mult: 2, type: "sine", gain: 0.22 },
    ],
    attackMs: 3,
    decayMs: 1300,
    sustain: 0,
    gain: 0.5,
  },
  organ: {
    partials: [
      { mult: 1, type: "sine", gain: 1 },
      { mult: 2, type: "sine", gain: 0.6 },
      { mult: 4, type: "sine", gain: 0.35 },
      { mult: 0.5, type: "sine", gain: 0.4 },
    ],
    attackMs: 30,
    decayMs: 900,
    sustain: 0.85,
    gain: 0.32,
  },
  pluck: {
    partials: [
      { mult: 1, type: "sawtooth", gain: 1 },
      { mult: 2, type: "triangle", gain: 0.3 },
    ],
    attackMs: 3,
    decayMs: 1400,
    sustain: 0,
    gain: 0.32,
    lowpass: 3200,
  },
  twang: {
    partials: [
      { mult: 1, type: "sawtooth", gain: 1 },
      { mult: 2.01, type: "sawtooth", gain: 0.45 },
      { mult: 3, type: "triangle", gain: 0.2 },
    ],
    attackMs: 2,
    decayMs: 1600,
    sustain: 0,
    gain: 0.26,
    lowpass: 5200,
  },
  bow: {
    partials: [
      { mult: 1, type: "sawtooth", gain: 1 },
      { mult: 2, type: "sine", gain: 0.3 },
    ],
    attackMs: 90,
    decayMs: 1100,
    sustain: 0.75,
    gain: 0.26,
    lowpass: 3600,
    vibratoCents: 8,
  },
  reed: {
    partials: [
      { mult: 1, type: "square", gain: 1 },
      { mult: 2, type: "sawtooth", gain: 0.25 },
    ],
    attackMs: 40,
    decayMs: 900,
    sustain: 0.8,
    gain: 0.2,
    lowpass: 2600,
    vibratoCents: 6,
  },
  brass: {
    partials: [
      { mult: 1, type: "sawtooth", gain: 1 },
      { mult: 2, type: "sawtooth", gain: 0.4 },
      { mult: 3, type: "sine", gain: 0.2 },
    ],
    attackMs: 55,
    decayMs: 1000,
    sustain: 0.8,
    gain: 0.22,
    lowpass: 3000,
    vibratoCents: 5,
  },
  flute: {
    partials: [
      { mult: 1, type: "sine", gain: 1 },
      { mult: 2, type: "sine", gain: 0.12 },
    ],
    attackMs: 60,
    decayMs: 850,
    sustain: 0.7,
    gain: 0.34,
    vibratoCents: 7,
  },
};

const SEMITONE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Convert a note name like "A4", "C#5" to its frequency in Hz. */
export function noteToFrequency(note: string): number {
  const match = /^([A-G])(#|b)?(-?\d+)$/.exec(note.trim());
  if (!match) return 440;
  const [, letter, accidental, octaveStr] = match;
  let index = SEMITONE_NAMES.indexOf(letter);
  if (accidental === "#") index += 1;
  if (accidental === "b") index -= 1;
  const octave = Number(octaveStr);
  const midi = (octave + 1) * 12 + index;
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Play a single synthesised pitched note. Each call is independent, so rapid
 * taps and chords layer naturally (polyphony).
 */
export function playInstrumentNote(
  noteOrFreq: string | number,
  timbre: InstrumentTimbre,
  options: { durationMs?: number; gain?: number } = {},
): void {
  const ctx = getProceduralAudioContext();
  if (!ctx) return;
  const freq = typeof noteOrFreq === "number" ? noteOrFreq : noteToFrequency(noteOrFreq);
  const preset = PRESETS[timbre];
  const now = ctx.currentTime;
  const peak = (options.gain ?? 1) * preset.gain;
  const attack = preset.attackMs / 1000;
  const total = (options.durationMs ?? preset.decayMs) / 1000;

  try {
    const master = ctx.createGain();
    master.gain.value = 0;
    let node: AudioNode = master;

    if (preset.lowpass) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = preset.lowpass;
      master.connect(filter);
      filter.connect(ctx.destination);
    } else {
      master.connect(ctx.destination);
    }

    // Amplitude envelope (attack -> optional sustain -> exponential release).
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(peak, now + attack);
    if (preset.sustain > 0) {
      const sustainLevel = Math.max(0.0001, peak * preset.sustain);
      master.gain.linearRampToValueAtTime(sustainLevel, now + attack + 0.08);
      master.gain.setValueAtTime(sustainLevel, now + total * 0.6);
      master.gain.exponentialRampToValueAtTime(0.0001, now + total);
    } else {
      master.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.05, total));
    }

    let vibrato: OscillatorNode | null = null;
    let vibratoGain: GainNode | null = null;
    if (preset.vibratoCents) {
      vibrato = ctx.createOscillator();
      vibratoGain = ctx.createGain();
      vibrato.frequency.value = 5.5;
      // cents -> Hz deviation around the fundamental.
      vibratoGain.gain.value = freq * (2 ** (preset.vibratoCents / 1200) - 1);
      vibrato.connect(vibratoGain);
      vibrato.start(now);
      vibrato.stop(now + total + 0.05);
    }

    const stopAt = now + total + 0.05;
    for (const part of preset.partials) {
      const osc = ctx.createOscillator();
      const partGain = ctx.createGain();
      osc.type = part.type;
      osc.frequency.value = freq * part.mult;
      partGain.gain.value = part.gain;
      if (vibratoGain) vibratoGain.connect(osc.frequency);
      osc.connect(partGain);
      partGain.connect(node);
      osc.start(now);
      osc.stop(stopAt);
    }
  } catch {
    /* audio is best-effort polish */
  }
}

// ---------------------------------------------------------------------------
// Percussion: reuse existing recorded clips as polyphonic one-shots.
// ---------------------------------------------------------------------------

const bufferCache = new Map<string, AudioBuffer>();
const bufferLoading = new Map<string, Promise<AudioBuffer | null>>();

/** Fetch + decode an audio URL into an AudioBuffer (cached). */
export async function loadInstrumentSample(url: string): Promise<AudioBuffer | null> {
  const ctx = getProceduralAudioContext();
  if (!ctx || !url) return null;
  const cached = bufferCache.get(url);
  if (cached) return cached;
  const pending = bufferLoading.get(url);
  if (pending) return pending;

  const task = (async () => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return null;
      const bytes = await res.arrayBuffer();
      const buffer = await ctx.decodeAudioData(bytes);
      bufferCache.set(url, buffer);
      return buffer;
    } catch {
      return null;
    } finally {
      bufferLoading.delete(url);
    }
  })();
  bufferLoading.set(url, task);
  return task;
}

/**
 * Play a decoded sample as a one-shot. `playbackRate` lets a single recorded
 * clip cover several drum pads (e.g. low tom vs. high tom).
 */
export function playInstrumentSample(
  buffer: AudioBuffer,
  options: { gain?: number; playbackRate?: number } = {},
): void {
  const ctx = getProceduralAudioContext();
  if (!ctx) return;
  try {
    const source = ctx.createBufferSource();
    const amp = ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = options.playbackRate ?? 1;
    amp.gain.value = options.gain ?? 0.9;
    source.connect(amp);
    amp.connect(ctx.destination);
    source.start();
  } catch {
    /* best-effort */
  }
}

/** Resume the shared audio context from a user gesture (call on first tap). */
export function unlockInstrumentAudio(): void {
  getProceduralAudioContext();
}
