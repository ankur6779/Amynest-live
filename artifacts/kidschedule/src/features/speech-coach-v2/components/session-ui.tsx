import { Loader2, Mic, PhoneOff, Sparkles } from "lucide-react";
import { AmyAvatar } from "@/components/amy-3d/amy-avatar";
import type { RealtimeConnectionState, RealtimeDiagnostics } from "../hooks/use-speech-coach-v2-realtime";

function stepLabel(value: RealtimeDiagnostics[keyof Pick<RealtimeDiagnostics, "mic" | "token" | "sdp" | "audio">]): string {
  if (value === "ok") return "PASS";
  if (value === "fail") return "FAIL";
  return "…";
}

function connectionLabel(state: RealtimeConnectionState): string {
  switch (state) {
    case "connecting":
      return "Amy is getting ready…";
    case "connected":
      return "Amy is listening";
    case "reconnecting":
      return "Reconnecting…";
    case "error":
      return "Connection issue";
    default:
      return "Tap to start speaking with Amy";
  }
}

export function SpeechCoachV2SessionUi(props: {
  childName: string;
  phaseLabel: string;
  connectionState: RealtimeConnectionState;
  diagnostics?: RealtimeDiagnostics;
  starsEarned: number;
  pointsEarned: number;
  remainingSeconds: number;
  lastTranscript: string;
  onStart: () => void;
  onEnd: () => void;
  live: boolean;
  loading?: boolean;
}) {
  const {
    childName,
    phaseLabel,
    connectionState,
    diagnostics,
    starsEarned,
    pointsEarned,
    remainingSeconds,
    lastTranscript,
    onStart,
    onEnd,
    live,
    loading,
  } = props;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-gradient-to-b from-sky-950 via-indigo-950 to-slate-950 text-white">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/60">Speech Coach V2</p>
          <h1 className="text-lg font-bold">Hi {childName}!</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            {starsEarned} stars
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">{pointsEarned} pts</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <AmyAvatar state={live && connectionState === "connected" ? "listening" : "idle"} size={280} />
        <p className="mt-4 text-sm font-medium text-sky-200">{phaseLabel}</p>
        <p className="mt-1 text-xs text-white/60">{connectionLabel(connectionState)}</p>
        {live && diagnostics && (
          <div className="mt-3 w-full max-w-sm rounded-xl bg-black/40 p-3 text-left text-[11px] text-white/80">
            <p className="font-semibold text-white/90">Realtime Diagnostics</p>
            <p>Mic: {stepLabel(diagnostics.mic)} · Token: {stepLabel(diagnostics.token)} · SDP: {stepLabel(diagnostics.sdp)} · Audio: {stepLabel(diagnostics.audio)}</p>
            {diagnostics.lastError && (
              <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-red-300">
                Last Error: {diagnostics.lastError.slice(0, 400)}
              </pre>
            )}
          </div>
        )}
        {lastTranscript && (
          <p className="mt-4 max-w-sm rounded-2xl bg-white/10 px-4 py-2 text-center text-sm text-white/90">
            You said: {lastTranscript}
          </p>
        )}
      </div>

      <div className="px-6 pb-10">
        <p className="mb-4 text-center text-xs text-white/50">
          {Math.floor(remainingSeconds / 60)} min left today
        </p>

        {!live ? (
          <button
            type="button"
            onClick={onStart}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 py-4 text-base font-semibold disabled:opacity-60"
            data-testid="speech-coach-v2-start"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            Start speaking with Amy
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnd}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-4 text-base font-semibold"
            data-testid="speech-coach-v2-end"
          >
            <PhoneOff className="h-5 w-5" />
            Finish session
          </button>
        )}
      </div>
    </div>
  );
}
