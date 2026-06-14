import {
  mergeCoachJourneySnapshot,
  type CoachLocalSnapshot,
  type PromptScoreHistory,
  type SessionAttemptInput,
  type SessionJourneyInput,
} from "@workspace/speech-coach";
import type { MicrophoneSessionState } from "@/lib/microphone-session-manager";

export type SpeechViewMode = "parent" | "child";
export type SpeechCoachPageTab = "practice" | "hub";

const VIEW_KEY = "speech_coach_view_mode";
const PAGE_TAB_KEY = "speech_coach_page_tab";

export function getSpeechViewMode(): SpeechViewMode {
  if (typeof window === "undefined") return "parent";
  try {
    return localStorage.getItem(VIEW_KEY) === "child" ? "child" : "parent";
  } catch {
    return "parent";
  }
}

export function setSpeechViewMode(mode: SpeechViewMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIEW_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getSpeechCoachPageTab(): SpeechCoachPageTab {
  if (typeof window === "undefined") return "practice";
  try {
    return localStorage.getItem(PAGE_TAB_KEY) === "hub" ? "hub" : "practice";
  } catch {
    return "practice";
  }
}

export function setSpeechCoachPageTab(tab: SpeechCoachPageTab): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PAGE_TAB_KEY, tab);
  } catch {
    /* ignore quota / private mode */
  }
}

export function parseSpeechCoachPageTab(
  value: string | null | undefined,
): SpeechCoachPageTab {
  return value === "hub" ? "hub" : "practice";
}

export type SpeechSessionPreset =
  | "quick"
  | "bedtime"
  | "school"
  | "warmup"
  | "emotion";

const SESSION_PRESETS = new Set<SpeechSessionPreset>([
  "quick",
  "bedtime",
  "school",
  "warmup",
  "emotion",
]);

export function parseSpeechSessionPreset(
  raw: string | null | undefined,
): SpeechSessionPreset | null {
  if (!raw || !SESSION_PRESETS.has(raw as SpeechSessionPreset)) return null;
  return raw as SpeechSessionPreset;
}

import type { PronouncePromptKind, PronouncePromptDifficulty } from "@workspace/speech-coach";

export type SessionPresetModePatch = {
  kind?: PronouncePromptKind;
  difficulty?: PronouncePromptDifficulty;
  sessionSize?: number;
};

export function getSessionPresetPatch(
  preset: SpeechSessionPreset | null,
): SessionPresetModePatch | null {
  if (!preset) return null;
  switch (preset) {
    case "quick":
      return { sessionSize: 3 };
    case "bedtime":
      return { sessionSize: 5, difficulty: "easy" };
    case "school":
      return { difficulty: "medium", sessionSize: 6 };
    case "warmup":
      return { sessionSize: 4 };
    case "emotion":
      return { kind: "sentence", difficulty: "easy", sessionSize: 5 };
    default:
      return null;
  }
}

export type SessionTypeAction =
  | { type: "live"; preset: SpeechSessionPreset }
  | { type: "scroll"; anchor: string };

export function getSessionTypeAction(key: string): SessionTypeAction {
  if (key === "pronounce") {
    return { type: "scroll", anchor: "speech-section-practice" };
  }
  const preset = parseSpeechSessionPreset(key);
  if (preset) return { type: "live", preset };
  return { type: "live", preset: "quick" };
}

/** Short success/retry cue used by Live Coach and speech games. */
export function playSpeechCue(type: "success" | "retry"): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = type === "success" ? 740 : 260;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      void ctx.close().catch(() => undefined);
    };
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  } catch {
    /* sound effects are best-effort */
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export function isToddlerMonths(ageMonths: number): boolean {
  return ageMonths >= 12 && ageMonths < 36;
}

export function weakSoundsToHistory(
  weakSounds: readonly {
    promptId: string;
    avgScore: number;
    attempts: number;
  }[],
): PromptScoreHistory[] {
  return weakSounds.map((w) => ({
    promptId: w.promptId,
    bestScore: w.avgScore,
    attempts: w.attempts,
  }));
}

/** Safe clarity score for API (0–100 integer). */
export function clampClarityScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

const COACH_SNAPSHOT_KEY = "speech_coach_local_snapshot_v1";

export function loadCoachLocalSnapshot(childId: number): CoachLocalSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COACH_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoachLocalSnapshot;
    if (parsed?.childId !== childId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCoachLocalSnapshot(snapshot: CoachLocalSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COACH_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

export type { CoachLocalSnapshot, SessionAttemptInput, SessionJourneyInput };

export function saveCoachJourneySnapshot(input: SessionJourneyInput, previous: CoachLocalSnapshot | null): CoachLocalSnapshot {
  const snapshot = mergeCoachJourneySnapshot(previous, input);
  saveCoachLocalSnapshot(snapshot);
  return snapshot;
}

/** @deprecated Use saveCoachJourneySnapshot with attempt details. */
export function buildCoachLocalSnapshot(
  childId: number,
  score: number,
  bestStreak: number,
  itemsCompleted: number,
  previous: CoachLocalSnapshot | null,
  activity: SessionJourneyInput["activity"] = "live",
): CoachLocalSnapshot {
  return mergeCoachJourneySnapshot(previous, {
    childId,
    score,
    bestStreak,
    itemsCompleted,
    attempts: [],
    activity,
  });
}

/** User-facing mic status for Live Speech Coach — never conflate runtime failure with permission denial. */
export function getSpeechCoachMicStatusMessage(options: {
  error: string | null;
  sessionStatus: MicrophoneSessionState;
  fallbackStatus: string;
}): string {
  const { error, sessionStatus, fallbackStatus } = options;

  if (sessionStatus === "preparing") return "Preparing microphone...";
  if (sessionStatus === "reconnecting") return "Reconnecting microphone...";
  if (sessionStatus === "refreshing") return "Refreshing microphone...";

  switch (error) {
    case "microphone_denied":
      return "Please allow microphone access in your device settings, then tap the mic to try again.";
    case "microphone_blocked":
      return "Microphone access is required for Speech Coach.";
    case "microphone_busy":
      return "Microphone unavailable. Tap the mic to try again.";
    case "stale_stream":
      return "Reconnecting microphone...";
    case "recognition_start_failed":
    case "dead_recorder":
    case "security_error":
      return "Could not start the microphone. Tap the mic to try again.";
    default:
      if (error) return "I could not access the microphone. Please try again.";
      return fallbackStatus;
  }
}
