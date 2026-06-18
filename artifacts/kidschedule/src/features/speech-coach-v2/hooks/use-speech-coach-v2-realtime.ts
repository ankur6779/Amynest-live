import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthFetchFn } from "@/lib/poll-result";
import { openMicrophoneStream } from "@/lib/microphone-permission";
import { prepareCoachMicCapture } from "@/lib/speech-coach-mic-capture";
import { mintSpeechCoachV2RealtimeToken, SpeechCoachV2ApiError } from "../lib/api";
import {
  exchangeRealtimeSdpOffer,
  type RealtimeSdpExchangeDiagnostics,
} from "@/lib/openai-realtime-webrtc";
import {
  trackSpeechCoachV2Reconnect,
  trackSpeechCoachV2Ttfa,
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
  lastError: string | null;
  sdpDetail: RealtimeSdpExchangeDiagnostics | null;
};

const INITIAL_DIAGNOSTICS: RealtimeDiagnostics = {
  mic: "pending",
  token: "pending",
  sdp: "pending",
  audio: "pending",
  lastError: null,
  sdpDetail: null,
};

const REALTIME_DEBUG = import.meta.env.DEV;

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

  const sendInitialGreeting = useCallback(() => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(JSON.stringify({ type: "response.create" }));
  }, []);

  const cleanupPeerConnection = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
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
  }, []);

  const cleanup = useCallback(() => {
    cleanupPeerConnection();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    onConnectionChangeRef.current?.(false);
  }, [cleanupPeerConnection]);

  const handleRealtimeEvent = useCallback((payload: Record<string, unknown>) => {
    const type = String(payload.type ?? "");
    rtLog("event", { type });

    if (type === "conversation.item.input_audio_transcription.completed") {
      const transcript = String(
        (payload as { transcript?: string }).transcript ?? "",
      ).trim();
      if (transcript) onUserTranscriptRef.current?.(transcript, transcript);
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
    }
    if (type === "response.output_audio.started" || type === "response.audio.started") {
      verificationTrace("AUDIO_STARTED");
    }
    if (type === "response.done" || type === "response.output_audio.done" || type === "response.audio.done") {
      verificationTrace("AUDIO_COMPLETED");
    }
    if (type === "error") {
      const message = String(
        (payload as { error?: { message?: string } }).error?.message ?? "Realtime error",
      );
      onErrorRef.current?.(message);
    }
  }, []);

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
          const mic = await openMicrophoneStream(
            { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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
      setDiagnostics((d) => ({ ...d, token: "ok" }));

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
    sessionElapsedSeconds,
    connectFromUserGesture,
    reconnect: () => connectRef.current(false),
    isMediaConnected: connectionState === "connected",
  };
}
