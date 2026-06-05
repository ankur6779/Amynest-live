import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/client-logs", () => ({
  queueClientLog: vi.fn(),
}));

vi.mock("@/lib/startup-orchestrator", () => ({
  trackStartupEvent: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getApiUrl: (path: string) => `https://api.test${path}`,
}));

vi.mock("@/lib/audio-api-recovery", () => ({
  waitForAudioApiOnBoot: vi.fn().mockResolvedValue(true),
  startAudioApiRecoveryWatcher: vi.fn(),
  markAudioApiUnreachable: vi.fn(),
}));

vi.mock("@/lib/static-audio-telemetry", () => ({
  recordClientCdnCacheStatus: vi.fn(),
}));

vi.mock("@/lib/global-audio-warmup", () => ({
  initGlobalAudioWarmup: vi.fn(),
}));

vi.mock("@/lib/emergency-audio", () => ({
  preloadSpeechSynthesisVoices: vi.fn(),
}));

vi.mock("@/lib/phonics-manifest-validation", () => ({
  initPhonicsManifestValidation: vi.fn(),
}));

import {
  getAudioBootStateForTests,
  isAudioStartupGraceActive,
  resetAudioBootOrchestratorForTests,
  runStartupAudioOperation,
  scheduleAudioBoot,
  subscribeVoiceUnavailable,
} from "@/lib/audio-boot-orchestrator";

describe("audio-boot-orchestrator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", (cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
      return 1;
    });
    resetAudioBootOrchestratorForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, status: "ok", gcs: true, gcsProbeOk: true }),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetAudioBootOrchestratorForTests();
  });

  it("runStartupAudioOperation logs failures without throwing", async () => {
    const op = await runStartupAudioOperation(
      "test_probe",
      "https://api.test/probe",
      100,
      async () => {
        throw new Error("probe_failed");
      },
    );

    expect(op.ok).toBe(false);
    expect(op.error).toBe("probe_failed");
    expect(op.label).toBe("test_probe");
    expect(op.url).toBe("https://api.test/probe");
  });

  it("scheduleAudioBoot runs in background and marks success", async () => {
    const statuses: boolean[] = [];
    subscribeVoiceUnavailable((unavailable) => statuses.push(unavailable));

    scheduleAudioBoot();
    expect(isAudioStartupGraceActive()).toBe(true);

    await vi.runAllTimersAsync();

    const state = getAudioBootStateForTests();
    expect(state.bootScheduled).toBe(true);
    expect(state.bootSettled).toBe(true);
    expect(state.bootSucceeded).toBe(true);
    expect(state.voiceUnavailable).toBe(false);
    expect(statuses.at(-1)).toBe(false);
  });

  it("retries with backoff then marks voice unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const { waitForAudioApiOnBoot } = await import("@/lib/audio-api-recovery");
    vi.mocked(waitForAudioApiOnBoot).mockResolvedValue(false);

    scheduleAudioBoot();
    await vi.runAllTimersAsync();

    const state = getAudioBootStateForTests();
    expect(state.bootSettled).toBe(true);
    expect(state.bootSucceeded).toBe(false);
    expect(state.voiceUnavailable).toBe(true);
    expect(state.retryGeneration).toBe(3);
  });
});
