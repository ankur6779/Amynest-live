/**
 * Procedural ambient soundscapes for Amy Sound World.
 * Uses a dedicated AudioContext (never audioManager) so primary play/stopAll cannot kill it.
 * Fades in/out; ducks while primary world sounds play.
 */

import type { AmbienceKind } from "@/lib/sound-world-living-environment";
import {
  PRIMARY_SOUND_END,
  PRIMARY_SOUND_START,
} from "@/lib/sound-world-living-environment";

const BASE_GAIN = 0.038;
const DUCKED_GAIN = 0.008;
const FADE_MS = 900;

type Nodes = {
  ctx: AudioContext;
  master: GainNode;
  duck: GainNode;
  stops: Array<() => void>;
};

let nodes: Nodes | null = null;
let currentKind: AmbienceKind | null = null;
let muted = false;
let ducked = false;
let listening = false;

function ensureListening(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener(PRIMARY_SOUND_START, () => {
    ducked = true;
    applyGains();
  });
  window.addEventListener(PRIMARY_SOUND_END, () => {
    ducked = false;
    applyGains();
  });
}

function applyGains(fadeMs = FADE_MS): void {
  if (!nodes) return;
  const { ctx, master, duck } = nodes;
  const now = ctx.currentTime;
  const targetMaster = muted ? 0 : BASE_GAIN;
  const targetDuck = ducked ? DUCKED_GAIN / BASE_GAIN : 1;
  master.gain.cancelScheduledValues(now);
  duck.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  duck.gain.setValueAtTime(duck.gain.value, now);
  master.gain.linearRampToValueAtTime(targetMaster, now + fadeMs / 1000);
  duck.gain.linearRampToValueAtTime(targetDuck, now + (fadeMs * 0.6) / 1000);
}

function makeNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    // Brown-ish noise — softer, less hissy for ambience.
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

function connectNoise(
  ctx: AudioContext,
  dest: AudioNode,
  opts: { lowpass?: number; gain?: number },
): () => void {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 2.5);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.lowpass ?? 800;
  filter.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = opts.gain ?? 0.5;
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start();
  return () => {
    try {
      src.stop();
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    } catch {
      /* already stopped */
    }
  };
}

function connectTone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  gain = 0.02,
): () => void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = gain;
  // Slow vibrato for life.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = freq * 0.01;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(g);
  g.connect(dest);
  osc.start();
  lfo.start();
  return () => {
    try {
      osc.stop();
      lfo.stop();
      osc.disconnect();
      lfo.disconnect();
      g.disconnect();
      lfoGain.disconnect();
    } catch {
      /* */
    }
  };
}

function buildGraph(kind: AmbienceKind, dest: AudioNode, ctx: AudioContext): Array<() => void> {
  const stops: Array<() => void> = [];
  switch (kind) {
    case "forest":
      stops.push(connectNoise(ctx, dest, { lowpass: 650, gain: 0.55 }));
      stops.push(connectTone(ctx, dest, 110, 0.012));
      break;
    case "nature":
      stops.push(connectNoise(ctx, dest, { lowpass: 900, gain: 0.45 }));
      stops.push(connectNoise(ctx, dest, { lowpass: 1800, gain: 0.18 }));
      stops.push(connectTone(ctx, dest, 196, 0.008));
      break;
    case "city":
      stops.push(connectNoise(ctx, dest, { lowpass: 500, gain: 0.5 }));
      stops.push(connectTone(ctx, dest, 55, 0.018));
      stops.push(connectTone(ctx, dest, 82, 0.01));
      break;
    case "home":
      stops.push(connectNoise(ctx, dest, { lowpass: 400, gain: 0.28 }));
      stops.push(connectTone(ctx, dest, 60, 0.015));
      stops.push(connectTone(ctx, dest, 120, 0.006));
      break;
    case "studio":
      stops.push(connectNoise(ctx, dest, { lowpass: 1200, gain: 0.22 }));
      stops.push(connectTone(ctx, dest, 220, 0.007));
      break;
  }
  return stops;
}

async function ensureContext(): Promise<Nodes | null> {
  if (typeof window === "undefined") return null;
  ensureListening();
  if (nodes) {
    if (nodes.ctx.state === "suspended") {
      try {
        await nodes.ctx.resume();
      } catch {
        /* autoplay policy */
      }
    }
    return nodes;
  }
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0;
  const duck = ctx.createGain();
  duck.gain.value = 1;
  duck.connect(master);
  master.connect(ctx.destination);
  nodes = { ctx, master, duck, stops: [] };
  try {
    await ctx.resume();
  } catch {
    /* */
  }
  return nodes;
}

function teardownSources(): void {
  if (!nodes) return;
  for (const stop of nodes.stops) stop();
  nodes.stops = [];
  currentKind = null;
}

export const worldAmbientAudio = {
  async start(kind: AmbienceKind, opts?: { muted?: boolean }): Promise<void> {
    if (opts?.muted != null) muted = opts.muted;
    const n = await ensureContext();
    if (!n) return;
    if (currentKind === kind && n.stops.length > 0) {
      applyGains();
      return;
    }
    teardownSources();
    n.stops = buildGraph(kind, n.duck, n.ctx);
    currentKind = kind;
    applyGains(FADE_MS);
  },

  setMuted(next: boolean): void {
    muted = next;
    applyGains(500);
  },

  async unlock(): Promise<void> {
    await ensureContext();
  },

  stop(): void {
    if (!nodes) return;
    applyGains(500);
    const n = nodes;
    window.setTimeout(() => {
      if (nodes !== n) return;
      teardownSources();
    }, 520);
  },

  release(): void {
    if (!nodes) return;
    teardownSources();
    try {
      void nodes.ctx.close();
    } catch {
      /* */
    }
    nodes = null;
    currentKind = null;
    ducked = false;
  },

  /** Test helpers */
  __debugState() {
    return { currentKind, muted, ducked, alive: Boolean(nodes) };
  },
};
