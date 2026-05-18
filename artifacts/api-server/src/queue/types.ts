export type AiJobStatus = "queued" | "processing" | "completed" | "failed" | "timed_out";

export type AiJobType =
  | "openai.chat"
  | "openai.chat_json"
  | "tts.synthesize"
  | "routine.generate"
  | "meals.generate"
  | "meals.ai_generate"
  | "meals.week_plan"
  | "meals.family_portions"
  | "routines.generate"
  | "routines.enrich_meals"
  | "spelling.ai_generate"
  | "spelling.tts_prewarm"
  | "smart-study.next_questions"
  | "abacus.tutor"
  | "phonics.sound"
  | "phonics.weekly_insight"
  | "audio-lessons.pregenerate"
  | "ai-coach.extend"
  | "ai-coach.stream_plan"
  | "ai-coach.initial_wins"
  | "ai-coach.remaining_wins"
  | "explain.narrative"
  | "speech.transcribe";

export interface AiJobRecord {
  id: string;
  type: AiJobType;
  userId: string;
  status: AiJobStatus;
  createdAt: number;
  updatedAt: number;
  /** Small JSON-serializable payload only — never raw audio buffers. */
  result?: unknown;
  error?: string;
  timedOut?: boolean;
}

export interface EnqueueResult {
  jobId: string;
  status: AiJobStatus;
  /** True when the caller should poll instead of blocking. */
  deferred: boolean;
  retryAfterMs?: number;
}
