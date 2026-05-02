// ─────────────────────────────────────────────────────────────────────────────
// useSoundEngine — procedural WebAudio generator for the infant sound module.
//
// Why procedural? We want zero binary asset weight, instant playback, and
// browser-safe loops. Each sound is synthesised from a noise buffer +
// filters + LFOs:
//
//   white      → flat random samples (broadband)
//   pink       → 1/f weighted noise (Voss–McCartney) — "rushing water"
//   shush      → band-passed white noise with slow amplitude LFO ("shhh-shhh")
//   rain       → highpass-filtered pink noise + sparse droplets
//   fan        → lowpass brown noise + slow LFO modulation
//   heartbeat  → periodic 70bpm low sine pulse with envelope
//   womb       → heartbeat + lowpass filtered noise (muffled)
//
// Engine features:
//   • Lazy AudioContext init on first play (browser autoplay policy)
//   • Per-sound gain + master gain (for global fade)
//   • Multiple sounds active at once (mix mode)
//   • Optional fade-in/fade-out on play/stop
//   • AnalyserNode → RMS amplitude → reactive UI orb (throttled RAF)
//   • Optional auto-stop timer (15m / 30m / 1h)
//
// Used by `infant-sounds.tsx` for the immersive sound module.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";

export type SoundId = "shush" | "rain" | "fan" | "heartbeat" | "pink" | "white" | "womb";

export const SOUND_IDS: readonly SoundId[] = [
  "shush", "rain", "fan", "heartbeat", "pink", "white", "womb",
] as const;

const DEFAULT_VOLUMES: Record<SoundId, number> = {
  shush: 0.7,
  rain: 0.65,
  fan: 0.7,
  heartbeat: 0.55,
  pink: 0.6,
  white: 0.55,
  womb: 0.7,
};

const FADE_SECONDS = 0.6; // smooth play/stop ramps so nothing clicks

interface ActiveSound {
  gain: GainNode;          // per-sound gain (volume + fade)
  cleanup: () => void;     // stops + disconnects all owned nodes
}

interface SoundEngineState {
  /** Sounds currently playing (post fade-in). */
  active: Set<SoundId>;
  /** Per-sound volumes 0..1. */
  volumes: Record<SoundId, number>;
  /** Currently armed auto-stop timer (ms total), or null. */
  timerMs: number | null;
  /** Remaining ms on the timer, ticked once per second. Null when no timer. */
  remainingMs: number | null;
}

export interface SoundEngine extends SoundEngineState {
  isPlaying: boolean;
  play: (id: SoundId) => void;
  stop: (id: SoundId) => void;
  stopAll: () => void;
  toggle: (id: SoundId) => void;
  setVolume: (id: SoundId, vol: number) => void;
  setTimer: (ms: number | null) => void;
  /** True once the underlying AudioContext has been created (after first play). */
  initialized: boolean;
  /**
   * Returns the master AnalyserNode for animation consumers (e.g. the
   * reactive orb). Lives outside React state so animation frames don't
   * trigger tree-wide re-renders. Null until the context is initialised.
   */
  getAnalyser: () => AnalyserNode | null;
}

// ─── Buffer factories ────────────────────────────────────────────────────────

