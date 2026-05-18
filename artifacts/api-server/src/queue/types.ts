export type AiJobStatus = "queued" | "processing" | "completed" | "failed" | "timed_out";

export type AiJobType =
  | "openai.chat"
  | "openai.chat_json"
  | "tts.synthesize"
  | "routine.generate";

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
