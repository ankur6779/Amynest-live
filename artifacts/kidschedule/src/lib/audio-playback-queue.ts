/**
 * Centralized playback queue policies — interrupt vs FIFO by module.
 */

import type { AudioReliabilityModule } from "@/lib/audio-reliability-telemetry";

export type QueuePolicy = "interrupt" | "fifo";

const MODULE_POLICY: Record<AudioReliabilityModule, QueuePolicy> = {
  phonics: "interrupt",
  blending: "interrupt",
  speech_coach: "interrupt",
  parent_hub: "fifo",
  reading: "fifo",
  lesson: "fifo",
  other: "interrupt",
};

type FifoItem = {
  run: () => Promise<void>;
};

let fifoQueue: FifoItem[] = [];
let fifoDraining = false;
let queueDepthMax = 0;
let interruptionCount = 0;
let stalePreventedCount = 0;

export function getQueuePolicy(module: AudioReliabilityModule): QueuePolicy {
  return MODULE_POLICY[module] ?? "interrupt";
}

export function recordQueueInterruption(): void {
  interruptionCount += 1;
}

export function recordStaleAudioPrevented(): void {
  stalePreventedCount += 1;
}

export function getPlaybackQueueStats(): {
  queue_depth: number;
  queue_depth_max: number;
  interruptions: number;
  stale_audio_prevented: number;
} {
  return {
    queue_depth: fifoQueue.length + (fifoDraining ? 1 : 0),
    queue_depth_max: queueDepthMax,
    interruptions: interruptionCount,
    stale_audio_prevented: stalePreventedCount,
  };
}

/** Serialize playback for FIFO modules (Parent Hub, lessons, reading). */
export function enqueueFifoPlayback(run: () => Promise<void>): void {
  fifoQueue.push({ run });
  queueDepthMax = Math.max(queueDepthMax, fifoQueue.length);
  void drainFifo();
}

async function drainFifo(): Promise<void> {
  if (fifoDraining) return;
  fifoDraining = true;
  try {
    while (fifoQueue.length > 0) {
      const item = fifoQueue.shift();
      if (!item) break;
      await item.run();
    }
  } finally {
    fifoDraining = false;
    if (fifoQueue.length > 0) void drainFifo();
  }
}

export function clearPlaybackQueue(): void {
  fifoQueue.length = 0;
}
