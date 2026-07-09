import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechCoachV2Realtime } from "./use-speech-coach-v2-realtime";
import {
  CONNECTION_TRACE_TAGS,
  GREETING_TRACE_TAGS,
  evaluateConnectionTrace,
  clearVerificationTrace,
  getVerificationTrace,
} from "../lib/verification-trace";

const mintMock = vi.fn();
const prepareMicMock = vi.fn();
const openMicMock = vi.fn();

vi.mock("../lib/api", () => ({
  mintSpeechCoachV2RealtimeToken: (...args: unknown[]) => mintMock(...args),
  SpeechCoachV2ApiError: class extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("@/lib/speech-coach-mic-capture", () => ({
  prepareCoachMicCapture: () => prepareMicMock(),
}));

vi.mock("@/lib/microphone-permission", () => ({
  openMicrophoneStream: (...args: unknown[]) => openMicMock(...args),
}));

vi.mock("../lib/analytics", () => ({
  trackSpeechCoachV2Reconnect: vi.fn(),
  trackSpeechCoachV2Ttfa: vi.fn(),
}));

class MockDataChannel extends EventTarget {
  readyState: RTCDataChannelState = "open";
  send = vi.fn();
  close = vi.fn();
}

describe("useSpeechCoachV2Realtime verification trace (TEST 2/3 simulated runtime)", () => {
  beforeEach(() => {
    clearVerificationTrace();
    prepareMicMock.mockResolvedValue(undefined);
    openMicMock.mockResolvedValue({
      ok: true,
      stream: {
        getAudioTracks: () => [{ stop: vi.fn() }],
        getTracks: () => [{ stop: vi.fn() }],
        active: true,
      },
    });
    mintMock.mockResolvedValue({
      clientSecret: "ek_test_secret",
      callsUrl: "https://api.openai.com/v1/realtime/calls",
      model: "gpt-realtime",
      voice: "shimmer",
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/sdp" }),
        text: async () => "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n",
      })),
    );

    const mockDc = new MockDataChannel() as MockDataChannel & {
      onopen: ((event: Event) => void) | null;
    };
    mockDc.onopen = null;
    vi.stubGlobal(
      "RTCPeerConnection",
      vi.fn(function MockPC(this: {
        ontrack: ((event: RTCTrackEvent) => void) | null;
        oniceconnectionstatechange: (() => void) | null;
        addTrack: ReturnType<typeof vi.fn>;
        createDataChannel: ReturnType<typeof vi.fn>;
        createOffer: ReturnType<typeof vi.fn>;
        setLocalDescription: ReturnType<typeof vi.fn>;
        setRemoteDescription: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
      }) {
        this.ontrack = null;
        this.oniceconnectionstatechange = null;
        this.addTrack = vi.fn();
        this.createDataChannel = vi.fn(() => mockDc);
        this.createOffer = vi.fn(async () => ({ type: "offer", sdp: "fake-offer" }));
        this.setLocalDescription = vi.fn(async () => {});
        this.setRemoteDescription = vi.fn(async () => {
          queueMicrotask(() => {
            mockDc.onopen?.(new Event("open"));
            this.ontrack?.({
              track: { kind: "audio" },
              streams: [{ id: "remote" }],
            } as unknown as RTCTrackEvent);
          });
        });
        this.close = vi.fn();
      }),
    );

    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("emits full connection trace sequence on successful connect", async () => {
    const { result } = renderHook(() =>
      useSpeechCoachV2Realtime({
        authFetch: vi.fn(),
        childId: 1,
        sessionId: "11111111-1111-1111-1111-111111111111",
        tabLockToken: "22222222-2222-2222-2222-222222222222",
        instructions: "Warm up with Amy using simple words.",
        enabled: true,
      }),
    );

    await act(async () => {
      await result.current.connectFromUserGesture();
    });

    const trace = getVerificationTrace();
    const connection = evaluateConnectionTrace(trace);
    expect(connection.pass).toBe(true);
    expect(connection.missing).toEqual([]);

    for (const tag of CONNECTION_TRACE_TAGS) {
      expect(trace.some((entry) => entry.tag === tag)).toBe(true);
    }

    expect(trace.some((entry) => entry.tag === "RESPONSE_CREATE_SENT")).toBe(true);
    expect(result.current.connectionState).toBe("connected");
  });

  it("emits MIC_REQUEST_FAILURE when mic open fails (TEST 1 simulated)", async () => {
    openMicMock.mockResolvedValueOnce({ ok: false, reason: "denied" });

    const { result } = renderHook(() =>
      useSpeechCoachV2Realtime({
        authFetch: vi.fn(),
        childId: 1,
        sessionId: "11111111-1111-1111-1111-111111111111",
        tabLockToken: "22222222-2222-2222-2222-222222222222",
        instructions: "Warm up with Amy using simple words.",
        enabled: true,
      }),
    );

    await act(async () => {
      await result.current.connectFromUserGesture();
    });

    const trace = getVerificationTrace();
    expect(trace.some((e) => e.tag === "MIC_REQUEST_START")).toBe(true);
    expect(trace.some((e) => e.tag === "MIC_REQUEST_FAILURE")).toBe(true);
    expect(trace.some((e) => e.tag === "MIC_REQUEST_SUCCESS")).toBe(false);
    expect(result.current.connectionState).toBe("error");
  });

  it("does not abort an in-flight connect when enabled flips true mid-connect", async () => {
    let resolveMic!: () => void;
    const micGate = new Promise<void>((resolve) => {
      resolveMic = resolve;
    });
    prepareMicMock.mockImplementation(async () => {
      await micGate;
    });

    const { result, rerender } = renderHook(
      (props: { enabled: boolean }) =>
        useSpeechCoachV2Realtime({
          authFetch: vi.fn(),
          childId: 1,
          sessionId: "11111111-1111-1111-1111-111111111111",
          tabLockToken: "22222222-2222-2222-2222-222222222222",
          instructions: "Warm up with Amy using simple words.",
          enabled: props.enabled,
        }),
      { initialProps: { enabled: false } },
    );

    let connectPromise!: Promise<void>;
    await act(async () => {
      connectPromise = result.current.connectFromUserGesture();
    });

    // Mirrors session-page: setLive(true) while connect is awaiting mic.
    rerender({ enabled: true });

    await act(async () => {
      resolveMic();
      await connectPromise;
    });

    expect(mintMock).toHaveBeenCalled();
    expect(result.current.connectionState).toBe("connected");
    expect(result.current.diagnostics.mic).toBe("ok");
    expect(result.current.diagnostics.token).toBe("ok");
  });
});

describe("greeting trace tags", () => {
  it("defines required greeting sequence tags for TEST 3", () => {
    expect(GREETING_TRACE_TAGS).toEqual([
      "RESPONSE_CREATE_SENT",
      "RESPONSE_CREATED",
      "AUDIO_STARTED",
      "AUDIO_COMPLETED",
    ]);
  });
});
