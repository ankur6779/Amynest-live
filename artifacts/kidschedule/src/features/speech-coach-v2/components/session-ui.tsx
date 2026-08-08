import type { RefObject } from "react";
import { Loader2, Mic, PhoneOff } from "lucide-react";
import { AmyTalkingHead } from "@/components/amy-3d/amy-talking-head";
import type { RealtimeConnectionState, RealtimeDiagnostics } from "../hooks/use-speech-coach-v2-realtime";
import { RealtimeDiagnosticsPanel } from "./realtime-diagnostics-panel";
import { showRealtimeDiagnostics } from "../lib/show-realtime-diagnostics";
import { formatSpeechCoachRemainingLabel } from "../lib/usage-display";
import {
  speechCoachConnectionLabel,
  useSpeechCoachHeroSize,
} from "../lib/session-presentation";
import {
  isSpeechCoachLivingV1Enabled,
  livingSpeechV2PresenceLabel,
} from "@/lib/speech-coach/living-room";
import "@/components/speech-coach/speech-coach-living-deep.css";

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
  amySpeaking?: boolean;
  amyAudioLevel?: RefObject<number>;
  amyAudioMeterActive?: RefObject<boolean>;
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
    amySpeaking = false,
    amyAudioLevel,
    amyAudioMeterActive,
  } = props;

  const living = isSpeechCoachLivingV1Enabled();
  const heroSize = useSpeechCoachHeroSize();
  const realtimeReady = live && connectionState === "connected";

  return (
    <div
      className={
        living
          ? "sc-living-deep flex min-h-[100dvh] flex-col"
          : "relative flex min-h-[100dvh] flex-col bg-gradient-to-b from-sky-950 via-indigo-950 to-slate-950 text-white"
      }
      data-sc-living-deep={living ? "1" : undefined}
      data-testid="speech-coach-v2-session-ui"
    >
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
        <div>
          <p className={living ? "sc-living-deep-eyebrow" : "text-xs uppercase tracking-wider text-white/60"}>
            {living ? "Voice together" : "Speech Coach"}
          </p>
          <h1 className={living ? "sc-living-deep-title text-lg" : "text-lg font-bold"}>
            {living ? `${childName} · with Amy` : `Hi ${childName}!`}
          </h1>
        </div>
        {!living ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
              {starsEarned} stars
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">{pointsEarned} pts</span>
          </div>
        ) : (
          <span className="sc-living-deep-chip">{livingSpeechV2PresenceLabel()}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <AmyTalkingHead
          size={heroSize}
          presentation="stage"
          speaking={amySpeaking}
          listening={realtimeReady && !amySpeaking}
          listenForAudio={live}
          // Keep the warmup loop running through connect so there is no idle
          // freeze between tapping Start and Amy's first talk crossfade.
          waitingForSession={!realtimeReady}
          audioLevelRef={amyAudioLevel}
          audioMeterActiveRef={amyAudioMeterActive}
          debugMouth={showRealtimeDiagnostics()}
        />
        <p className={living ? "mt-4 text-sm font-medium text-white/80" : "mt-4 text-sm font-medium text-sky-200"}>
          {phaseLabel}
        </p>
        <p className="mt-1 text-xs text-white/60">
          {speechCoachConnectionLabel(connectionState, live, {
            amySpeaking,
            loading,
            micFailed: diagnostics?.mic === "fail",
          })}
        </p>
        {live && diagnostics && showRealtimeDiagnostics() && (
          <RealtimeDiagnosticsPanel diagnostics={diagnostics} />
        )}
        {lastTranscript && (
          <p
            className={
              living
                ? "sc-living-deep-panel mt-4 max-w-sm px-4 py-2 text-center text-sm text-white/90"
                : "mt-4 max-w-sm rounded-2xl bg-white/10 px-4 py-2 text-center text-sm text-white/90"
            }
          >
            You said: {lastTranscript}
          </p>
        )}
      </div>

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom,0px)+2.5rem)]">
        <p className="mb-4 text-center text-xs text-white/50">
          {formatSpeechCoachRemainingLabel(remainingSeconds)}
        </p>

        {!live ? (
          <button
            type="button"
            onClick={onStart}
            disabled={loading}
            className={
              living
                ? "sc-living-deep-primary-btn flex w-full min-h-12 items-center justify-center gap-2 py-4 text-base disabled:opacity-60"
                : "flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 py-4 text-base font-semibold disabled:opacity-60"
            }
            data-testid="speech-coach-v2-start"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            {living ? "Begin gently" : "Start speaking with Amy"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnd}
            className={
              living
                ? "sc-living-deep-ghost-btn flex w-full min-h-12 items-center justify-center gap-2 py-4 text-base font-semibold"
                : "flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-4 text-base font-semibold"
            }
            data-testid="speech-coach-v2-end"
          >
            <PhoneOff className="h-5 w-5" />
            {living ? "Finish gently" : "Finish session"}
          </button>
        )}
      </div>
    </div>
  );
}
