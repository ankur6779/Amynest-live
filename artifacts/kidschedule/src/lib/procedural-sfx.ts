/**
 * Shared Web Audio context for procedural UI sounds (not narration / TTS).
 * SFX only — never use for Amy voice, phonics clips, or Speech Coach playback.
 */

import { trackAudioContext } from "@/lib/audio-session-coordinator";

let audioCtx: AudioContext | null = null;

export function getProceduralAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  type AudioCtxCtor = typeof AudioContext;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
      trackAudioContext(audioCtx);
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** Short oscillator tone — game feedback, abacus beads, quiz taps. */
export function playProceduralTone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gain = 0.04,
): void {
  const ctx = getProceduralAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(ctx.destination);
    const now = ctx.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  } catch {
    /* optional UX polish */
  }
}
