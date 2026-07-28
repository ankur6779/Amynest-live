import { createHash } from "node:crypto";
import { resolveWorkflowSettings } from "../../config/workflow.js";
import type { ContentEngineConfig } from "../../types/index.js";
import type {
  PersistedWorkflowState,
  WorkflowCheckpoint,
  WorkflowEvent,
  WorkflowJobRequest,
  WorkflowResult,
  WorkflowVideoUnit,
} from "../../types/workflow.js";
import { WORKFLOW_RESULT_VERSION } from "../../types/workflow.js";
import {
  createTelemetryEvent,
  InMemoryTelemetrySink,
  type TelemetryEvent,
  type TelemetrySink,
} from "../../telemetry/index.js";
import { formatIsoDate } from "../../calendar/index.js";
import { mapWithConcurrency } from "../execution/index.js";
import {
  buildExecutionReport,
  createPipelineServices,
  createVideoUnit,
  runVideoPipeline,
  selectTopicsForJob,
  type PipelineServices,
} from "../jobs/index.js";
import { WorkflowNotificationBus } from "../notifications/index.js";
import {
  InMemoryWorkflowStore,
  type WorkflowPersistenceStore,
} from "../persistence/index.js";
import { WorkflowQueue } from "../queue/index.js";
import { prepareRecovery } from "../recovery/index.js";
import { computeWorkflowBackoff } from "../retry/index.js";
import { buildWorkflowTelemetry } from "../telemetry/index.js";

export interface WorkflowOrchestratorOptions {
  config: ContentEngineConfig;
  store?: WorkflowPersistenceStore;
  queue?: WorkflowQueue;
  notifications?: WorkflowNotificationBus;
  telemetry?: TelemetrySink;
  services?: PipelineServices;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
}

export interface WorkflowOrchestrationResult {
  result: WorkflowResult;
  telemetry: TelemetryEvent;
}

/**
 * Phase 7 orchestrator: autonomous workflow across Phases 1–6.
 */
export class WorkflowOrchestrator {
  private readonly config: ContentEngineConfig;
  private readonly store: WorkflowPersistenceStore;
  private readonly queue: WorkflowQueue;
  private readonly notifications: WorkflowNotificationBus;
  private readonly telemetry: TelemetrySink;
  private readonly services: PipelineServices;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => Date;

  constructor(options: WorkflowOrchestratorOptions) {
    const settings = resolveWorkflowSettings(options.config);
    this.config = options.config;
    this.store = options.store ?? new InMemoryWorkflowStore();
    this.queue =
      options.queue ??
      new WorkflowQueue({
        mode: settings.queueMode,
        concurrency: settings.workflowConcurrency,
      });
    this.notifications = options.notifications ?? new WorkflowNotificationBus();
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
    this.services = options.services ?? createPipelineServices(options.config);
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? (() => new Date());
  }

  /** Enqueue a job and execute when claimed (supports delayed/priority). */
  async enqueueAndRun(request: WorkflowJobRequest): Promise<WorkflowOrchestrationResult> {
    const job = this.queue.enqueue(request, {
      priority: request.priority,
      delayMs: request.delayMs,
    });

    let claimed = this.queue.claimById(job.id, Date.now());
    const deadline = Date.now() + Math.max(0, request.delayMs ?? 0) + 5_000;
    while (!claimed && Date.now() < deadline) {
      await this.sleep(5);
      claimed = this.queue.claimById(job.id, Date.now());
    }
    if (!claimed) {
      throw new Error(`Failed to claim workflow job ${job.id} from queue`);
    }

    try {
      const result = await this.execute(
        {
          ...claimed.payload,
          trigger: claimed.payload.trigger ?? request.trigger ?? "manual",
        },
        Date.now() - claimed.enqueuedAt,
      );
      this.queue.complete(claimed.id);
      return result;
    } catch (error) {
      this.queue.fail(claimed.id, { retry: false });
      throw error;
    }
  }

  /** Direct execution without queue (manual / CLI). */
  async run(request: WorkflowJobRequest): Promise<WorkflowOrchestrationResult> {
    return this.execute(request, 0);
  }

  /** Resume a previously persisted workflow from its latest checkpoints. */
  async resume(workflowId: string): Promise<WorkflowOrchestrationResult> {
    const existing = this.store.get(workflowId);
    if (!existing) throw new Error(`Unknown workflow: ${workflowId}`);
    const recovered = prepareRecovery(existing);
    this.store.save(recovered);
    return this.execute(
      {
        type: recovered.jobType === "GenerateDailyVideos"
          ? "RetryFailedVideo"
          : recovered.jobType,
        workflowId: recovered.workflowId,
        trigger: recovered.trigger,
      },
      0,
      recovered,
    );
  }

