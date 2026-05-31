/**
 * Phase 11 — WebView / Capacitor audio stress harness (dev only).
 */

import { amyVoiceController } from "@/lib/amy-voice-controller";
import { amyVoicePlaybackFsm } from "@/lib/audio-playback-state-machine";
import { phonicsPlaybackFsm } from "@/lib/audio-playback-state-machine";
import { getPlaybackQueueStats } from "@/lib/audio-playback-queue";
import { getCoalescerInFlightCount } from "@/lib/audio-request-coalescer";
import { getLatencyReport } from "@/lib/audio-reliability-telemetry";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type AudioStressReport = {
  rapidTapRuns: number;
  stuckPlaying: boolean;
  orphanedCoalescer: number;
  queueDepth: number;
  amyFsm: string;
  phonicsFsm: string;
  latency: ReturnType<typeof getLatencyReport>;
};

async function rapidSpeakBurst(texts: string[], gapMs = 30): Promise<number> {
  let fired = 0;
  const runtime = {
    authFetch: async () => ({ ok: false, status: 503 } as Response),
    isMounted: () => true,
  };
  for (const t of texts) {
    void amyVoiceController.speak(t, { mode: "phonics", phoneme: t }, runtime);
    fired += 1;
    await sleep(gapMs);
  }
  await sleep(500);
  return fired;
}

function simulateLifecycle(): void {
  document.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("pagehide"));
  window.dispatchEvent(new Event("pageshow"));
  window.dispatchEvent(new FocusEvent("blur"));
  window.dispatchEvent(new FocusEvent("focus"));
}

export async function runAudioStressSuite(): Promise<AudioStressReport> {
  amyVoiceController.pause();
  simulateLifecycle();
  const rapidTapRuns = await rapidSpeakBurst(["a", "b", "c", "a", "b", "c"], 25);
  simulateLifecycle();
  await sleep(300);

  const snap = amyVoiceController.getSnapshot();
  const stuckPlaying = snap.status === "loading" || snap.status === "playing";
  const queue = getPlaybackQueueStats();

  return {
    rapidTapRuns,
    stuckPlaying,
    orphanedCoalescer: getCoalescerInFlightCount(),
    queueDepth: queue.queue_depth,
    amyFsm: amyVoicePlaybackFsm.getSnapshot().state,
    phonicsFsm: phonicsPlaybackFsm.getSnapshot().state,
    latency: getLatencyReport(),
  };
}

declare global {
  interface Window {
    __amynestAudioStress?: {
      run: () => Promise<AudioStressReport>;
      rapidTap: typeof rapidSpeakBurst;
      lifecycle: typeof simulateLifecycle;
    };
  }
}

export function installAudioStressHarness(): void {
  if (typeof window === "undefined") return;
  window.__amynestAudioStress = {
    run: runAudioStressSuite,
    rapidTap: rapidSpeakBurst,
    lifecycle: simulateLifecycle,
  };
  console.info("[AudioStress] Ready — await __amynestAudioStress.run()");
}
