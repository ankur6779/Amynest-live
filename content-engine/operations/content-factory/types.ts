/**
 * Cloud Content Factory — shared types.
 */

export type FactoryProductionStatus =
  | "QUEUED"
  | "PLANNING"
  | "RENDERING"
  | "AUDIO"
  | "ASSEMBLING"
  | "VALIDATING"
  | "READY_TO_PUBLISH"
  | "PUBLISHED"
  | "FAILED";

export interface FactoryProductionRecord {
  runId: string;
  idempotencyKey: string;
  goldenScriptId: string;
  goldenNum: number;
  status: FactoryProductionStatus;
  productionAttempt: number;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  videoTaskId?: string;
  audioTaskId?: string;
  masterPath?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  publishedAt?: string;
  finalDurationSec?: number;
  failureReason?: string;
  credits?: {
    videoGeneration?: number;
    audioGeneration?: number;
    total?: number;
  };
  gates?: Record<string, "PASS" | "FAIL" | "SKIP">;
  dryRun?: boolean;
}

export interface GoldenQueueState {
  version: "1.0.0";
  /** Next golden number to produce (1-based). */
  nextGoldenNum: number;
  /** Highest golden available in library. */
  maxGoldenNum: number;
  /** Marked consumed / historical — never regenerate. */
  consumed: Record<
    string,
    {
      status: FactoryProductionStatus;
      updatedAt: string;
      youtubeVideoId?: string;
      runId?: string;
      note?: string;
    }
  >;
  productions: FactoryProductionRecord[];
  updatedAt: string;
}

export interface FactoryScheduleConfig {
  timezone: string;
  /** ISO-like local wall time HH:mm */
  localTime: string;
  /** DTSTART calendar date YYYY-MM-DD in timezone */
  dtstartDate: string;
  intervalDays: number;
}

export const DEFAULT_FACTORY_SCHEDULE: FactoryScheduleConfig = {
  timezone: "Asia/Kolkata",
  localTime: "17:00",
  dtstartDate: "2026-09-02",
  intervalDays: 3,
};

/** Automatic scheduled runs: never retry spend on same golden. */
export const MAX_PRODUCTION_ATTEMPTS = 1;

export const FACTORY_LIVE_ENV = "AMYNEST_CONTENT_FACTORY_LIVE";
export const FACTORY_DRY_RUN_ENV = "AMYNEST_CONTENT_FACTORY_DRY_RUN";
