/** Shared Web Audio context for Amy output metering (one context per page). */
let sharedCtx: AudioContext | null = null;

export function getAmySharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx) return sharedCtx;

  const Ctx =
    window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;

  sharedCtx = new Ctx();
  return sharedCtx;
}

export async function resumeAmySharedAudioContext(): Promise<void> {
  const ctx = getAmySharedAudioContext();
  if (ctx?.state === "suspended") {
    await ctx.resume();
  }
}

export function closeAmySharedAudioContext(): void {
  if (!sharedCtx) return;
  void sharedCtx.close().catch(() => {});
  sharedCtx = null;
}

export function computeRmsFromTimeDomain(buf: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i]! - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

/** Scale RMS to 0..1 with gentle gain for speech metering. */
export function rmsToAudioLevel(rms: number, gain = 3.2): number {
  return Math.min(1, Math.max(0, rms * gain));
}
