/**
 * Real sampled-instrument layer for Instrument World "Play" mode.
 *
 * Uses the `smplr` Soundfont player (General MIDI samples from Benjamin
 * Gleitzman's pre-rendered soundfonts) so each note is a genuine recording of
 * the instrument. The library is dynamically imported so it never enters the
 * main bundle — it loads only when a child opens a playable instrument.
 *
 * Always degrades gracefully: if samples can't load (offline / blocked), the
 * caller falls back to the local synth in instrument-synth.ts.
 */

import { getProceduralAudioContext } from "@/lib/procedural-sfx";

type SoundfontStartOptions = {
  note: string | number;
  velocity?: number;
  duration?: number;
};

type SoundfontPlayer = {
  load: Promise<unknown>;
  start: (options: SoundfontStartOptions) => unknown;
};

type SamplerEntry = {
  player: SoundfontPlayer | null;
  ready: boolean;
  failed: boolean;
};

let smplrPromise: Promise<typeof import("smplr")> | null = null;
const samplers = new Map<string, SamplerEntry>();

function loadSmplr() {
  if (!smplrPromise) smplrPromise = import("smplr");
  return smplrPromise;
}

/** Kick off loading of a General MIDI instrument's samples (idempotent). */
export function ensureSampler(gmInstrument: string | null | undefined): void {
  if (!gmInstrument || samplers.has(gmInstrument)) return;
  const ctx = getProceduralAudioContext();
  if (!ctx) return;

  const entry: SamplerEntry = { player: null, ready: false, failed: false };
  samplers.set(gmInstrument, entry);

  void (async () => {
    try {
      const { Soundfont } = await loadSmplr();
      const player = new Soundfont(ctx, {
        instrument: gmInstrument,
      }) as unknown as SoundfontPlayer;
      await player.load;
      entry.player = player;
      entry.ready = true;
    } catch {
      entry.failed = true;
    }
  })();
}

export function isSamplerReady(gmInstrument: string | null | undefined): boolean {
  if (!gmInstrument) return false;
  return samplers.get(gmInstrument)?.ready ?? false;
}

/**
 * Play a real sampled note. Returns false when the sampler isn't ready yet, so
 * the caller can fall back to the synth.
 */
export function playSampledNote(
  gmInstrument: string | null | undefined,
  note: string | number,
  options: { velocity?: number; durationSec?: number } = {},
): boolean {
  if (!gmInstrument) return false;
  const entry = samplers.get(gmInstrument);
  if (!entry || !entry.ready || !entry.player) return false;
  const ctx = getProceduralAudioContext();
  if (ctx && ctx.state === "suspended") void ctx.resume();
  try {
    entry.player.start({
      note,
      velocity: options.velocity ?? 95,
      duration: options.durationSec,
    });
    return true;
  } catch {
    return false;
  }
}
