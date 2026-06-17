import { track } from "@/lib/analytics";
import type { SpeechCoachV2Phase } from "@workspace/speech-coach-v2";

export function trackSpeechCoachV2SessionStart(props: {
  childId: number;
  sessionId: string;
  ageBand: string;
}): void {
  track("speech_coach_v2_session_start", props);
}

export function trackSpeechCoachV2SessionComplete(props: {
  childId: number;
  sessionId: string;
  durationSeconds: number;
  starsEarned: number;
  phaseReached: SpeechCoachV2Phase | string;
}): void {
  track("speech_coach_v2_session_complete", props);
}

export function trackSpeechCoachV2LimitReached(props: { childId: number }): void {
  track("speech_coach_v2_daily_limit", props);
}

export function trackSpeechCoachV2Reconnect(props: { childId: number; sessionId: string }): void {
  track("speech_coach_v2_reconnect", props);
}

export function trackSpeechCoachV2Ttfa(props: {
  childId: number;
  sessionId: string;
  ttfaMs: number;
}): void {
  track("speech_coach_v2_ttfa", props);
}
