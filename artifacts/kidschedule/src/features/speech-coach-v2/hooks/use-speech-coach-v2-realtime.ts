import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthFetchFn } from "@/lib/poll-result";
import { mintSpeechCoachV2RealtimeToken } from "../lib/api";
import {
  trackSpeechCoachV2Reconnect,
  trackSpeechCoachV2Ttfa,
} from "../lib/analytics";

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
  } = options;

  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptRef = useRef(0);
  const sessionStartedAtRef = useRef<number>(Date.now());
  const connectStartedAtRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const instructionsRef = useRef(instructions);
  instructionsRef.current = instructions;

  const sendSessionUpdate = useCallback((nextInstructions: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(
      JSON.stringify({
        type: "session.update",
        session: { instructions: nextInstructions },
      }),
    );
  }, []);

  const cleanup = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
  }, []);

  const handleRealtimeEvent = useCallback(
    (payload: Record<string, unknown>) => {
      const type = String(payload.type ?? "");
      if (type === "conversation.item.input_audio_transcription.completed") {
        const transcript = String(
          (payload as { transcript?: string }).transcript ?? "",
        ).trim();
        if (transcript) onUserTranscript?.(transcript, transcript);
      }
      if (
        type === "response.output_audio_transcript.done"
        || type === "response.audio_transcript.done"
      ) {
        const transcript = String(
          (payload as { transcript?: string }).transcript ?? "",
        ).trim();
        if (transcript) onAssistantTranscript?.(transcript);
      }
      if (type === "error") {
        const message = String(
          (payload as { error?: { message?: string } }).error?.message ?? "Realtime error",
        );
        onError?.(message);
      }
    },
    [onAssistantTranscript, onError, onUserTranscript],
  );

  const connect = useCallback(async () => {
    if (!enabled || !sessionId || !tabLockToken) return;
    setConnectionState(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");
    connectStartedAtRef.current = Date.now();

    try {
      const token = await mintSpeechCoachV2RealtimeToken(authFetch, {
        childId,
        sessionId,
        tabLockToken,
        instructions: instructionsRef.current,
      });

      cleanup();

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0] ?? null;
        if (connectStartedAtRef.current > 0) {
          const ttfaMs = Date.now() - connectStartedAtRef.current;
          trackSpeechCoachV2Ttfa({ childId, sessionId, ttfaMs });
          connectStartedAtRef.current = 0;
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
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

      const sdpResponse = await fetch(token.callsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp ?? "",
      });

      if (!sdpResponse.ok) {
        if (sdpResponse.status === 429) {
          onLimitReached?.();
          throw new Error("Daily limit reached");
        }
        throw new Error(`Realtime SDP exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      if (!mountedRef.current) return;

      if (reconnectAttemptRef.current > 0) {
        trackSpeechCoachV2Reconnect({ childId, sessionId });
      }
      reconnectAttemptRef.current = 0;
      setConnectionState("connected");
    } catch (err) {
      cleanup();
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : "Connection failed";
      setConnectionState("error");
      onError?.(message);

      if (reconnectAttemptRef.current < 3) {
        reconnectAttemptRef.current += 1;
        setTimeout(() => {
          void connect();
        }, 1500 * reconnectAttemptRef.current);
      }
    }
  }, [
    authFetch,
    childId,
    cleanup,
    enabled,
    handleRealtimeEvent,
    onError,
    onLimitReached,
    sessionId,
    tabLockToken,
  ]);

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
    void connect();

    return () => {
      mountedRef.current = false;
      cleanup();
      setConnectionState("disconnected");
    };
  }, [enabled, sessionId, tabLockToken, connect, cleanup]);

  useEffect(() => {
    if (connectionState !== "connected") return;
    sendSessionUpdate(instructions);
  }, [instructions, connectionState, sendSessionUpdate]);

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
    disconnect,
    sessionElapsedSeconds,
    reconnect: connect,
  };
}