function createWhiteNoise(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function createPinkNoise(ctx: AudioContext): AudioBuffer {
  // Voss–McCartney pink-noise approximation. Standard recipe — produces 1/f
  // weighted noise that sounds "softer" / more like rushing water.
  const length = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

function createBrownNoise(ctx: AudioContext): AudioBuffer {
  // Random walk integrator — heavy low-end, good base for fan / rumble.
  const length = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
}

// ─── Sound builders — each returns nodes routed into a per-sound GainNode ────

interface BuildContext {
  ctx: AudioContext;
  destination: AudioNode; // route per-sound gain into this (master gain)
  whiteBuf: AudioBuffer;
  pinkBuf: AudioBuffer;
  brownBuf: AudioBuffer;
}

function buildSound(id: SoundId, b: BuildContext, initialVolume: number): ActiveSound {
  const { ctx, destination } = b;
  const gain = ctx.createGain();
  gain.gain.value = 0; // start muted; play() ramps up
  gain.connect(destination);

  const owned: { stop?: () => void; disconnect?: () => void }[] = [];

  function startBufferLoop(buffer: AudioBuffer, into: AudioNode, playbackRate = 1) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.value = playbackRate;
    src.connect(into);
    src.start();
    owned.push({ stop: () => { try { src.stop(); } catch { /* already stopped */ } }, disconnect: () => src.disconnect() });
    return src;
  }

  function makeFilter(type: BiquadFilterType, freq: number, q?: number) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    owned.push({ disconnect: () => f.disconnect() });
    return f;
  }

  function makeGain(initial = 1) {
    const g = ctx.createGain();
    g.gain.value = initial;
    owned.push({ disconnect: () => g.disconnect() });
    return g;
  }

  switch (id) {
    case "white": {
      startBufferLoop(b.whiteBuf, gain);
      break;
    }
    case "pink": {
      startBufferLoop(b.pinkBuf, gain);
      break;
    }
    case "fan": {
      // Brown noise → lowpass + slow LFO on gain to simulate blade rotation.
      const lp = makeFilter("lowpass", 600, 0.7);
      const inner = makeGain(1);
      startBufferLoop(b.brownBuf, lp);
      lp.connect(inner);
      inner.connect(gain);

      // LFO at ~1.2Hz, ±0.15 around 1.0
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 1.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain).connect(inner.gain);
      lfo.start();
      owned.push({
        stop: () => { try { lfo.stop(); } catch { /* already stopped */ } },
        disconnect: () => { lfo.disconnect(); lfoGain.disconnect(); },
      });
      break;
    }
    case "rain": {
      // Pink noise highpassed (treble-heavy) to mimic falling water.
      const hp = makeFilter("highpass", 800, 0.7);
      startBufferLoop(b.pinkBuf, hp);
      hp.connect(gain);

      // Add intermittent "droplets" — short pink bursts via a second source
      // with a slow tremolo LFO so it ebbs and flows like real rain.
      const dropSrc = startBufferLoop(b.pinkBuf, hp, 1.5); // detuned 2nd layer
      const tremolo = ctx.createOscillator();
      tremolo.type = "sine";
      tremolo.frequency.value = 0.3;
      const tremoloGain = ctx.createGain();
      tremoloGain.gain.value = 0.4;
      const dropGain = ctx.createGain();
      dropGain.gain.value = 0.3;
      dropSrc.disconnect();
      dropSrc.connect(dropGain);
      dropGain.connect(hp);
      tremolo.connect(tremoloGain).connect(dropGain.gain);
      tremolo.start();
      owned.push({
        stop: () => { try { tremolo.stop(); } catch { /* already stopped */ } },
        disconnect: () => { tremolo.disconnect(); tremoloGain.disconnect(); dropGain.disconnect(); },
      });
      break;
    }
    case "shush": {
      // Band-passed white noise (~3kHz) + slow amplitude LFO to mimic the
      // rhythmic "shhh-shhh-shhh" pattern parents use to settle babies.
      const bp = makeFilter("bandpass", 3500, 1.2);
      const inner = makeGain(0.6);
      startBufferLoop(b.whiteBuf, bp);
      bp.connect(inner);
      inner.connect(gain);

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 1.5; // ~90 shushes per minute, near a calm heartbeat
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.45;
      lfo.connect(lfoDepth).connect(inner.gain);
      lfo.start();
      owned.push({
        stop: () => { try { lfo.stop(); } catch { /* already stopped */ } },
        disconnect: () => { lfo.disconnect(); lfoDepth.disconnect(); },
      });
      break;
    }
    case "heartbeat": {
      // 70bpm = ~0.857s per beat. Each beat is a "lub" + "dub" — two short
      // sine pulses with a sharp envelope. We schedule a continuous chain
      // of pulses by rebuilding nodes on a metronome timer.
      const filter = makeFilter("lowpass", 200, 1);
      filter.connect(gain);

      let stopped = false;
      const beatInterval = 60 / 70; // seconds per beat
      function scheduleBeat(when: number) {
        if (stopped) return;
        const lub = ctx.createOscillator();
        lub.type = "sine";
        lub.frequency.value = 60;
        const lubEnv = ctx.createGain();
        lubEnv.gain.setValueAtTime(0, when);
        lubEnv.gain.linearRampToValueAtTime(1, when + 0.02);
        lubEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
        lub.connect(lubEnv).connect(filter);
        lub.start(when);
        lub.stop(when + 0.2);

        const dub = ctx.createOscillator();
        dub.type = "sine";
        dub.frequency.value = 80;
        const dubEnv = ctx.createGain();
        dubEnv.gain.setValueAtTime(0, when + 0.22);
        dubEnv.gain.linearRampToValueAtTime(0.7, when + 0.24);
        dubEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.36);
        dub.connect(dubEnv).connect(filter);
        dub.start(when + 0.22);
        dub.stop(when + 0.4);
      }

      // Scheduler — schedule next beat 0.5s ahead, tick every 250ms.
      let nextBeat = ctx.currentTime + 0.05;
      const interval = window.setInterval(() => {
        if (stopped) return;
        const horizon = ctx.currentTime + 0.5;
        while (nextBeat < horizon) {
          scheduleBeat(nextBeat);
          nextBeat += beatInterval;
        }
      }, 250);
      // Prime first few beats immediately so playback isn't silent for 250ms.
      for (let i = 0; i < 3; i++) scheduleBeat(nextBeat + i * beatInterval);
      nextBeat += 3 * beatInterval;

      owned.push({
        stop: () => { stopped = true; window.clearInterval(interval); },
      });
      break;
    }
    case "womb": {
      // Heartbeat (lowpassed harder for a "muffled inside the body" feel) +
      // a low pink-noise blanket for blood flow / amniotic fluid sounds.
      const heartFilter = makeFilter("lowpass", 120, 1.2);
      heartFilter.connect(gain);

      let stopped = false;
      const beatInterval = 60 / 75;
      function scheduleBeat(when: number) {
        if (stopped) return;
        const lub = ctx.createOscillator();
        lub.type = "sine";
        lub.frequency.value = 55;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, when);
        env.gain.linearRampToValueAtTime(0.9, when + 0.03);
        env.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
        lub.connect(env).connect(heartFilter);
        lub.start(when);
        lub.stop(when + 0.25);

        const dub = ctx.createOscillator();
        dub.type = "sine";
        dub.frequency.value = 70;
        const env2 = ctx.createGain();
        env2.gain.setValueAtTime(0, when + 0.26);
        env2.gain.linearRampToValueAtTime(0.55, when + 0.28);
        env2.gain.exponentialRampToValueAtTime(0.001, when + 0.42);
        dub.connect(env2).connect(heartFilter);
        dub.start(when + 0.26);
        dub.stop(when + 0.45);
      }
      let nextBeat = ctx.currentTime + 0.05;
      const interval = window.setInterval(() => {
        if (stopped) return;
        const horizon = ctx.currentTime + 0.5;
        while (nextBeat < horizon) {
          scheduleBeat(nextBeat);
          nextBeat += beatInterval;
        }
      }, 250);
      for (let i = 0; i < 3; i++) scheduleBeat(nextBeat + i * beatInterval);
      nextBeat += 3 * beatInterval;

      // Blood-flow blanket: pink noise → lowpass → into the same gain.
      const lp = makeFilter("lowpass", 350, 0.8);
      const bloodGain = makeGain(0.55);
      startBufferLoop(b.pinkBuf, lp);
      lp.connect(bloodGain);
      bloodGain.connect(gain);

      owned.push({
        stop: () => { stopped = true; window.clearInterval(interval); },
      });
      break;
    }
  }

  // Apply initial volume after fade-in finishes (handled by play()).
  // We just record the target so the engine can ramp to it.
  return {
    gain,
    cleanup: () => {
      // Fade-out first to avoid clicks, then disconnect after a short delay.
      // (Caller decides timing — see stop().)
      owned.forEach((o) => { try { o.stop?.(); } catch { /* already stopped */ } });
      owned.forEach((o) => { try { o.disconnect?.(); } catch { /* already disconnected */ } });
      try { gain.disconnect(); } catch { /* already disconnected */ }
    },
  };
}

