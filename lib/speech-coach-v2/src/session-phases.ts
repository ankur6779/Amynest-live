import type { SpeechCoachV2Phase, SpeechCoachV2SessionState } from "./types";
import {
  SPEECH_COACH_V2_PHASES,
  SPEECH_COACH_V2_PHASE_DURATIONS,
  SPEECH_COACH_V2_SESSION_SECONDS,
} from "./types";

export function phaseDurationSeconds(phase: SpeechCoachV2Phase): number {
  return SPEECH_COACH_V2_PHASE_DURATIONS[phase];
}

export function phaseIndex(phase: SpeechCoachV2Phase): number {
  return SPEECH_COACH_V2_PHASES.indexOf(phase);
}

export function nextPhase(phase: SpeechCoachV2Phase): SpeechCoachV2Phase | null {
  const idx = phaseIndex(phase);
  if (idx < 0 || idx >= SPEECH_COACH_V2_PHASES.length - 1) return null;
  return SPEECH_COACH_V2_PHASES[idx + 1]!;
}

export function sessionElapsedSeconds(state: SpeechCoachV2SessionState, now = Date.now()): number {
  return Math.floor((now - state.sessionStartedAt) / 1000);
}

export function phaseElapsedSeconds(state: SpeechCoachV2SessionState, now = Date.now()): number {
  return Math.floor((now - state.phaseStartedAt) / 1000);
}

export function isSessionComplete(state: SpeechCoachV2SessionState, now = Date.now()): boolean {
  if (state.phase === "celebration") return true;
  return sessionElapsedSeconds(state, now) >= SPEECH_COACH_V2_SESSION_SECONDS;
}

export function currentExercise(state: SpeechCoachV2SessionState) {
  return state.exercises[state.exerciseIndex] ?? null;
}

export function phaseLabel(phase: SpeechCoachV2Phase): string {
  switch (phase) {
    case "warm_up":
      return "Warm Up";
    case "repeat_after_amy":
      return "Repeat After Amy";
    case "guided_practice":
      return "Guided Practice";
    case "interactive_conversation":
      return "Conversation";
    case "confidence_challenge":
      return "Confidence Challenge";
    case "celebration":
      return "Celebration";
  }
}