  private async execute(
    request: WorkflowJobRequest,
    queueWaitTimeMs: number,
    resumeState?: PersistedWorkflowState,
  ): Promise<WorkflowOrchestrationResult> {
    const startedMs = Date.now();
    const settings = resolveWorkflowSettings(this.config);
    const startedAt = this.now().toISOString();
    const workflowId =
      resumeState?.workflowId ??
      request.workflowId ??
      `wf_${createHash("sha256")
        .update(`${request.type}|${startedAt}|${Math.random()}`)
        .digest("hex")
        .slice(0, 12)}`;

    const events: WorkflowEvent[] = resumeState?.events ?? [];
    const checkpoints: WorkflowCheckpoint[] = resumeState?.checkpoints ?? [];
    let retries = resumeState?.retries ?? 0;
    const warnings = resumeState?.warnings ?? [];
    const errors: string[] = [];

    const emit = (event: WorkflowEvent) => {
      events.push(event);
    };

    emit({
      kind: "JobQueued",
      at: startedAt,
      workflowId,
      message: `Job ${request.type} queued`,
    });
    emit({
      kind: "Started",
      at: startedAt,
      workflowId,
      message: `Workflow started (${request.type})`,
      details: { trigger: request.trigger ?? "manual" },
    });

    await this.notifications.notify(settings.notificationPolicy, "started", {
      title: "Workflow started",
      body: `${request.type} (${workflowId})`,
      workflowId,
    });

    let videoUnits: WorkflowVideoUnit[] = resumeState?.videoUnits ?? [];

    if (!resumeState) {
      videoUnits = await this.bootstrapUnits(request, workflowId);
    } else if (request.type === "RetryFailedVideo" && request.videoUnitId) {
      videoUnits = videoUnits.map((unit) =>
        unit.id === request.videoUnitId
          ? { ...unit, status: "queued", errors: [] }
          : unit,
      );
    }

    const persist = () => {
      const state: PersistedWorkflowState = {
        workflowId,
        jobType: request.type,
        status: "running",
        trigger: request.trigger ?? "manual",
        createdAt: resumeState?.createdAt ?? startedAt,
        updatedAt: new Date().toISOString(),
        completedAt: null,
        videoUnits,
        checkpoints,
        events,
        retries,
        errors,
        warnings,
        queueWaitTimeMs,
      };
      this.store.save(state);
    };

    persist();

    const unitsToRun = videoUnits.filter((u) => u.status !== "completed");
    const concurrency = settings.parallelRendering
      ? settings.workflowConcurrency
      : 1;

    const runUnit = async (unit: WorkflowVideoUnit): Promise<WorkflowVideoUnit> => {
      let current = unit;
      let attempt = 0;
      while (attempt <= settings.maximumRetries) {
        const result = await runVideoPipeline({
          workflowId,
          unit: current,
          services: this.services,
          jobType: request.type,
          emit,
          persistCheckpoint: (checkpoint, updated) => {
            checkpoints.push(checkpoint);
            const idx = videoUnits.findIndex((u) => u.id === updated.id);
            if (idx >= 0) videoUnits[idx] = updated;
            persist();
            void this.notifications.notify(settings.notificationPolicy, "progress", {
              title: "Checkpoint reached",
              body: `${checkpoint.name} for ${updated.topicTitle}`,
              workflowId,
            });
          },
        });

        const idx = videoUnits.findIndex((u) => u.id === result.id);
        if (idx >= 0) videoUnits[idx] = result;

        if (result.status === "completed") {
          persist();
          return result;
        }

        if (!settings.resumeOnFailure || attempt >= settings.maximumRetries) {
          errors.push(...result.errors);
          persist();
          return result;
        }

        attempt += 1;
        retries += 1;
        result.retries += 1;
        current = {
          ...result,
          status: "queued",
          errors: [],
        };
        const delayMs = computeWorkflowBackoff(
          attempt,
          settings.retryBaseDelayMs,
          settings.retryMaxDelayMs,
        );
        emit({
          kind: "Failed",
          at: new Date().toISOString(),
          workflowId,
          videoUnitId: result.id,
          message: `Retrying after failure: ${result.errors.join("; ")}`,
          details: { attempt, delayMs },
        });
        await this.notifications.notify(settings.notificationPolicy, "retry", {
          title: "Workflow retry",
          body: result.errors.join("; ") || "Retrying video unit",
          workflowId,
        });
        await this.sleep(delayMs);
      }
      return current;
    };

    await mapWithConcurrency(unitsToRun, concurrency, async (unit) => runUnit(unit));

    const completedAt = this.now().toISOString();
    const failed = videoUnits.filter((u) => u.status === "failed");
    const succeeded = videoUnits.filter((u) => u.status === "completed");
    const status =
      failed.length === 0
        ? "completed"
        : succeeded.length === 0
          ? "failed"
          : "completed";

    if (status === "failed") {
      emit({
        kind: "Failed",
        at: completedAt,
        workflowId,
        message: `Workflow failed (${failed.length}/${videoUnits.length})`,
      });
      await this.notifications.notify(settings.notificationPolicy, "failed", {
        title: "Workflow failed",
        body: errors.join("; ") || "One or more videos failed",
        workflowId,
      });
    } else {
      emit({
        kind: "Completed",
        at: completedAt,
        workflowId,
        message: `Workflow completed (${succeeded.length} videos)`,
      });
      await this.notifications.notify(settings.notificationPolicy, "completed", {
        title: "Workflow completed",
        body: `${succeeded.length} video(s) processed`,
        workflowId,
      });
    }

    const telemetry = buildWorkflowTelemetry({
      executionTimeMs: Date.now() - startedMs,
      queueWaitTimeMs,
      videoUnits,
      retryCount: retries,
    });

    const executionSummary = buildExecutionReport({
      workflowId,
      jobType: request.type,
      trigger: request.trigger ?? "manual",
      startedAt,
      completedAt,
      status,
      videoUnits,
      errors,
      retries,
      warnings: [
        ...warnings,
        ...videoUnits.flatMap((u) => u.warnings),
      ],
    });

    await this.notifications.notify(settings.notificationPolicy, "summary", {
      title: "Workflow summary",
      body: `${executionSummary.videos.length} videos, ${telemetry.successRate * 100}% success`,
      workflowId,
    });

    const result: WorkflowResult = {
      id: `wr_${workflowId}`,
      version: WORKFLOW_RESULT_VERSION,
      workflowId,
      jobType: request.type,
      status,
      trigger: request.trigger ?? "manual",
      videosGenerated: succeeded.filter((u) => u.artifacts.content).length,
      videosPublished: succeeded.filter((u) => u.artifacts.published).length,
      executionSummary,
      telemetry,
      events,
      videoUnits,
      createdAt: resumeState?.createdAt ?? startedAt,
      completedAt,
    };

    this.store.save({
      workflowId,
      jobType: request.type,
      status,
      trigger: request.trigger ?? "manual",
      createdAt: result.createdAt,
      updatedAt: completedAt,
      completedAt,
      videoUnits,
      checkpoints,
      events,
      retries,
      errors,
      warnings: executionSummary.warnings,
      queueWaitTimeMs,
    });

    const event = createTelemetryEvent({
      name: "workflow.execute",
      generationTimeMs: telemetry.executionTimeMs,
      provider: "workflow",
      errors,
      retryCount: retries,
      cacheHit: false,
      metadata: {
        workflowId,
        videosGenerated: result.videosGenerated,
        videosPublished: result.videosPublished,
        successRate: telemetry.successRate,
        queueWaitTimeMs,
      },
    });
    this.telemetry.record(event);

    return { result, telemetry: event };
  }

