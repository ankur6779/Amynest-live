/** Mouth frame index: 0 = closed, 1 = partially open, 2 = open. */
export type AmyMouthFrame = 0 | 1 | 2;

export const AMY_MOUTH_VOLUME_THRESHOLDS = {
  partial: 15,
  open: 40,
} as const;

export const AMY_MOUTH_SILENCE_MS = 150;
export const AMY_MOUTH_FPS = 30;
export const AMY_MOUTH_FRAME_MS = 1000 / AMY_MOUTH_FPS;

/** Map normalized audio level (0..1) to a 0..100 volume scale. */
export function audioLevelToVolumePercent(level0to1: number): number {
  if (!Number.isFinite(level0to1)) return 0;
  return Math.min(100, Math.max(0, Math.round(level0to1 * 100)));
}

/** Select mouth frame from volume percent (0..100). */
export function volumeToMouthFrame(volume: number): AmyMouthFrame {
  if (volume < AMY_MOUTH_VOLUME_THRESHOLDS.partial) return 0;
  if (volume < AMY_MOUTH_VOLUME_THRESHOLDS.open) return 1;
  return 2;
}

export interface AmyMouthFrameState {
  frame: AmyMouthFrame;
  /** Opacity for partially-open overlay (frame 1). */
  f1Opacity: number;
  /** Opacity for wide-open overlay (frame 2). */
  f2Opacity: number;
}

/** Opacity values for the two open mouth overlays. */
export function mouthFrameToOpacities(frame: AmyMouthFrame): AmyMouthFrameState {
  switch (frame) {
    case 1:
      return { frame: 1, f1Opacity: 1, f2Opacity: 0 };
    case 2:
      return { frame: 2, f1Opacity: 0, f2Opacity: 1 };
    default:
      return { frame: 0, f1Opacity: 0, f2Opacity: 0 };
  }
}

/**
 * Pick mouth frame from live volume with silence decay.
 * Returns closed within {@link AMY_MOUTH_SILENCE_MS} after volume drops.
 */
export function resolveMouthFrameFromVolume(
  volume: number,
  nowMs: number,
  state: { lastSpeechAtMs: number; frame: AmyMouthFrame },
): { frame: AmyMouthFrame; lastSpeechAtMs: number } {
  if (volume >= AMY_MOUTH_VOLUME_THRESHOLDS.partial) {
    return {
      frame: volumeToMouthFrame(volume),
      lastSpeechAtMs: nowMs,
    };
  }
  if (nowMs - state.lastSpeechAtMs >= AMY_MOUTH_SILENCE_MS) {
    return { frame: 0, lastSpeechAtMs: state.lastSpeechAtMs };
  }
  return { frame: state.frame, lastSpeechAtMs: state.lastSpeechAtMs };
}
