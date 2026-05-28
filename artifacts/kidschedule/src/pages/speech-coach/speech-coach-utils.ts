import type { PromptScoreHistory } from "@workspace/speech-coach";

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
