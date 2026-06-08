/**
 * Ephemeral echo playback for Talking Amy — Web Audio transforms, no persistence.
 * Single owner for decode → effect chain → play → teardown.
 */

import {
  closeAudioContext,
  notifyPlaybackEnded,
  notifyPlaybackStarted,
  registerPlaybackStopper,
  trackAudioContext,
} from "@/lib/audio-session-coordinator";
import {
  TALKING_AMY_DEFAULT_MODE,
  type TalkingAmyModeId,
  getTalkingAmyMode,
} from "@/lib/talking-amy-modes";

export { TALKING_AMY_ECHO_RATE } from "@/lib/talking-amy-modes";

type AudioCtor = typeof AudioContext;

let generation = 0;
let activeCtx: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeOscillators: OscillatorNode[] = [];
let playing = false;

function getAudioContextCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as { webkitAudioContext?: AudioCtor }).webkitAudioContext ?? null;
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 256;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

type EffectHandles = {
  oscillators: OscillatorNode[];
};

function wireBabyChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowPassHz ?? 3800;
  lowpass.Q.value = 0.65;

  const gain = ctx.createGain();
  gain.gain.value = 0.92;

  source.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination);
  return { oscillators: [] };
}

function wireChipmunkChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 180;

  source.connect(highpass);
  highpass.connect(destination);
  return { oscillators: [] };
}

function wireRobotChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const carrier = ctx.createOscillator();
  carrier.type = "square";
  carrier.frequency.value = preset.ringModHz ?? 58;

  const modGain = ctx.createGain();
  modGain.gain.value = 1;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 420;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 1150;
  bandpass.Q.value = 3.8;

  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortionCurve(72);
  shaper.oversample = "2x";

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 4200;

  const outGain = ctx.createGain();
  outGain.gain.value = 0.88;

  source.connect(modGain);
  carrier.connect(modGain.gain);
  modGain.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(shaper);
  shaper.connect(lowpass);
  lowpass.connect(outGain);
  outGain.connect(destination);

  carrier.start(0);
  return { oscillators: [carrier] };
}

function wireMonsterChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = preset.highPassHz ?? 90;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowPassHz ?? 2200;
  lowpass.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.value = 0.95;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination);
  return { oscillators: [] };
}

function wireAlienChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const wobble = ctx.createOscillator();
  wobble.type = "sine";
  wobble.frequency.value = preset.wobbleHz ?? 5.5;
  const wobbleDepth = ctx.createGain();
  wobbleDepth.gain.value = preset.wobbleDepthCents ?? 180;
  wobble.connect(wobbleDepth);
  wobbleDepth.connect(source.detune);

  const dry = ctx.createGain();
  dry.gain.value = 0.72;

  const delay = ctx.createDelay(0.6);
  delay.delayTime.value = preset.echoDelaySec ?? 0.17;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.34;
  const wet = ctx.createGain();
  wet.gain.value = preset.echoMix ?? 0.38;

  source.connect(dry);
  source.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  dry.connect(destination);
  wet.connect(destination);

  wobble.start(0);
  return { oscillators: [wobble] };
}

function wireModeChain(
  modeId: TalkingAmyModeId,
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  destination: AudioNode,
): EffectHandles {
  const preset = getTalkingAmyMode(modeId).voice;
  switch (modeId) {
    case "baby":
      return wireBabyChain(source, ctx, preset, destination);
    case "chipmunk":
      return wireChipmunkChain(source, ctx, preset, destination);
    case "robot":
      return wireRobotChain(source, ctx, preset, destination);
    case "alien":
      return wireAlienChain(source, ctx, preset, destination);
    case "monster":
      return wireMonsterChain(source, ctx, preset, destination);
    default:
      return wireChipmunkChain(source, ctx, preset, destination);
  }
}

function teardownActive(): void {
  generation += 1;
  playing = false;

  for (const osc of activeOscillators) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      /* ignore */
    }
  }
  activeOscillators = [];

  if (activeSource) {
    try {
      activeSource.onended = null;
      activeSource.stop();
      activeSource.disconnect();
      activeSource.buffer = null;
    } catch {
      /* ignore */
    }
    activeSource = null;
  }

  const ctx = activeCtx;
  activeCtx = null;
  if (ctx) void closeAudioContext(ctx);
  notifyPlaybackEnded("talking-amy-echo");
}

export function stopTalkingAmyEcho(): void {
  teardownActive();
}

export function isTalkingAmyEchoPlaying(): boolean {
  return playing;
}

export type TalkingAmyEchoResult = { ok: true } | { ok: false; error: string };

export type PlayTalkingAmyEchoOptions = {
  mode?: TalkingAmyModeId;
  onPlaybackStart?: () => void;
};

async function decodeBlob(ctx: AudioContext, blob: Blob): Promise<AudioBuffer> {
  const buf = await blob.arrayBuffer();
  return ctx.decodeAudioData(buf.slice(0));
}

/**
 * Play one in-memory recording with mode-specific Web Audio transforms.
 * Blob is never uploaded; buffer is released on teardown.
 */
export async function playTalkingAmyEcho(
  blob: Blob,
  opts?: PlayTalkingAmyEchoOptions,
): Promise<TalkingAmyEchoResult> {
  if (!blob || blob.size < 32) {
    return { ok: false, error: "echo_empty_blob" };
  }

  const modeId = opts?.mode ?? TALKING_AMY_DEFAULT_MODE;
  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    return { ok: false, error: "echo_no_audio_context" };
  }

  stopTalkingAmyEcho();
  const gen = ++generation;

  let ctx: AudioContext;
  try {
    ctx = new Ctor();
    trackAudioContext(ctx);
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    return { ok: false, error: "echo_context_failed" };
  }

  activeCtx = ctx;

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await decodeBlob(ctx, blob);
  } catch {
    teardownActive();
    return { ok: false, error: "echo_decode_failed" };
  }

  if (gen !== generation) {
    return { ok: false, error: "echo_cancelled" };
  }

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  activeSource = source;

  const handles = wireModeChain(modeId, source, ctx, ctx.destination);
  activeOscillators = handles.oscillators;

  return new Promise((resolve) => {
    const finish = (result: TalkingAmyEchoResult) => {
      if (gen !== generation) return;
      teardownActive();
      resolve(result);
    };

    source.onended = () => finish({ ok: true });

    try {
      notifyPlaybackStarted("talking-amy-echo");
      playing = true;
      opts?.onPlaybackStart?.();
      const startAt = ctx.currentTime + 0.02;
      source.start(startAt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      finish({ ok: false, error: msg || "echo_start_failed" });
    }
  });
}

if (typeof window !== "undefined") {
  registerPlaybackStopper(stopTalkingAmyEcho);
}
