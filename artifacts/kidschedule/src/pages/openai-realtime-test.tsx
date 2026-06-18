/**
 * Minimal OpenAI Realtime infrastructure test — no Speech Coach, DB, quota, or analytics.
 * Route: /openai-realtime-test (dev or OPENAI_REALTIME_DEBUG on API)
 */
import { useCallback, useRef, useState } from "react";
import { getApiUrl } from "@/lib/api";
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
  const entry: TraceEntry = {
    ts: Date.now(),
    iso: new Date().toISOString(),
    tag,
    detail,
    payload,
  };
  window.__OPENAI_REALTIME_TRACE__ = window.__OPENAI_REALTIME_TRACE__ ?? [];
  window.__OPENAI_REALTIME_TRACE__.push(entry);
  console.info("[OPENAI_REALTIME]", tag, detail ?? "", payload ?? "");
  return entry;
}

type StepStatus = "pending" | "ok" | "fail";

const STEPS = [
  "MIC_OPENED",
  "TOKEN_MINTED",
  "SDP_SENT",
  "SDP_ACCEPTED",
  "DATA_CHANNEL_OPEN",
  "ONTRACK_FIRED",
  "AUDIO_STARTED",
  "RESPONSE_CREATED",
] as const;

type StepKey = (typeof STEPS)[number];

export default function OpenAiRealtimeTestPage() {
  const [status, setStatus] = useState("idle");
  const [steps, setSteps] = useState<Record<StepKey, StepStatus>>(
    () => Object.fromEntries(STEPS.map((s) => [s, "pending"])) as Record<StepKey, StepStatus>,
  );
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [audioState, setAudioState] = useState<Record<string, unknown> | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/debug/openai-realtime-health"));
      const body = await res.json().catch(() => ({}));
      setHealth(body as Record<string, unknown>);
      pushTrace("HEALTH_CHECK", { status: res.status }, body);
      refreshTrace();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setHealth({ error: message });
      pushTrace("HEALTH_CHECK_FAILURE", { message });
      refreshTrace();
    }
  }, [refreshTrace]);

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
    setError(null);
    setAudioState(null);
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
      pushTrace("MIC_OPENED", { tracks: mic.stream.getAudioTracks().length });
      markStep("MIC_OPENED", "ok");
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
        markStep("TOKEN_MINTED", "fail");
        throw new Error(
          (tokenBody as { message?: string; error?: string }).message
          ?? (tokenBody as { error?: string }).error
          ?? `Token mint failed: ${tokenRes.status}`,
        );
      }
      const token = tokenBody as {
        clientSecret: string;
        callsUrl: string;
        model: string;
        voice: string;
      };
      pushTrace("TOKEN_MINTED", { model: token.model, voice: token.voice });
      markStep("TOKEN_MINTED", "ok");

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
        markStep("RESPONSE_CREATED", "ok");
        refreshTrace();
      };

      dc.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as Record<string, unknown>;
          const type = String(payload.type ?? "unknown");
          pushTrace("OPENAI_EVENT", { type }, payload);
          refreshTrace();
        } catch (err) {
          pushTrace("OPENAI_EVENT_PARSE_ERROR", {
            message: err instanceof Error ? err.message : String(err),
          });
          refreshTrace();
        }
      };

      pc.ontrack = (event) => {
        pushTrace("ONTRACK_FIRED", {
          kind: event.track.kind,
          streamCount: event.streams.length,
        });
        markStep("ONTRACK_FIRED", "ok");
        audioEl.srcObject = event.streams[0] ?? null;
        void audioEl.play().then(() => {
          const state = {
            readyState: audioEl.readyState,
            paused: audioEl.paused,
            muted: audioEl.muted,
            srcObject: Boolean(audioEl.srcObject),
            trackCount: event.streams[0]?.getAudioTracks().length ?? 0,
          };
          pushTrace("AUDIO_STARTED", state);
          markStep("AUDIO_STARTED", "ok");
          setAudioState(state);
          refreshTrace();
        }).catch((playErr) => {
          const state = {
            readyState: audioEl.readyState,
            paused: audioEl.paused,
            muted: audioEl.muted,
            srcObject: Boolean(audioEl.srcObject),
            trackCount: event.streams[0]?.getAudioTracks().length ?? 0,
            playError: playErr instanceof Error ? playErr.message : String(playErr),
          };
          pushTrace("AUDIO_PLAY_BLOCKED", state);
          markStep("AUDIO_STARTED", "fail");
          setAudioState(state);
          refreshTrace();
        });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      pushTrace("SDP_SENT", { length: offer.sdp?.length ?? 0 });
      markStep("SDP_SENT", "ok");

      const sdpRes = await fetch(token.callsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp ?? "",
      });
      const answerSdp = await sdpRes.text();
      if (!sdpRes.ok) {
        pushTrace("SDP_REJECTED", { status: sdpRes.status }, answerSdp.slice(0, 500));
        markStep("SDP_ACCEPTED", "fail");
        throw new Error(`SDP failed: ${sdpRes.status} — ${answerSdp.slice(0, 200)}`);
      }
      pushTrace("SDP_ACCEPTED", { status: sdpRes.status, length: answerSdp.length });
      markStep("SDP_ACCEPTED", "ok");

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      pushTrace("REMOTE_DESCRIPTION_SET");
      setStatus("connected");
      setConnecting(false);
      pushTrace("CONNECT_SUCCESS");
      refreshTrace();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      pushTrace("CONNECT_FAILURE", { message });
      setError(message);
      setStatus("error");
      setConnecting(false);
      refreshTrace();
    }
  }, [markStep, refreshTrace]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 font-mono text-sm">
      <h1 className="text-xl font-bold font-sans">OpenAI Realtime — Infrastructure Test</h1>
      <p className="text-muted-foreground font-sans">
        Mic → token → SDP → Amy audio. No Speech Coach, curriculum, DB, quota, or analytics.
      </p>
      <p className="text-muted-foreground font-sans text-xs">
        API: {getApiUrl("/api/debug/openai-realtime-health")}
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void checkHealth()}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Check health
        </button>
        <button
          type="button"
          onClick={() => void connect()}
          disabled={connecting}
          className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Connect
        </button>
        <button
          type="button"
          onClick={disconnect}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Disconnect
        </button>
      </div>

      <div>
        <strong>Status:</strong> {status}
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>

      {health && (
        <div>
          <strong>Health</strong>
          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <strong>Steps</strong>
        <ul className="mt-2 space-y-1">
          {STEPS.map((step) => (
            <li key={step}>
              {step}:{" "}
              <span
                className={
                  steps[step] === "ok"
                    ? "text-green-600"
                    : steps[step] === "fail"
                      ? "text-red-600"
                      : "text-gray-500"
                }
              >
                {steps[step]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {audioState && (
        <div>
          <strong>Audio element state</strong>
          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">
            {JSON.stringify(audioState, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <strong>Trace ({trace.length} entries)</strong>
        <p className="text-xs text-muted-foreground font-sans">
          Export: <code>JSON.stringify(window.__OPENAI_REALTIME_TRACE__, null, 2)</code>
        </p>
        <pre className="mt-2 max-h-96 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">
          {JSON.stringify(trace, null, 2)}
        </pre>
      </div>
    </div>
  );
}