  private async bootstrapUnits(
    request: WorkflowJobRequest,
    workflowId: string,
  ): Promise<WorkflowVideoUnit[]> {
    const settings = resolveWorkflowSettings(this.config);
    const today = formatIsoDate(this.now());

    if (request.workflowId && request.type === "RetryFailedVideo") {
      const existing = this.store.get(request.workflowId);
      if (!existing) throw new Error(`Unknown workflow: ${request.workflowId}`);
      return existing.videoUnits
        .filter((u) =>
          request.videoUnitId ? u.id === request.videoUnitId : u.status === "failed",
        )
        .map((u) => ({ ...u, status: "queued" as const, errors: [] }));
    }

    if (
      (request.type === "RepublishVideo" ||
        request.type === "RenderOnly" ||
        request.type === "PublishOnly") &&
      request.workflowId
    ) {
      const existing = this.store.get(request.workflowId);
      if (!existing) throw new Error(`Unknown workflow: ${request.workflowId}`);
      const unit = request.videoUnitId
        ? existing.videoUnits.find((u) => u.id === request.videoUnitId)
        : existing.videoUnits[0];
      if (!unit) throw new Error("Video unit not found for republish/render/publish");

      if (request.type === "RepublishVideo" || request.type === "PublishOnly") {
        return [
          {
            ...unit,
            status: "queued",
            latestCheckpoint: unit.artifacts.render ? "Rendered" : unit.latestCheckpoint,
            artifacts: {
              ...unit.artifacts,
              published: undefined,
            },
            errors: [],
          },
        ];
      }
      if (request.type === "RenderOnly") {
        return [
          {
            ...unit,
            status: "queued",
            latestCheckpoint: unit.artifacts.assets ? "AssetsReady" : unit.latestCheckpoint,
            artifacts: {
              ...unit.artifacts,
              render: undefined,
              published: undefined,
            },
            errors: [],
          },
        ];
      }
    }

    const count =
      request.type === "GenerateOneVideo"
        ? 1
        : request.type === "GenerateWeeklyContent"
          ? request.count ?? settings.dailyVideoCount * 7
          : request.count ?? settings.dailyVideoCount;

    const topics = selectTopicsForJob({
      jobType: request.type,
      topicId: request.topicId,
      count,
      history: this.services.history,
      date: request.startDate ?? today,
    });

    return topics.map((topic) => {
      const unit = createVideoUnit(topic);
      void workflowId;
      return unit;
    });
  }
}

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