// Mark intentionally-unused initialVolume param so eslint stays quiet — it's
// kept on the signature for future per-sound init logic without changing
// the call site.
void DEFAULT_VOLUMES;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSoundEngine(): SoundEngine {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const buffersRef = useRef<{ white: AudioBuffer; pink: AudioBuffer; brown: AudioBuffer } | null>(null);
  const activeRef = useRef<Map<SoundId, ActiveSound>>(new Map());
  const rafRef = useRef<number | null>(null);
  const timerStartRef = useRef<number | null>(null);
  const timerTotalRef = useRef<number | null>(null);

  const [initialized, setInitialized] = useState(false);
  const [active, setActive] = useState<Set<SoundId>>(new Set());
  const [volumes, setVolumes] = useState<Record<SoundId, number>>(DEFAULT_VOLUMES);
  const [timerMs, setTimerMsState] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  // Lazy-init the audio graph on first play (browser autoplay rules).
  const ensureContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    ctxRef.current = ctx;
    masterGainRef.current = masterGain;
    analyserRef.current = analyser;
    buffersRef.current = {
      white: createWhiteNoise(ctx),
      pink: createPinkNoise(ctx),
      brown: createBrownNoise(ctx),
    };
    setInitialized(true);
    return ctx;
  }, []);

  // Timer tick — re-armed *only* when the user picks a new pill (timerMs
  // change). Adding/removing sounds during the countdown does NOT reset the
  // elapsed time. When the active set is empty we skip the countdown body
  // (nothing to stop) but keep the interval alive in case sounds resume.
  useEffect(() => {
    if (timerMs === null) {
      setRemainingMs(null);
      timerStartRef.current = null;
      timerTotalRef.current = null;
      return;
    }
    timerStartRef.current = Date.now();
    timerTotalRef.current = timerMs;
    setRemainingMs(timerMs);
    const interval = window.setInterval(() => {
      if (timerStartRef.current === null || timerTotalRef.current === null) return;
      const elapsed = Date.now() - timerStartRef.current;
      const remaining = Math.max(0, timerTotalRef.current - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        // Fade everything out then clear.
        stopAllRef.current?.();
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerMs]);

  // Clear the displayed remainingMs when no sound is playing AND no timer is
  // armed — keeps the mini-player from showing a stale "X:XX left" pill.
  useEffect(() => {
    if (active.size === 0 && timerMs === null) setRemainingMs(null);
  }, [active.size, timerMs]);

  // Animation consumers (the reactive orb) read the analyser node directly
  // so the engine doesn't have to push amplitude through React state on
  // every frame — that would re-render the entire WhiteNoiseLullaby tree.
  const getAnalyser = useCallback(() => analyserRef.current, []);

  // Suppress unused-warning on rafRef — kept for future amplitude polling
  // hooks that may want to share a single RAF loop across the engine.
  void rafRef;

  const stopAllRef = useRef<(() => void) | null>(null);

  const stop = useCallback((id: SoundId) => {
    const ctx = ctxRef.current;
    const slot = activeRef.current.get(id);
    if (!ctx || !slot) return;
    const now = ctx.currentTime;
    slot.gain.gain.cancelScheduledValues(now);
    slot.gain.gain.setValueAtTime(slot.gain.gain.value, now);
    slot.gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
    // Schedule cleanup after fade — small grace so the ramp completes.
    const cleanup = slot.cleanup;
    activeRef.current.delete(id);
    setActive((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    window.setTimeout(() => cleanup(), FADE_SECONDS * 1000 + 50);
  }, []);

  const play = useCallback((id: SoundId) => {
    if (activeRef.current.has(id)) return; // already playing
    const ctx = ensureContext();
    const masterGain = masterGainRef.current!;
    const buffers = buffersRef.current!;
    if (ctx.state === "suspended") void ctx.resume();

    const slot = buildSound(id, {
      ctx,
      destination: masterGain,
      whiteBuf: buffers.white,
      pinkBuf: buffers.pink,
      brownBuf: buffers.brown,
    }, volumes[id]);

    // Fade-in to the current target volume.
    const now = ctx.currentTime;
    slot.gain.gain.setValueAtTime(0, now);
    slot.gain.gain.linearRampToValueAtTime(volumes[id], now + FADE_SECONDS);

    activeRef.current.set(id, slot);
    setActive((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, [ensureContext, volumes]);

  const stopAll = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    activeRef.current.forEach((slot) => {
      slot.gain.gain.cancelScheduledValues(now);
      slot.gain.gain.setValueAtTime(slot.gain.gain.value, now);
      slot.gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
    });
    const slots = Array.from(activeRef.current.values());
    activeRef.current.clear();
    setActive(new Set());
    window.setTimeout(() => slots.forEach((s) => s.cleanup()), FADE_SECONDS * 1000 + 50);
  }, []);
  stopAllRef.current = stopAll;

  const toggle = useCallback((id: SoundId) => {
    if (activeRef.current.has(id)) stop(id);
    else play(id);
  }, [play, stop]);

  const setVolume = useCallback((id: SoundId, vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumes((prev) => ({ ...prev, [id]: clamped }));
    const slot = activeRef.current.get(id);
    if (!slot || !ctxRef.current) return;
    const now = ctxRef.current.currentTime;
    slot.gain.gain.cancelScheduledValues(now);
    slot.gain.gain.setValueAtTime(slot.gain.gain.value, now);
    slot.gain.gain.linearRampToValueAtTime(clamped, now + 0.15);
  }, []);

  const setTimer = useCallback((ms: number | null) => {
    setTimerMsState(ms);
  }, []);

  // Cleanup on unmount — close the AudioContext to free OS resources.
  useEffect(() => {
    return () => {
      activeRef.current.forEach((slot) => slot.cleanup());
      activeRef.current.clear();
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== "closed") {
        void ctx.close().catch(() => { /* already closed */ });
      }
    };
  }, []);

  return {
    active,
    volumes,
    timerMs,
    remainingMs,
    isPlaying: active.size > 0,
    initialized,
    play,
    stop,
    stopAll,
    toggle,
    setVolume,
    setTimer,
    getAnalyser,
  };
}
