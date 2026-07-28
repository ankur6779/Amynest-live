import type { AssetPackage } from "./asset-package.js";
import type { ContentPackage } from "./content-package.js";
import type { PublishedVideo } from "./published-video.js";
import type { RenderPackage } from "./render-package.js";
import type { StoryboardPackage } from "./storyboard.js";
import type { Topic } from "./index.js";

export const WORKFLOW_RESULT_VERSION = "7.0.0";

export type WorkflowJobType =
  | "GenerateOneVideo"
  | "GenerateDailyVideos"
  | "GenerateWeeklyContent"
  | "RetryFailedVideo"
  | "RepublishVideo"
  | "RenderOnly"
  | "PublishOnly";

export type WorkflowStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

export type WorkflowPhase =
  | "topic-selection"
  | "content-generation"
  | "storyboard-planning"
  | "asset-resolution"
  | "rendering"
  | "publishing"
  | "reporting"
  | "completed";

export type CheckpointName =
  | "ContentGenerated"
  | "StoryboardReady"
  | "AssetsReady"
  | "Rendered"
  | "Published";

export type WorkflowEventKind =
  | "JobQueued"
  | "Started"
  | "ContentGenerated"
  | "StoryboardGenerated"
  | "AssetsResolved"
  | "Rendered"
  | "Published"
  | "Completed"
  | "Failed"
  | "Cancelled";

export type WorkflowTrigger =
  | "manual"
  | "cron"
  | "coolify"
  | "docker"
  | "cloud";

export type WorkflowNotificationKind =
  | "started"
  | "progress"
  | "completed"
  | "failed"
  | "retry"
  | "summary";

export type QueueMode = "fifo" | "priority";

export interface WorkflowEngineSettings {
  workflowConcurrency: number;
  maximumRetries: number;
  resumeOnFailure: boolean;
  notificationPolicy: WorkflowNotificationPolicy;
  dailyVideoCount: number;
  parallelRendering: boolean;
  queueMode: QueueMode;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  timezone: string;
}

export interface WorkflowNotificationPolicy {
  channels: Array<"telegram" | "email" | "webhook" | "slack" | "discord">;
  onStarted: boolean;
  onProgress: boolean;
  onCompleted: boolean;
  onFailed: boolean;
  onRetry: boolean;
  onSummary: boolean;
}

export interface WorkflowJobRequest {
  type: WorkflowJobType;
  /** Optional topic id for single-video / render-only / publish-only jobs. */
  topicId?: string;
  /** Existing workflow id for retry / resume / republish. */
  workflowId?: string;
  /** Existing video unit id inside a workflow. */
  videoUnitId?: string;
  priority?: number;
  delayMs?: number;
  trigger?: WorkflowTrigger;
  /** Override daily/weekly count for batch jobs. */
  count?: number;
  startDate?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface WorkflowEvent {
  kind: WorkflowEventKind;
  at: string;
  workflowId: string;
  videoUnitId?: string;
  message: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface PhaseTiming {
  phase: WorkflowPhase;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface WorkflowCheckpoint {
  name: CheckpointName;
  at: string;
  videoUnitId: string;
  workflowId: string;
}

export interface WorkflowVideoArtifacts {
  topic?: Topic;
  content?: ContentPackage;
  storyboard?: StoryboardPackage;
  assets?: AssetPackage;
  render?: RenderPackage;
  published?: PublishedVideo;
}

export interface WorkflowVideoUnit {
  id: string;
  topicId: string;
  topicTitle: string;
  status: WorkflowStatus;
  currentPhase: WorkflowPhase;
  latestCheckpoint: CheckpointName | null;
  artifacts: WorkflowVideoArtifacts;
  errors: string[];
  warnings: string[];
  retries: number;
  phaseTimings: PhaseTiming[];
  videoId?: string;
  url?: string;
}

export interface WorkflowExecutionReport {
  workflowId: string;
  jobType: WorkflowJobType;
  trigger: WorkflowTrigger;
  startedAt: string;
  completedAt: string | null;
  status: WorkflowStatus;
  videos: Array<{
    topic: string;
    topicId: string;
    videoId: string | null;
    url: string | null;
    durationSeconds: number | null;
    renderTimeMs: number | null;
    uploadTimeMs: number | null;
    errors: string[];
    retries: number;
    warnings: string[];
    latestCheckpoint: CheckpointName | null;
  }>;
  errors: string[];
  retries: number;
  warnings: string[];
}

export interface WorkflowTelemetry {
  executionTimeMs: number;
  averagePhaseDurationMs: number;
  failureRate: number;
  retryCount: number;
  successRate: number;
  queueWaitTimeMs: number;
  videosAttempted: number;
  videosSucceeded: number;
  videosFailed: number;
}

export interface WorkflowResult {
  id: string;
  version: string;
  workflowId: string;
  jobType: WorkflowJobType;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  videosGenerated: number;
  videosPublished: number;
  executionSummary: WorkflowExecutionReport;
  telemetry: WorkflowTelemetry;
  events: WorkflowEvent[];
  videoUnits: WorkflowVideoUnit[];
  createdAt: string;
  completedAt: string | null;
}

export interface PersistedWorkflowState {
  workflowId: string;
  jobType: WorkflowJobType;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  videoUnits: WorkflowVideoUnit[];
  checkpoints: WorkflowCheckpoint[];
  events: WorkflowEvent[];
  retries: number;
  errors: string[];
  warnings: string[];
  queueWaitTimeMs: number;
}

export type WorkflowExportFormat = "json" | "yaml" | "workflow-report-v1";

export interface WorkflowExportResult {
  format: WorkflowExportFormat;
  content: string;
  contentType: string;
}

export interface QueueJob<T = WorkflowJobRequest> {
  id: string;
  payload: T;
  priority: number;
  availableAt: number;
  enqueuedAt: number;
  attempts: number;
  status: "queued" | "active" | "completed" | "failed" | "delayed" | "dead-letter";
}
