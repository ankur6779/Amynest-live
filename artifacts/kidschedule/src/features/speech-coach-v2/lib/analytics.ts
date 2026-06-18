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

export function trackSpeechCoachV2LimitReached(props: { childId: number; isTrial?: boolean }): void {
  track("speech_coach_v2_daily_limit", props);
  if (props.isTrial) {
    track("speech_coach_trial_limit_hit", { childId: props.childId });
  }
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

export function trackSpeechCoachTrialStarted(props: { childId: number }): void {
  track("speech_coach_trial_started", props);
}

export function trackSpeechCoachPaidUsage(props: { childId: number }): void {
  track("speech_coach_paid_usage", props);
}

export function trackSpeechCoachUpgradeShown(props: { childId: number; source: string }): void {
  track("speech_coach_upgrade_shown", props);
}

export function trackSpeechCoachUpgradeClicked(props: { childId: number; source: string }): void {
  track("speech_coach_upgrade_clicked", props);
}
