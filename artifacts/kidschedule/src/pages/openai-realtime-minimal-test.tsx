/**
 * Minimal OpenAI Realtime reproduction — no Speech Coach, DB, quota, or analytics.
 * Route: /openai-realtime-minimal-test
 */
import { useCallback, useRef, useState } from "react";
import { getApiUrl } from "@/lib/api";
import {
  exchangeRealtimeSdpOffer,
  OPENAI_REALTIME_CALLS_URL,
  type RealtimeSdpExchangeDiagnostics,
} from "@/lib/openai-realtime-webrtc";
import { openMicrophoneStream } from "@/lib/microphone-permission";
import { prepareCoachMicCapture } from "@/lib/speech-coach-mic-capture";

type TraceEntry = {
  ts: number;
  iso: string;
  tag: string;
  detail?: unknown;
  payload?: unknown;
};

declare global {
  interface Window {
    __OPENAI_REALTIME_TRACE__?: TraceEntry[];
  }
}

function pushTrace(tag: string, detail?: unknown, payload?: unknown) {
  const entry: TraceEntry = { ts: Date.now(), iso: new Date().toISOString(), tag, detail, payload };
  window.__OPENAI_REALTIME_TRACE__ = window.__OPENAI_REALTIME_TRACE__ ?? [];
  window.__OPENAI_REALTIME_TRACE__.push(entry);
  console.info("[OPENAI_REALTIME]", tag, detail ?? "", payload ?? "");
  return entry;
}

type StepStatus = "pending" | "ok" | "fail";

const STEPS = [
  "MIC_OPEN_SUCCESS",
  "TOKEN_MINT_SUCCESS",
  "SDP_POST_SUCCESS",
  "DATA_CHANNEL_OPEN",
  "ONTRACK_FIRED",
  "AUDIO_PLAY_STARTED",
  "AMY_GREETING_HEARD",
] as const;

type StepKey = (typeof STEPS)[number];

