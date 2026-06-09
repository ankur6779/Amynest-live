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
  getChipmunkPlaybackRate,
  getTalkingAmyMode,
} from "@/lib/talking-amy-modes";

export { TALKING_AMY_ECHO_RATE } from "@/lib/talking-amy-modes";

type AudioCtor = typeof AudioContext;

export type TalkingAmyEchoResult = { ok: true } | { ok: false; error: string };

let generation = 0;
let activeCtx: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeOscillators: OscillatorNode[] = [];
let playing = false;
let pendingResolve: ((result: TalkingAmyEchoResult) => void) | null = null;

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
  recordingDurationSec: number,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = getChipmunkPlaybackRate(recordingDurationSec);

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 180;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowPassHz ?? 6800;
  lowpass.Q.value = 0.55;

  const gain = ctx.createGain();
  gain.gain.value = 0.94;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination);
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

function wireEchoReverbChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const dry = ctx.createGain();
  dry.gain.value = 0.78;

  const echoDelay = ctx.createDelay(0.8);
  echoDelay.delayTime.value = preset.echoDelaySec ?? 0.2;
  const echoFb = ctx.createGain();
  echoFb.gain.value = 0.28;
  const echoWet = ctx.createGain();
  echoWet.gain.value = preset.echoMix ?? 0.3;

  const reverbDelay = ctx.createDelay(0.9);
  reverbDelay.delayTime.value = preset.reverbDelaySec ?? 0.35;
  const reverbFb = ctx.createGain();
  reverbFb.gain.value = 0.22;
  const reverbWet = ctx.createGain();
  reverbWet.gain.value = preset.reverbMix ?? 0.25;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowPassHz ?? 5000;

  source.connect(dry);
  source.connect(echoDelay);
  echoDelay.connect(echoFb);
  echoFb.connect(echoDelay);
  echoDelay.connect(echoWet);
  source.connect(reverbDelay);
  reverbDelay.connect(reverbFb);
  reverbFb.connect(reverbDelay);
  reverbDelay.connect(reverbWet);
  dry.connect(lowpass);
  echoWet.connect(lowpass);
  reverbWet.connect(lowpass);
  lowpass.connect(destination);
  return { oscillators: [] };
}

function wireSpaceChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const delay = ctx.createDelay(0.2);
  delay.delayTime.value = preset.transmissionDelaySec ?? 0.05;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value =
    ((preset.radioBandLowHz ?? 420) + (preset.radioBandHighHz ?? 3200)) / 2;
  bandpass.Q.value = 1.2;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = preset.radioBandLowHz ?? 420;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.radioBandHighHz ?? 3200;

  const gain = ctx.createGain();
  gain.gain.value = 0.9;

  source.connect(delay);
  delay.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination);
  return { oscillators: [] };
}

function wireMagicChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const shimmer = ctx.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.value = preset.shimmerHz ?? 6.5;
  const shimmerDepth = ctx.createGain();
  shimmerDepth.gain.value = preset.shimmerDepthCents ?? 45;
  shimmer.connect(shimmerDepth);
  shimmerDepth.connect(source.detune);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowPassHz ?? 7200;
  lowpass.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.93;

  source.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination);
  shimmer.start(0);
  return { oscillators: [shimmer] };
}

function wireFrogChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const peak = ctx.createBiquadFilter();
  peak.type = "peaking";
  peak.frequency.value = preset.resonanceHz ?? 320;
  peak.Q.value = preset.resonanceQ ?? 4.2;
  peak.gain.value = 5;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowPassHz ?? 4800;

  const gain = ctx.createGain();
  gain.gain.value = 0.94;

  source.connect(peak);
  peak.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination);
  return { oscillators: [] };
}

function wireRainbowChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const wobble = ctx.createOscillator();
  wobble.type = "sine";
  wobble.frequency.value = preset.wobbleHz ?? 4.2;
  const wobbleDepth = ctx.createGain();
  wobbleDepth.gain.value = preset.wobbleDepthCents ?? 90;
  wobble.connect(wobbleDepth);
  wobbleDepth.connect(source.detune);

  const shimmer = ctx.createOscillator();
  shimmer.type = "triangle";
  shimmer.frequency.value = preset.shimmerHz ?? 8;
  const shimmerDepth = ctx.createGain();
  shimmerDepth.gain.value = preset.shimmerDepthCents ?? 35;
  shimmer.connect(shimmerDepth);
  shimmerDepth.connect(source.detune);

  const gain = ctx.createGain();
  gain.gain.value = 0.92;
  source.connect(gain);
  gain.connect(destination);
  wobble.start(0);
  shimmer.start(0);
  return { oscillators: [wobble, shimmer] };
}

function wireLightningChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const carrier = ctx.createOscillator();
  carrier.type = "square";
  carrier.frequency.value = preset.ringModHz ?? 42;
  const modGain = ctx.createGain();
  modGain.gain.value = 0.35;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = preset.highPassHz ?? 280;

  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortionCurve(48);
  shaper.oversample = "2x";

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowPassHz ?? 5200;

  const outGain = ctx.createGain();
  outGain.gain.value = 0.86;

  source.connect(modGain);
  carrier.connect(modGain.gain);
  modGain.connect(highpass);
  highpass.connect(shaper);
  shaper.connect(lowpass);
  lowpass.connect(outGain);
  outGain.connect(destination);
  carrier.start(0);
  return { oscillators: [carrier] };
}

function wireGalaxyChain(
  source: AudioBufferSourceNode,
  ctx: AudioContext,
  preset: ReturnType<typeof getTalkingAmyMode>["voice"],
  destination: AudioNode,
): EffectHandles {
  source.detune.value = preset.detuneCents;
  source.playbackRate.value = preset.playbackRate;

  const wobble = ctx.createOscillator();
  wobble.type = "sine";
  wobble.frequency.value = preset.wobbleHz ?? 3.2;
  const wobbleDepth = ctx.createGain();
  wobbleDepth.gain.value = preset.wobbleDepthCents ?? 120;
  wobble.connect(wobbleDepth);
  wobbleDepth.connect(source.detune);

  const dry = ctx.createGain();
  dry.gain.value = 0.65;
  const delay = ctx.createDelay(0.8);
  delay.delayTime.value = preset.echoDelaySec ?? 0.28;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const wet = ctx.createGain();
  wet.gain.value = preset.echoMix ?? 0.42;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowPassHz ?? 3600;

  source.connect(dry);
  source.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  dry.connect(lowpass);
  wet.connect(lowpass);
  lowpass.connect(destination);
  wobble.start(0);
  return { oscillators: [wobble] };
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
  recordingDurationSec: number,
): EffectHandles {
  const preset = getTalkingAmyMode(modeId).voice;
  switch (modeId) {
    case "baby":
      return wireBabyChain(source, ctx, preset, destination);
    case "chipmunk":
      return wireChipmunkChain(source, ctx, preset, destination, recordingDurationSec);
    case "robot":
      return wireRobotChain(source, ctx, preset, destination);
    case "alien":
      return wireAlienChain(source, ctx, preset, destination);
    case "monster":
      return wireMonsterChain(source, ctx, preset, destination);
    case "ghost":
      return wireEchoReverbChain(source, ctx, preset, destination);
    case "space":
      return wireSpaceChain(source, ctx, preset, destination);
    case "magic":
      return wireMagicChain(source, ctx, preset, destination);
    case "frog":
      return wireFrogChain(source, ctx, preset, destination);
    case "rainbow":
      return wireRainbowChain(source, ctx, preset, destination);
    case "lightning":
      return wireLightningChain(source, ctx, preset, destination);
    case "galaxy":
      return wireGalaxyChain(source, ctx, preset, destination);
    default:
      return wireChipmunkChain(source, ctx, preset, destination, recordingDurationSec);
  }
}

function teardownActive(opts?: { resolvePending?: boolean }): void {
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

  if (opts?.resolvePending !== false && pendingResolve) {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve({ ok: false, error: "echo_cancelled" });
  }
}

export function stopTalkingAmyEcho(): void {
  teardownActive();
}

export function isTalkingAmyEchoPlaying(): boolean {
  return playing;
}

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

  const handles = wireModeChain(modeId, source, ctx, ctx.destination, audioBuffer.duration);
  activeOscillators = handles.oscillators;

  return new Promise((resolve) => {
    pendingResolve = resolve;

    const finish = (result: TalkingAmyEchoResult) => {
      if (gen !== generation) return;
      pendingResolve = null;
      teardownActive({ resolvePending: false });
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
