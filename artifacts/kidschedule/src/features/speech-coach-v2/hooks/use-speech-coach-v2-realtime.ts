import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthFetchFn } from "@/lib/poll-result";
import { openMicrophoneStream } from "@/lib/microphone-permission";
import { prepareCoachMicCapture } from "@/lib/speech-coach-mic-capture";
import { mintSpeechCoachV2RealtimeToken, reportSpeechCoachV2TokenUsage, SpeechCoachV2ApiError } from "../lib/api";
import {
  buildSpeechCoachV2MicConstraints,
  EMPTY_REALTIME_USAGE_DELTA,
  isLikelyFalseInterrupt,
  mergeRealtimeUsageDelta,
  parseRealtimeResponseUsage,
  probeSpeechCoachV2MicConstraintSupport,
  SPEECH_COACH_V2_MIN_SPEECH_MS,
  speechCoachV2TurnDetectionForMode,
  type RealtimeUsageDelta,
} from "@workspace/speech-coach-v2";
import {
  exchangeRealtimeSdpOffer,
  type RealtimeSdpExchangeDiagnostics,
} from "@/lib/openai-realtime-webrtc";
import {
  trackSpeechCoachV2ChildSpeechDetected,
  trackSpeechCoachV2FalseInterrupt,
  trackSpeechCoachV2Reconnect,
  trackSpeechCoachV2TokenUsage,
  trackSpeechCoachV2Ttfa,
  trackSpeechCoachV2VadTrigger,
} from "../lib/analytics";
import { detectVerificationPlatform, verificationTrace } from "../lib/verification-trace";

