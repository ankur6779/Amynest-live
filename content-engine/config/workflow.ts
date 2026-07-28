import type {
  ContentEngineConfig,
  ResolvedWorkflowConfig,
} from "../types/index.js";
import type { WorkflowEngineSettings } from "../types/workflow.js";

export const DEFAULT_WORKFLOW_SETTINGS: WorkflowEngineSettings = {
  workflowConcurrency: 2,
  maximumRetries: 2,
  resumeOnFailure: true,
  notificationPolicy: {
    channels: ["webhook"],
    onStarted: true,
    onProgress: true,
    onCompleted: true,
    onFailed: true,
    onRetry: true,
    onSummary: true,
  },
  dailyVideoCount: 3,
  parallelRendering: false,
  queueMode: "priority",
  retryBaseDelayMs: 100,
  retryMaxDelayMs: 2_000,
  timezone: "Asia/Kolkata",
};

/** Merge Phase 7 workflow defaults (backward compatible). */
export function resolveWorkflowSettings(
  config: ContentEngineConfig,
): ResolvedWorkflowConfig {
  const notificationPolicy = {
    ...DEFAULT_WORKFLOW_SETTINGS.notificationPolicy,
    ...config.notificationPolicy,
    channels:
      config.notificationPolicy?.channels ??
      config.notificationChannels ??
      DEFAULT_WORKFLOW_SETTINGS.notificationPolicy.channels,
  };

  return {
    ...config,
    workflowConcurrency:
      config.workflowConcurrency ?? DEFAULT_WORKFLOW_SETTINGS.workflowConcurrency,
    maximumRetries: config.maximumRetries ?? DEFAULT_WORKFLOW_SETTINGS.maximumRetries,
    resumeOnFailure:
      config.resumeOnFailure ?? DEFAULT_WORKFLOW_SETTINGS.resumeOnFailure,
    notificationPolicy,
    dailyVideoCount:
      config.dailyVideoCount ?? DEFAULT_WORKFLOW_SETTINGS.dailyVideoCount,
    parallelRendering:
      config.parallelRendering ?? DEFAULT_WORKFLOW_SETTINGS.parallelRendering,
    queueMode: config.queueMode ?? DEFAULT_WORKFLOW_SETTINGS.queueMode,
    retryBaseDelayMs:
      config.retryBaseDelayMs ?? DEFAULT_WORKFLOW_SETTINGS.retryBaseDelayMs,
    retryMaxDelayMs:
      config.retryMaxDelayMs ?? DEFAULT_WORKFLOW_SETTINGS.retryMaxDelayMs,
    timezone: config.timezone ?? DEFAULT_WORKFLOW_SETTINGS.timezone,
  };
}
