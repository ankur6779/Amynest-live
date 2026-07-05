import type { AmyMouthFrame } from "@/lib/amy-3d/amy-mouth-audio";
import {
  AMY_MOUTH_FRAME_MS,
  audioLevelToVolumePercent,
  resolveMouthFrameFromVolume,
} from "@/lib/amy-3d/amy-mouth-audio";

/** Timer-driven mouth cycle when audio meter is unavailable (0→1→2→1). */
const TIMER_CYCLE: readonly AmyMouthFrame[] = [0, 1, 2, 1];

export function timerFallbackMouthFrame(nowMs: number): AmyMouthFrame {
  const idx = Math.floor(nowMs / AMY_MOUTH_FRAME_MS) % TIMER_CYCLE.length;
  return TIMER_CYCLE[idx] ?? 0;
}

export function resolveAmyMouthFrame(input: {
  nowMs: number;
  volume: number;
  meterLive: boolean;
  listenForAudio: boolean;
  speaking: boolean;
  useTimerFallback: boolean;
  mouthState: { lastSpeechAtMs: number; frame: AmyMouthFrame };
}): { frame: AmyMouthFrame; lastSpeechAtMs: number } {
  const {
    nowMs,
    volume,
    meterLive,
    listenForAudio,
    speaking,
    useTimerFallback,
    mouthState,
  } = input;

  if (meterLive && listenForAudio) {
    return resolveMouthFrameFromVolume(volume, nowMs, mouthState);
  }
  if (useTimerFallback && speaking) {
    return { frame: timerFallbackMouthFrame(nowMs), lastSpeechAtMs: mouthState.lastSpeechAtMs };
  }
  if (!speaking) {
    return { frame: 0, lastSpeechAtMs: 0 };
  }
  return mouthState;
}

export function volumeFromLevel(level0to1: number): number {
  return audioLevelToVolumePercent(level0to1);
}

export function stageWaveHeight(
  barDrive: number,
  center: number,
  wob: number,
): number {
  const floor = 0.34;
  return Math.max(floor, Math.min(1, floor + barDrive * (0.45 + 0.55 * center) * wob * 0.88));
}

/** Float + breath scale for shadow sync (0..1 phase). */
export function floatPhase(elapsedSec: number, periodSec: number): number {
  return Math.sin((elapsedSec / periodSec) * Math.PI * 2) * 0.5 + 0.5;
}