export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface UseSpeechCoachV2RealtimeOptions {
  authFetch: AuthFetchFn;
  childId: number;
  sessionId: string;
  tabLockToken: string;
  instructions: string;
  enabled: boolean;
  onUserTranscript?: (text: string, rawText?: string) => void;
  onAssistantTranscript?: (text: string) => void;
  onError?: (message: string) => void;
  onLimitReached?: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

export type RealtimeDiagnostics = {
  mic: "pending" | "ok" | "fail";
  token: "pending" | "ok" | "fail";
  sdp: "pending" | "ok" | "fail";
  audio: "pending" | "ok" | "fail";
  model: string | null;
  lastError: string | null;
  sdpDetail: RealtimeSdpExchangeDiagnostics | null;
};

const INITIAL_DIAGNOSTICS: RealtimeDiagnostics = {
  mic: "pending",
  token: "pending",
  sdp: "pending",
  audio: "pending",
  model: null,
  lastError: null,
  sdpDetail: null,
};

const REALTIME_DEBUG = import.meta.env.DEV;
const TOKEN_FLUSH_RESPONSE_THRESHOLD = 3;

function emptyPendingUsage(): { delta: RealtimeUsageDelta; responseCount: number } {
  return { delta: { ...EMPTY_REALTIME_USAGE_DELTA }, responseCount: 0 };
}

function rtLog(stage: string, detail?: Record<string, unknown>) {
  if (REALTIME_DEBUG) {
    console.debug("[speech-coach-v2:realtime]", stage, detail ?? "");
  }
}

function micFailure(err: unknown): never {
  const error = err instanceof Error ? err : new Error(String(err));
  verificationTrace("MIC_REQUEST_FAILURE", {
    name: error.name,
    message: error.message,
    platform: detectVerificationPlatform(),
  });
  throw error;
}

export function useSpeechCoachV2Realtime(options: UseSpeechCoachV2RealtimeOptions) {
  const {
    authFetch,
    childId,
    sessionId,
    tabLockToken,
    instructions,
    enabled,
    onUserTranscript,
    onAssistantTranscript,
    onError,
    onLimitReached,
    onConnectionChange,
  } = options;

  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");
  const [diagnostics, setDiagnostics] = useState<RealtimeDiagnostics>(INITIAL_DIAGNOSTICS);
  // Reactive mirror of amySpeakingRef so the avatar can animate Amy's mouth.
  const [amySpeaking, setAmySpeakingState] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartedAtRef = useRef<number>(Date.now());
  const connectStartedAtRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);
  const amySpeakingRef = useRef(false);
  const vadSpeechStartedAtRef = useRef<number | null>(null);
  const vadAmySpeakingAtStartRef = useRef(false);
  // Live amplitude (0..1) of Amy's OUTPUT audio, updated via a Web Audio
  // analyser on the remote stream. Drives the avatar's halo/headphone/waveform
  // cues without re-rendering. Stays 0 if Web Audio is unavailable (the cues
  // then fall back to a gentle CSS animation), so this is always safe.
  const amyAudioLevelRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const startAnalyserRef = useRef<(stream: MediaStream) => void>(() => {});
  const stopAnalyserRef = useRef<() => void>(() => {});
  const instructionsRef = useRef(instructions);
  instructionsRef.current = instructions;

  const authFetchRef = useRef(authFetch);
  authFetchRef.current = authFetch;
  const onUserTranscriptRef = useRef(onUserTranscript);
  onUserTranscriptRef.current = onUserTranscript;
  const onAssistantTranscriptRef = useRef(onAssistantTranscript);
  onAssistantTranscriptRef.current = onAssistantTranscript;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onLimitReachedRef = useRef(onLimitReached);
  onLimitReachedRef.current = onLimitReached;
  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;

  const childIdRef = useRef(childId);
  childIdRef.current = childId;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const tabLockTokenRef = useRef(tabLockToken);
  tabLockTokenRef.current = tabLockToken;
  const modelRef = useRef<string | null>(null);
  const pendingUsageRef = useRef(emptyPendingUsage());
  const sessionUsageTotalsRef = useRef<RealtimeUsageDelta>({ ...EMPTY_REALTIME_USAGE_DELTA });
  const flushingUsageRef = useRef(false);

  const flushTokenUsage = useCallback(async () => {
    const pending = pendingUsageRef.current;
    const sid = sessionIdRef.current;
    const token = tabLockTokenRef.current;
    if (!sid || !token || pending.responseCount <= 0 || flushingUsageRef.current) return;

    flushingUsageRef.current = true;
    const payload = { ...pending };
    pendingUsageRef.current = emptyPendingUsage();

    try {
      const result = await reportSpeechCoachV2TokenUsage(authFetchRef.current, {
        childId: childIdRef.current,
        sessionId: sid,
        tabLockToken: token,
        delta: payload.delta,
        responseCount: payload.responseCount,
        model: modelRef.current ?? undefined,
      });
      trackSpeechCoachV2TokenUsage({
        childId: childIdRef.current,
        sessionId: sid,
        inputTokens: result.sessionTotals.inputTokens,
        outputTokens: result.sessionTotals.outputTokens,
        estimatedCostInr: result.sessionCostInr,
      });
    } catch (err) {
      pendingUsageRef.current = {
        delta: mergeRealtimeUsageDelta(payload.delta, pendingUsageRef.current.delta),
        responseCount: payload.responseCount + pendingUsageRef.current.responseCount,
      };
      rtLog("usage.flush.fail", {
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      flushingUsageRef.current = false;
    }
  }, []);

  const queueTokenUsageFlush = useCallback(() => {
    if (pendingUsageRef.current.responseCount >= TOKEN_FLUSH_RESPONSE_THRESHOLD) {
      void flushTokenUsage();
    }
  }, [flushTokenUsage]);

  const setConnected = useCallback((connected: boolean, state: RealtimeConnectionState) => {
    setConnectionState(state);
    onConnectionChangeRef.current?.(connected);
  }, []);

  const sendSessionUpdate = useCallback((nextInstructions: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: nextInstructions,
        },
      }),
    );
  }, []);

  const sendTurnDetectionUpdate = useCallback((mode: "listening" | "amy_speaking") => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          audio: {
            input: {
              noise_reduction: { type: "near_field" },
              turn_detection: speechCoachV2TurnDetectionForMode(mode),
            },
          },
        },
      }),
    );
    rtLog("vad.update", { mode, ...speechCoachV2TurnDetectionForMode(mode) });
  }, []);

  const setAmySpeaking = useCallback(
    (speaking: boolean) => {
      if (amySpeakingRef.current === speaking) return;
      amySpeakingRef.current = speaking;
      setAmySpeakingState(speaking);
      sendTurnDetectionUpdate(speaking ? "amy_speaking" : "listening");
    },
    [sendTurnDetectionUpdate],
  );

  const sendInitialGreeting = useCallback(() => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(JSON.stringify({ type: "response.create" }));
  }, []);

  const stopOutputAnalyser = useCallback(() => {
    if (levelRafRef.current != null) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    try {
      audioSourceRef.current?.disconnect();
    } catch {
      /* already disconnected */
    }
    audioSourceRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    amyAudioLevelRef.current = 0;
  }, []);

  const startOutputAnalyser = useCallback((stream: MediaStream) => {
    stopAnalyserRef.current();
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      // NOTE: do NOT connect the analyser to ctx.destination — the <audio>
      // element already plays the stream; this taps it for metering only.
      source.connect(analyser);
      audioCtxRef.current = ctx;
      audioSourceRef.current = source;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const target = Math.min(1, rms * 3.2); // gentle gain so quiet speech reads
        amyAudioLevelRef.current += (target - amyAudioLevelRef.current) * 0.4;
        levelRafRef.current = requestAnimationFrame(tick);
      };
      levelRafRef.current = requestAnimationFrame(tick);
    } catch {
      // Web Audio blocked/unsupported → leave level at 0 (CSS fallback animates).
    }
  }, []);
  startAnalyserRef.current = startOutputAnalyser;
  stopAnalyserRef.current = stopOutputAnalyser;

  const cleanupPeerConnection = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    stopAnalyserRef.current();
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }
    connectingRef.current = false;
    amySpeakingRef.current = false;
    setAmySpeakingState(false);
    vadSpeechStartedAtRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    void flushTokenUsage();
    cleanupPeerConnection();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    onConnectionChangeRef.current?.(false);
  }, [cleanupPeerConnection, flushTokenUsage]);

  const handleRealtimeEvent = useCallback((payload: Record<string, unknown>) => {
    const type = String(payload.type ?? "");
    rtLog("event", { type });

    if (type === "input_audio_buffer.speech_started") {
      vadSpeechStartedAtRef.current = Date.now();
      vadAmySpeakingAtStartRef.current = amySpeakingRef.current;
      trackSpeechCoachV2VadTrigger({
        childId: childIdRef.current,
        sessionId: sessionIdRef.current,
        amySpeaking: amySpeakingRef.current,
        event: "speech_started",
      });
    }

    if (type === "input_audio_buffer.speech_stopped") {
      const startedAt = vadSpeechStartedAtRef.current;
      vadSpeechStartedAtRef.current = null;
      const speechDurationMs = startedAt != null ? Date.now() - startedAt : 0;
      trackSpeechCoachV2VadTrigger({
        childId: childIdRef.current,
        sessionId: sessionIdRef.current,
        amySpeaking: amySpeakingRef.current,
        event: "speech_stopped",
        speechDurationMs,
      });
      if (
        isLikelyFalseInterrupt({
          amySpeaking: vadAmySpeakingAtStartRef.current,
          speechDurationMs,
        })
      ) {
        trackSpeechCoachV2FalseInterrupt({
          childId: childIdRef.current,
          sessionId: sessionIdRef.current,
          speechDurationMs,
          amySpeaking: true,
        });
      } else if (
        vadAmySpeakingAtStartRef.current
        && speechDurationMs >= SPEECH_COACH_V2_MIN_SPEECH_MS
      ) {
        const dc = dcRef.current;
        if (dc?.readyState === "open") {
          dc.send(JSON.stringify({ type: "response.cancel" }));
        }
        setAmySpeaking(false);
      }
    }

    if (type === "conversation.item.input_audio_transcription.completed") {
      const transcript = String(
        (payload as { transcript?: string }).transcript ?? "",
      ).trim();
      if (transcript) {
        trackSpeechCoachV2ChildSpeechDetected({
          childId: childIdRef.current,
          sessionId: sessionIdRef.current,
          transcriptLength: transcript.length,
        });
        onUserTranscriptRef.current?.(transcript, transcript);
      }
    }
    if (
      type === "response.output_audio_transcript.done"
      || type === "response.audio_transcript.done"
      || type === "response.output_audio_transcript.done"
    ) {
      const transcript = String(
        (payload as { transcript?: string }).transcript ?? "",
      ).trim();
      if (transcript) onAssistantTranscriptRef.current?.(transcript);
    }
    if (type === "response.created") {
      verificationTrace("RESPONSE_CREATED");
      setAmySpeaking(true);
    }
    if (type === "response.output_audio.started" || type === "response.audio.started") {
      verificationTrace("AUDIO_STARTED");
      setAmySpeaking(true);
    }
    if (type === "response.done") {
      verificationTrace("AUDIO_COMPLETED");
      setAmySpeaking(false);
      const usageDelta = parseRealtimeResponseUsage(payload);
      if (usageDelta) {
        pendingUsageRef.current = {
          delta: mergeRealtimeUsageDelta(pendingUsageRef.current.delta, usageDelta),
          responseCount: pendingUsageRef.current.responseCount + 1,
        };
        sessionUsageTotalsRef.current = mergeRealtimeUsageDelta(
          sessionUsageTotalsRef.current,
          usageDelta,
        );
        queueTokenUsageFlush();
      }
    } else if (type === "response.output_audio.done" || type === "response.audio.done") {
      verificationTrace("AUDIO_COMPLETED");
      setAmySpeaking(false);
    }
    if (type === "response.cancelled") {
      setAmySpeaking(false);
    }
    if (type === "error") {
      const message = String(
        (payload as { error?: { message?: string } }).error?.message ?? "Realtime error",
      );
      onErrorRef.current?.(message);
    }
  }, [setAmySpeaking, queueTokenUsageFlush]);

  const waitForMediaReady = useCallback(
    (pc: RTCPeerConnection, audioEl: HTMLAudioElement) =>
      new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error("Timed out waiting for audio track"));
        }, 15_000);

        const done = () => {
          window.clearTimeout(timeout);
          resolve();
        };

        pc.ontrack = (event) => {
          rtLog("ontrack", {
            kind: event.track.kind,
            streams: event.streams.length,
          });
          verificationTrace("ONTRACK_FIRED", {
            kind: event.track.kind,
            streamCount: event.streams.length,
          });
          audioEl.srcObject = event.streams[0] ?? null;
          if (event.streams[0]) startAnalyserRef.current(event.streams[0]);
          void audioEl.play().then(() => {
            verificationTrace("AUDIO_PLAY_STARTED", {
              readyState: audioEl.readyState,
              paused: audioEl.paused,
              muted: audioEl.muted,
            });
          }).catch((playErr) => {
            rtLog("audio.play blocked", {
              error: playErr instanceof Error ? playErr.message : String(playErr),
            });
          });
          if (connectStartedAtRef.current > 0) {
            const ttfaMs = Date.now() - connectStartedAtRef.current;
            trackSpeechCoachV2Ttfa({
              childId: childIdRef.current,
              sessionId: sessionIdRef.current,
              ttfaMs,
            });
            connectStartedAtRef.current = 0;
          }
          done();
        };

        pc.oniceconnectionstatechange = () => {
          rtLog("iceState", { state: pc.iceConnectionState });
          if (pc.iceConnectionState === "failed") {
            window.clearTimeout(timeout);
            reject(new Error("ICE connection failed"));
          }
        };
      }),
    [],
  );

  const connectRef = useRef<(fromUserGesture: boolean) => Promise<void>>(async () => {});

  connectRef.current = async (fromUserGesture: boolean) => {
    const sid = sessionIdRef.current;
    const token = tabLockTokenRef.current;
    if (!sid || !token || connectingRef.current) return;

    connectingRef.current = true;
    const isRetry = reconnectAttemptRef.current > 0;
    setConnected(false, isRetry ? "reconnecting" : "connecting");
    setDiagnostics(INITIAL_DIAGNOSTICS);
    connectStartedAtRef.current = Date.now();
    rtLog("connect.start", { fromUserGesture, isRetry, sessionId: sid });

    try {
      // Mic MUST open before any network await when started from a user gesture.
      if (fromUserGesture || !localStreamRef.current) {
        verificationTrace("MIC_REQUEST_START", {
          platform: detectVerificationPlatform(),
        });
        try {
          await prepareCoachMicCapture();
          const micSupport = probeSpeechCoachV2MicConstraintSupport();
          rtLog("mic.constraints", micSupport);
          const mic = await openMicrophoneStream(
            buildSpeechCoachV2MicConstraints(),
            { forFeature: true },
          );
          if (!mic.ok) {
            throw new Error(`Microphone unavailable: ${mic.reason}`);
          }
          verificationTrace("MIC_REQUEST_SUCCESS", {
            tracks: mic.stream.getAudioTracks().length,
            platform: detectVerificationPlatform(),
          });
          verificationTrace("MIC_OPENED", {
            tracks: mic.stream.getAudioTracks().length,
          });
          setDiagnostics((d) => ({ ...d, mic: "ok" }));
          rtLog("mic.opened", { tracks: mic.stream.getAudioTracks().length });
          localStreamRef.current?.getTracks().forEach((t) => t.stop());
          localStreamRef.current = mic.stream;
        } catch (err) {
          setDiagnostics((d) => ({
            ...d,
            mic: "fail",
            lastError: err instanceof Error ? err.message : String(err),
          }));
          micFailure(err);
        }
      }

      const minted = await mintSpeechCoachV2RealtimeToken(authFetchRef.current, {
        childId: childIdRef.current,
        sessionId: sid,
        tabLockToken: token,
        instructions: instructionsRef.current,
      });
      rtLog("token.minted", {
        model: minted.model,
        voice: minted.voice,
        callsUrl: minted.callsUrl,
        expiresAt: minted.expiresAt,
      });
      verificationTrace("TOKEN_MINTED", {
        model: minted.model,
        voice: minted.voice,
        callsUrl: minted.callsUrl,
        secretPrefix: minted.clientSecret?.slice(0, 8),
      });
      setDiagnostics((d) => ({
        ...d,
        token: "ok",
        model: minted.model,
      }));
      modelRef.current = minted.model;

      cleanupPeerConnection();
      connectingRef.current = true;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      verificationTrace("PC_CREATED");

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.setAttribute("playsinline", "true");
      (audioEl as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      audioEl.style.position = "fixed";
      audioEl.style.width = "0";
      audioEl.style.height = "0";
      audioEl.style.opacity = "0";
      document.body.appendChild(audioEl);
      audioElRef.current = audioEl;

      const stream = localStreamRef.current;
      if (!stream) throw new Error("Microphone stream missing");
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      const mediaReady = waitForMediaReady(pc, audioEl);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => {
        rtLog("datachannel.open");
        verificationTrace("DATA_CHANNEL_OPEN");
        sendTurnDetectionUpdate("listening");
        sendSessionUpdate(instructionsRef.current);
        sendInitialGreeting();
        verificationTrace("RESPONSE_CREATE_SENT");
      };
      dc.onerror = (event) => {
        rtLog("datachannel.error", { event: String(event) });
      };
      dc.onclose = () => {
        rtLog("datachannel.close");
      };
      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as Record<string, unknown>;
          handleRealtimeEvent(data);
        } catch {
          // ignore malformed events
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      rtLog("sdp.offer", { length: offer.sdp?.length ?? 0 });
      verificationTrace("SDP_SENT", { offerLength: offer.sdp?.length ?? 0 });

      let answerSdp: string;
      try {
        const exchanged = await exchangeRealtimeSdpOffer({
          clientSecret: minted.clientSecret,
          offerSdp: offer.sdp ?? "",
          callsUrl: minted.callsUrl,
        });
        answerSdp = exchanged.answerSdp;
        setDiagnostics((d) => ({ ...d, sdp: "ok", sdpDetail: exchanged.diagnostics }));
        verificationTrace("SDP_ACCEPTED", {
          status: exchanged.diagnostics.status,
          responseBody: exchanged.diagnostics.responseBody.slice(0, 500),
        });
      } catch (sdpErr) {
        const diag =
          sdpErr instanceof Error && "diagnostics" in sdpErr
            ? (sdpErr as Error & { diagnostics?: RealtimeSdpExchangeDiagnostics }).diagnostics
            : null;
        if (diag?.status === 429) {
          onLimitReachedRef.current?.();
        }
        const body = diag?.responseBody ?? (sdpErr instanceof Error ? sdpErr.message : String(sdpErr));
        setDiagnostics((d) => ({
          ...d,
          sdp: "fail",
          lastError: body,
          sdpDetail: diag ?? d.sdpDetail,
        }));
        verificationTrace("SDP_REJECTED", { body: body.slice(0, 500) });
        throw sdpErr;
      }

      rtLog("sdp.answer", { length: answerSdp.length });

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      verificationTrace("REMOTE_DESCRIPTION_SET");
      await mediaReady;
      setDiagnostics((d) => ({ ...d, audio: "ok" }));

      if (!mountedRef.current) return;

      if (isRetry) {
        trackSpeechCoachV2Reconnect({
          childId: childIdRef.current,
          sessionId: sid,
        });
      }
      reconnectAttemptRef.current = 0;
      connectingRef.current = false;
      setConnected(true, "connected");
      rtLog("connect.success");
    } catch (err) {
      cleanup();
      if (!mountedRef.current) return;

      if (err instanceof SpeechCoachV2ApiError) {
        if (err.code === "daily_limit_reached" || err.code === "session_limit_reached") {
          onLimitReachedRef.current?.();
          setConnected(false, "disconnected");
          return;
        }
      }

      const message = err instanceof Error ? err.message : "Connection failed";
      const diagBody =
        err instanceof Error && "diagnostics" in err
          ? (err as Error & { diagnostics?: RealtimeSdpExchangeDiagnostics }).diagnostics?.responseBody
          : null;
      rtLog("connect.fail", { message });
      setDiagnostics((d) => ({
        ...d,
        lastError: diagBody ?? message,
        audio: d.audio === "ok" ? "ok" : d.audio,
      }));
      setConnected(false, "error");
      onErrorRef.current?.(message);

      if (reconnectAttemptRef.current < 3) {
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          void connectRef.current(false);
        }, 1500 * reconnectAttemptRef.current);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      cleanup();
      setConnectionState("idle");
      return () => {
        mountedRef.current = false;
        cleanup();
      };
    }

    sessionStartedAtRef.current = Date.now();
    reconnectAttemptRef.current = 0;

    return () => {
      mountedRef.current = false;
      cleanup();
      setConnectionState("disconnected");
    };
  }, [enabled, sessionId, tabLockToken, cleanup]);

  useEffect(() => {
    if (connectionState !== "connected") return;
    sendSessionUpdate(instructions);
  }, [instructions, connectionState, sendSessionUpdate]);

  const connectFromUserGesture = useCallback(async () => {
    reconnectAttemptRef.current = 0;
    await connectRef.current(true);
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState("disconnected");
  }, [cleanup]);

  const sessionElapsedSeconds = useCallback(
    () => Math.floor((Date.now() - sessionStartedAtRef.current) / 1000),
    [],
  );

  return {
    connectionState,
    diagnostics,
    disconnect,
    flushTokenUsage,
    sessionElapsedSeconds,
    connectFromUserGesture,
    reconnect: () => connectRef.current(false),
    isMediaConnected: connectionState === "connected",
    isAmySpeaking: amySpeaking,
    /** Live 0..1 amplitude of Amy's output audio for reactive avatar cues. */
    amyAudioLevelRef,
  };
}
