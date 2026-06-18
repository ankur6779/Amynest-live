import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechCoachV2Session } from "./use-speech-coach-v2-session";

const heartbeatMock = vi.fn();
const usageMock = vi.fn();
const startMock = vi.fn();
const activeMock = vi.fn();

vi.mock("../lib/api", () => ({
  heartbeatSpeechCoachV2Session: (...args: unknown[]) => heartbeatMock(...args),
  fetchSpeechCoachV2Usage: (...args: unknown[]) => usageMock(...args),
  startSpeechCoachV2Session: (...args: unknown[]) => startMock(...args),
  fetchActiveSpeechCoachV2Session: (...args: unknown[]) => activeMock(...args),
  completeSpeechCoachV2Session: vi.fn(),
  evaluateSpeechCoachV2Turn: vi.fn(),
  SpeechCoachV2ApiError: class extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("../lib/storage", () => ({
  loadLocalSnapshot: () => null,
  saveLocalSnapshot: vi.fn(),
  clearLocalSnapshot: vi.fn(),
}));

vi.mock("../lib/analytics", () => ({
  trackSpeechCoachV2SessionStart: vi.fn(),
  trackSpeechCoachV2SessionComplete: vi.fn(),
  trackSpeechCoachV2LimitReached: vi.fn(),
}));

const authFetch = vi.fn(async () => ({
  ok: true,
  json: async () => ({}),
}));

const sessionState = {
  sessionId: "11111111-1111-1111-1111-111111111111",
  childId: 1,
  childName: "Mia",
  ageBand: "4-5" as const,
  phase: "warm_up" as const,
  phaseStartedAt: Date.now(),
  sessionStartedAt: Date.now(),
  exerciseIndex: 0,
  exercises: [],
  phaseAttempts: 0,
  phaseSuccesses: 0,
  starsEarned: 0,
  pointsEarned: 0,
  wordsSpoken: 0,
  sentencesCompleted: 0,
  turnCount: 0,
};

describe("useSpeechCoachV2Session heartbeat gating", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    heartbeatMock.mockReset();
    usageMock.mockResolvedValue({
      speechSecondsUsed: 0,
      remainingSeconds: 600,
      limitReached: false,
    });
    activeMock.mockResolvedValue({ hasActiveSession: false });
    startMock.mockResolvedValue({
      sessionId: sessionState.sessionId,
      tabLockToken: "22222222-2222-2222-2222-222222222222",
      ageBand: "4-5",
      sessionState,
      instructions: "Practice warm up words with Amy today.",
      remainingSeconds: 600,
    });
    heartbeatMock.mockResolvedValue({
      ok: true,
      remainingSeconds: 585,
      secondsConsumed: 15,
      sessionState,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not bill heartbeat while live but realtime is disconnected (TEST 4)", async () => {
    const { result } = renderHook(
      (props: { realtimeConnected: boolean }) =>
        useSpeechCoachV2Session({
          authFetch,
          childId: 1,
          childName: "Mia",
          ageMonths: 48,
          enabled: true,
          realtimeConnected: props.realtimeConnected,
        }),
      { initialProps: { realtimeConnected: false } },
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.beginLive();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(heartbeatMock).not.toHaveBeenCalled();
  });

  it("bills heartbeat only after realtime connects", async () => {
    const { result, rerender } = renderHook(
      (props: { realtimeConnected: boolean }) =>
        useSpeechCoachV2Session({
          authFetch,
          childId: 1,
          childName: "Mia",
          ageMonths: 48,
          enabled: true,
          realtimeConnected: props.realtimeConnected,
        }),
      { initialProps: { realtimeConnected: false } },
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.beginLive();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(heartbeatMock).not.toHaveBeenCalled();

    rerender({ realtimeConnected: true });

    await act(async () => {
      await Promise.resolve();
    });
    expect(heartbeatMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(heartbeatMock).toHaveBeenCalledTimes(2);
  });
});
