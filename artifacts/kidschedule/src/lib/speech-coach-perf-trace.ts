/**
 * Speech Coach first-turn latency instrumentation (dev diagnostics).
 * Does not affect playback, STT, or scoring — marks + logs only.
 */

export type SpeechCoachPerfMark =
  | "session_start"
  | "opening_audio_start"
  | "opening_audio_end"
  | "recording_start"
  | "recording_stop"
  | "stt_start"
  | "stt_end"
  | "evaluation_start"
  | "evaluation_end"
  | "feedback_tts_start"
  | "feedback_tts_end"
  | "feedback_audio_play_start";

export type SpeechCoachCacheAudit = {
  scope: "opening" | "feedback";
  total: number;
  hits: number;
  misses: number;
  hitRate: number;
  missSamples: string[];
};

export type SpeechCoachPerfTrace = {
  sessionId: string;
  startedAt: number;
  marks: Partial<Record<SpeechCoachPerfMark, number>>;
  cacheAudits: SpeechCoachCacheAudit[];
};

const DELTA_PAIRS: Array<[SpeechCoachPerfMark, SpeechCoachPerfMark, string]> = [
  ["session_start", "opening_audio_end", "session_to_opening_end_ms"],
  ["recording_stop", "stt_end", "thinking_window_ms"],
  ["stt_start", "stt_end", "stt_ms"],
  ["evaluation_start", "evaluation_end", "evaluation_ms"],
  ["feedback_tts_start", "feedback_tts_end", "feedback_tts_ms"],
  ["feedback_tts_start", "feedback_audio_play_start", "feedback_tts_to_play_ms"],
  ["recording_stop", "feedback_audio_play_start", "response_perceived_ms"],
];

function isPerfTraceEnabled(): boolean {
  return import.meta.env.DEV;
}

function delta(markA: number | undefined, markB: number | undefined): number | null {
  if (markA == null || markB == null) return null;
  return Math.max(0, Math.round(markB - markA));
}

function buildDeltas(marks: Partial<Record<SpeechCoachPerfMark, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [a, b, key] of DELTA_PAIRS) {
    const d = delta(marks[a], marks[b]);
    if (d != null) out[key] = d;
  }
  return out;
}

class SpeechCoachPerfTracer {
  private trace: SpeechCoachPerfTrace | null = null;

  startSession(): SpeechCoachPerfTrace {
    const sessionId = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.trace = {
      sessionId,
      startedAt: performance.now(),
      marks: {},
      cacheAudits: [],
    };
    return this.trace;
  }

  active(): SpeechCoachPerfTrace | null {
    return this.trace;
  }

  mark(name: SpeechCoachPerfMark, at = performance.now()): void {
    if (!this.trace) return;
    this.trace.marks[name] = at;
  }

  recordCacheAudit(audit: SpeechCoachCacheAudit): void {
    if (!this.trace) return;
    this.trace.cacheAudits.push(audit);
  }

  snapshot(): SpeechCoachPerfTrace | null {
    if (!this.trace) return null;
    return {
      ...this.trace,
      marks: { ...this.trace.marks },
      cacheAudits: [...this.trace.cacheAudits],
    };
  }

  logSummary(reason = "turn_complete"): void {
    if (!isPerfTraceEnabled() || !this.trace) return;
    const deltas = buildDeltas(this.trace.marks);
    const payload = {
      evt: "speech_coach.perf_trace",
      reason,
      sessionId: this.trace.sessionId,
      marks: this.trace.marks,
      deltas,
      cacheAudits: this.trace.cacheAudits,
    };
    console.info("[speech-coach:perf]", payload);
  }

  reset(): void {
    this.trace = null;
  }
}

export const speechCoachPerf = new SpeechCoachPerfTracer();

/** @internal */
export function _speechCoachPerfDeltaForTests(
  marks: Partial<Record<SpeechCoachPerfMark, number>>,
): Record<string, number> {
  return buildDeltas(marks);
}