export default function OpenAiRealtimeMinimalTestPage() {
  const [status, setStatus] = useState("idle");
  const [steps, setSteps] = useState<Record<StepKey, StepStatus>>(
    () => Object.fromEntries(STEPS.map((s) => [s, "pending"])) as Record<StepKey, StepStatus>,
  );
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [sdpDiag, setSdpDiag] = useState<RealtimeSdpExchangeDiagnostics | null>(null);
  const [mintInfo, setMintInfo] = useState<Record<string, unknown> | null>(null);
  const [connecting, setConnecting] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const refreshTrace = useCallback(() => {
    setTrace([...(window.__OPENAI_REALTIME_TRACE__ ?? [])]);
  }, []);

  const markStep = useCallback((key: StepKey, value: StepStatus) => {
    setSteps((prev) => ({ ...prev, [key]: value }));
  }, []);

  const disconnect = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
    setStatus("disconnected");
    setConnecting(false);
    pushTrace("DISCONNECTED");
    refreshTrace();
  }, [refreshTrace]);

  const connect = useCallback(async () => {
    window.__OPENAI_REALTIME_TRACE__ = [];
    setTrace([]);
    setLastError(null);
    setSdpDiag(null);
    setMintInfo(null);
    setSteps(Object.fromEntries(STEPS.map((s) => [s, "pending"])) as Record<StepKey, StepStatus>);
    setConnecting(true);
    setStatus("connecting");
    pushTrace("CONNECT_START");
    refreshTrace();

    try {
      await prepareCoachMicCapture();
      const mic = await openMicrophoneStream(
        { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        { forFeature: true },
      );
      if (!mic.ok) {
        pushTrace("MIC_OPEN_FAILURE", { reason: mic.reason });
        throw new Error(`Microphone unavailable: ${mic.reason}`);
      }
      pushTrace("MIC_OPEN_SUCCESS", { tracks: mic.stream.getAudioTracks().length });
      markStep("MIC_OPEN_SUCCESS", "ok");
      streamRef.current = mic.stream;

      const tokenRes = await fetch(getApiUrl("/api/debug/openai-realtime-token"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: "You are Amy. When the session starts, say exactly: Hello from Amy.",
        }),
      });
      const tokenBody = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        pushTrace("TOKEN_MINT_FAILURE", { status: tokenRes.status }, tokenBody);
        markStep("TOKEN_MINT_SUCCESS", "fail");
        throw new Error(
          (tokenBody as { message?: string }).message
          ?? `Token mint failed: ${tokenRes.status}`,
        );
      }
      const token = tokenBody as {
        clientSecret: string;
        callsUrl: string;
        model: string;
        voice: string;
        mintResponse?: Record<string, unknown>;
      };
      setMintInfo({
        model: token.model,
        voice: token.voice,
        callsUrl: token.callsUrl,
        resolvedCallsUrl: OPENAI_REALTIME_CALLS_URL,
        secretPrefix: token.clientSecret?.slice(0, 8),
        mintResponse: token.mintResponse,
      });
      pushTrace("TOKEN_MINT_SUCCESS", {
        model: token.model,
        voice: token.voice,
        secretPrefix: token.clientSecret?.slice(0, 8),
      });
      markStep("TOKEN_MINT_SUCCESS", "ok");

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.setAttribute("playsinline", "true");
      (audioEl as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      document.body.appendChild(audioEl);
      audioRef.current = audioEl;

      for (const track of mic.stream.getTracks()) {
        pc.addTrack(track, mic.stream);
      }

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => {
        pushTrace("DATA_CHANNEL_OPEN");
        markStep("DATA_CHANNEL_OPEN", "ok");
        dc.send(JSON.stringify({ type: "response.create" }));
        pushTrace("RESPONSE_CREATED");
        refreshTrace();
      };
      dc.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as Record<string, unknown>;
          pushTrace("OPENAI_EVENT", { type: payload.type }, payload);
          if (payload.type === "response.output_audio.done" || payload.type === "response.done") {
            markStep("AMY_GREETING_HEARD", "ok");
          }
          refreshTrace();
        } catch (err) {
          pushTrace("OPENAI_EVENT_PARSE_ERROR", {
            message: err instanceof Error ? err.message : String(err),
          });
          refreshTrace();
        }
      };

      pc.ontrack = (event) => {
        pushTrace("ONTRACK_FIRED", { kind: event.track.kind, streamCount: event.streams.length });
        markStep("ONTRACK_FIRED", "ok");
        audioEl.srcObject = event.streams[0] ?? null;
        void audioEl.play().then(() => {
          pushTrace("AUDIO_PLAY_STARTED", {
            readyState: audioEl.readyState,
            paused: audioEl.paused,
            muted: audioEl.muted,
          });
          markStep("AUDIO_PLAY_STARTED", "ok");
          refreshTrace();
        }).catch((playErr) => {
          pushTrace("AUDIO_PLAY_BLOCKED", {
            message: playErr instanceof Error ? playErr.message : String(playErr),
          });
          markStep("AUDIO_PLAY_STARTED", "fail");
          refreshTrace();
        });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      pushTrace("SDP_SENT", {
        url: OPENAI_REALTIME_CALLS_URL,
        length: offer.sdp?.length ?? 0,
        preview: offer.sdp?.slice(0, 200),
      });

      const { answerSdp, diagnostics } = await exchangeRealtimeSdpOffer({
        clientSecret: token.clientSecret,
        offerSdp: offer.sdp ?? "",
        callsUrl: token.callsUrl,
      });
      setSdpDiag(diagnostics);
      pushTrace("SDP_POST_SUCCESS", diagnostics);
      markStep("SDP_POST_SUCCESS", "ok");

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      pushTrace("REMOTE_DESCRIPTION_SET");
      setStatus("connected");
      setConnecting(false);
      pushTrace("CONNECT_SUCCESS");
      refreshTrace();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const diag =
        err instanceof Error && "diagnostics" in err
          ? (err as Error & { diagnostics?: RealtimeSdpExchangeDiagnostics }).diagnostics
          : undefined;
      if (diag) setSdpDiag(diag);
      setLastError(diag?.responseBody ?? message);
      pushTrace("CONNECT_FAILURE", { message, diagnostics: diag });
      setStatus("error");
      setConnecting(false);
      refreshTrace();
    }
  }, [markStep, refreshTrace]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 font-mono text-sm">
      <h1 className="text-xl font-bold font-sans">OpenAI Realtime — Minimal Test</h1>
      <p className="text-muted-foreground font-sans">
        Reproduces mic → token → POST {OPENAI_REALTIME_CALLS_URL} → audio. No Speech Coach.
      </p>

      <div className="flex gap-3">
        <button type="button" onClick={() => void connect()} disabled={connecting} className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50">
          Connect
        </button>
        <button type="button" onClick={disconnect} className="rounded bg-red-600 px-4 py-2 text-white">
          Disconnect
        </button>
      </div>

      <div>
        <strong>Status:</strong> {status}
        {lastError && (
          <pre className="mt-2 overflow-auto rounded bg-red-950/40 p-3 text-xs text-red-300">
            Last Error: {lastError}
          </pre>
        )}
      </div>

      <div>
        <strong>Steps</strong>
        <ul className="mt-2 space-y-1">
          {STEPS.map((step) => (
            <li key={step}>
              {step}:{" "}
              <span className={steps[step] === "ok" ? "text-green-600" : steps[step] === "fail" ? "text-red-600" : "text-gray-500"}>
                {steps[step]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {mintInfo && (
        <div>
          <strong>Token mint</strong>
          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">{JSON.stringify(mintInfo, null, 2)}</pre>
        </div>
      )}

      {sdpDiag && (
        <div>
          <strong>SDP exchange diagnostics</strong>
          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">{JSON.stringify(sdpDiag, null, 2)}</pre>
        </div>
      )}

      <div>
        <strong>Trace ({trace.length})</strong>
        <pre className="mt-2 max-h-96 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">{JSON.stringify(trace, null, 2)}</pre>
      </div>
    </div>
  );
}
