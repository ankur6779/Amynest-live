import { createHash } from "node:crypto";
import { resolvePublishingSettings } from "../config/publishing.js";
import {
  isLaunchValidatorEnabled,
  validateLaunch,
  writeLaunchValidationReport,
} from "../launch-validator/index.js";
import type { ContentEngineConfig } from "../types/index.js";
import type {
  NotificationDelivery,
  PersistedPublishRecord,
  PublishedVideo,
  PublishingInput,
  RetryAttempt,
  ThumbnailResolution,
} from "../types/published-video.js";
import { PUBLISHED_VIDEO_VERSION } from "../types/published-video.js";
import {
  createTelemetryEvent,
  InMemoryTelemetrySink,
  type TelemetryEvent,
  type TelemetrySink,
} from "../telemetry/index.js";
import { AuditLog } from "./audit/index.js";
import {
  buildPublishMetadata,
  resolveThumbnail,
  writeYouTubeMetadataReport,
} from "./metadata/index.js";
import { writeYouTubePublishingScorecard } from "./polish/index.js";
import { InMemoryNotificationBus } from "./notifications/index.js";
import {
  InMemoryPublishStore,
  type PublishPersistenceStore,
} from "./persistence/index.js";
import { withRetries } from "./retry/index.js";
import { buildSchedulePlan } from "./scheduler/index.js";
import { buildPublishingTelemetry } from "./telemetry/index.js";
import { verifyPublishedVideo } from "./verification/index.js";
import {
  createDefaultPublishingRegistry,
  PublishingError,
  type PublishingProviderRegistry,
} from "./youtube/index.js";

export interface PublishingOrchestratorOptions {
  config: ContentEngineConfig;
  registry?: PublishingProviderRegistry;
  store?: PublishPersistenceStore;
  notifications?: InMemoryNotificationBus;
  telemetry?: TelemetrySink;
  sleep?: (ms: number) => Promise<void>;
}

export interface PublishingOrchestrationResult {
  video: PublishedVideo;
  telemetry: TelemetryEvent;
  idempotentReplay: boolean;
}

/**
 * Phase 6 orchestrator: RenderPackage (+ ContentPackage) → PublishedVideo.
 */
export class PublishingOrchestrator {
  private readonly config: ContentEngineConfig;
  private readonly registry: PublishingProviderRegistry;
  private readonly store: PublishPersistenceStore;
  private readonly notifications: InMemoryNotificationBus;
  private readonly telemetry: TelemetrySink;
  private readonly sleep?: (ms: number) => Promise<void>;

  constructor(options: PublishingOrchestratorOptions) {
    this.config = options.config;
    this.registry = options.registry ?? createDefaultPublishingRegistry();
    this.store = options.store ?? new InMemoryPublishStore();
    this.notifications = options.notifications ?? new InMemoryNotificationBus();
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
    this.sleep = options.sleep;
  }

  async publish(input: PublishingInput): Promise<PublishingOrchestrationResult> {
    const started = Date.now();
    const settings = resolvePublishingSettings(this.config);
    const audit = new AuditLog();
    const notifications: NotificationDelivery[] = [];

    const idempotencyKey =
      input.idempotencyKey ??
      buildIdempotencyKey(input.render.id, input.render.checksum, input.content.topic.id);

    const existing = this.store.getByIdempotencyKey(idempotencyKey);
    if (existing) {
      const replay = toPublishedVideo(existing, {
        notifications: [],
        auditLog: audit.list(),
        verification: {
          ok: true,
          videoExists: true,
          thumbnailApplied: existing.thumbnail.applied,
          metadataApplied: true,
          visibilityCorrect: true,
          durationMatch: true,
          resolutionMatch: true,
          issues: [],
          checkedAt: new Date().toISOString(),
        },
        telemetry: buildPublishingTelemetry({
          uploadDurationMs: 0,
          apiLatencyMs: 0,
          retries: 0,
          quotaUnits: 0,
          failures: 0,
          provider: existing.provider,
          verificationMs: 0,
        }),
      });
      const event = createTelemetryEvent({
        name: "publishing.publish",
        generationTimeMs: Date.now() - started,
        provider: existing.provider,
        errors: [],
        retryCount: 0,
        cacheHit: true,
        topicId: input.content.topic.id,
        metadata: {
          idempotentReplay: true,
          videoId: existing.videoId,
        },
      });
      this.telemetry.record(event);
      return { video: replay, telemetry: event, idempotentReplay: true };
    }

    const metadata = buildPublishMetadata(input.content, settings, input.overrides);
    if (input.render.renderMetadata.outputDirectory) {
      try {
        writeYouTubeMetadataReport({
          metadata,
          outputDirectory: input.render.renderMetadata.outputDirectory,
        });
        if (metadata.polish) {
          writeYouTubePublishingScorecard({
            metadata,
            polish: metadata.polish,
            outputDirectory: input.render.renderMetadata.outputDirectory,
          });
        }
      } catch {
        // Reports are best-effort; never block publish.
      }
    }
    let thumbnail: ThumbnailResolution = resolveThumbnail({
      generatedPath: input.thumbnailPath,
      brandingDefaultPath: "brand://amynest-default-thumb.jpg",
      searchDirectory: input.render.renderMetadata.outputDirectory,
    });
    const schedule = buildSchedulePlan({
      policy: settings.schedulePolicy,
      visibility: metadata.visibility,
      modeOverride: input.scheduleMode,
      publishAt: input.publishAt,
      uploadTime: this.config.uploadTime,
    });
    metadata.visibility = schedule.visibility;

    const provider = await this.registry.resolveProvider(settings.publishingProvider);

    // Final production launch gate — evidence from final MP4 only. No bypass.
    if (isLaunchValidatorEnabled()) {
      const launchReport = validateLaunch({
        content: input.content,
        render: input.render,
        metadata,
        thumbnail,
        schedule,
        evidenceWorkDir: input.render.renderMetadata.outputDirectory
          ? `${input.render.renderMetadata.outputDirectory}/evidence`
          : undefined,
      });
      const written = writeLaunchValidationReport({
        report: launchReport,
        outputDirectory: input.render.renderMetadata.outputDirectory,
      });
      launchReport.reportPath = written.path;
      audit.record("verify", provider.id, {
        launchValidator: true,
        recommendation: launchReport.recommendation,
        overall: launchReport.scores.overall,
        certification: launchReport.certification?.certification ?? "MISSING",
        qualityReportPath: launchReport.qualityReportPath ?? null,
        reportPath: written.path,
      });
      const evidenceOk =
        launchReport.ok &&
        launchReport.certification?.certification === "PASS" &&
        launchReport.certification?.ok === true;
      if (!evidenceOk) {
        throw new PublishingError(
          "validation",
          `Launch evidence certification blocked publish (${launchReport.certification?.certification ?? "MISSING"}, score ${launchReport.scores.overall}): ${launchReport.reasons.slice(0, 6).join(" | ")}`,
          { retryable: false },
        );
      }
    }

    audit.record("upload", provider.id, {
      renderPackageId: input.render.id,
      idempotencyKey,
    });

    const retryResult = await withRetries(
      () =>
        provider.upload({
          jobId: `pub_${idempotencyKey.slice(0, 12)}`,
          idempotencyKey,
          videoPath: input.render.videoPath,
          thumbnailPath:
            thumbnail.source === "branding-default" && thumbnail.path.startsWith("brand://")
              ? null
              : thumbnail.path,
          metadata,
          schedule,
          durationSeconds: input.render.duration,
          width: input.render.resolution.width,
          height: input.render.resolution.height,
          checksum: input.render.checksum,
        }),
      {
        maxRetries: settings.uploadRetries,
        baseDelayMs: settings.retryBaseDelayMs,
        maxDelayMs: settings.retryMaxDelayMs,
        deadLetterEnabled: settings.deadLetterEnabled,
      },
      {
        idempotencyKey,
        renderPackageId: input.render.id,
        sleep: this.sleep,
      },
    );

    for (const attempt of retryResult.attempts) {
      audit.record(
        "retry",
        provider.id,
        {
          attempt: attempt.attempt,
          errorCode: attempt.errorCode,
          message: attempt.message,
          delayMs: attempt.delayMs,
        },
      );
      notifications.push(
        ...(await this.notifications.notify(settings.notificationChannels, "retry", {
          title: "Publish retry",
          body: attempt.message,
          metadata: { attempt: attempt.attempt, errorCode: attempt.errorCode },
        })),
      );
    }

    if (!retryResult.value) {
      if (retryResult.deadLetter) {
        this.store.saveDeadLetter(retryResult.deadLetter);
      }
      notifications.push(
        ...(await this.notifications.notify(settings.notificationChannels, "failure", {
          title: "Publish failed",
          body: retryResult.deadLetter?.lastError ?? "Upload failed",
          metadata: { renderPackageId: input.render.id },
        })),
      );
      const event = createTelemetryEvent({
        name: "publishing.publish",
        generationTimeMs: Date.now() - started,
        provider: provider.id,
        errors: [retryResult.deadLetter?.lastError ?? "Upload failed"],
        retryCount: retryResult.attempts.length,
        cacheHit: false,
        topicId: input.content.topic.id,
        metadata: {
          failures: retryResult.failures,
          deadLetter: Boolean(retryResult.deadLetter),
        },
      });
      this.telemetry.record(event);
      throw new PublishingError(
        retryResult.deadLetter?.errorCode ?? "unknown",
        retryResult.deadLetter?.lastError ?? "Upload failed after retries",
        { retryable: false },
      );
    }

    const upload = retryResult.value;
    thumbnail = { ...thumbnail, applied: upload.thumbnailApplied };
    audit.record("upload", provider.id, {
      videoId: upload.videoId,
      visibility: upload.visibility,
      quotaUnits: upload.quotaUnits,
    }, upload.videoId);

    if (schedule.mode === "scheduled") {
      await provider.schedule({ videoId: upload.videoId, schedule });
      audit.record("schedule", provider.id, {
        publishAt: schedule.publishAt,
        mode: schedule.mode,
      }, upload.videoId);
    } else if (schedule.mode === "immediate" && schedule.visibility !== "draft") {
      const liveVisibility = schedule.visibility;
      await provider.publish({
        videoId: upload.videoId,
        visibility: liveVisibility,
        publishAt: schedule.publishAt,
      });
      audit.record("publish", provider.id, {
        visibility: liveVisibility,
      }, upload.videoId);
    }

    audit.record(
      "metadata_update",
      provider.id,
      { title: metadata.title, playlistId: metadata.playlistId },
      upload.videoId,
    );
    audit.record(
      "visibility_change",
      provider.id,
      { visibility: upload.visibility },
      upload.videoId,
    );

    const verifyStarted = Date.now();
    const verification = await verifyPublishedVideo({
      provider,
      videoId: upload.videoId,
      metadata,
      visibility: upload.visibility,
      durationSeconds: input.render.duration,
      width: input.render.resolution.width,
      height: input.render.resolution.height,
      thumbnail,
    });
    const verificationMs = Date.now() - verifyStarted;
    audit.record(
      "verify",
      provider.id,
      { ok: verification.ok, issues: verification.issues.length },
      upload.videoId,
    );

    const publishedAt =
      schedule.mode === "immediate" && schedule.visibility !== "draft"
        ? schedule.publishAt
        : schedule.mode === "scheduled"
          ? null
          : null;

    const persisted: PersistedPublishRecord = {
      id: `pv_${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 12)}`,
      videoId: upload.videoId,
      url: upload.url,
      uploadedAt: upload.uploadedAt,
      publishedAt,
      visibility: upload.visibility,
      metadata,
      provider: upload.provider,
      checksum: input.render.checksum,
      renderPackageId: input.render.id,
      contentPackageTopicId: input.content.topic.id,
      idempotencyKey,
      retryHistory: retryResult.attempts,
      thumbnail,
      schedule,
    };
    this.store.save(persisted);

    notifications.push(
      ...(await this.notifications.notify(settings.notificationChannels, "success", {
        title: "Upload succeeded",
        body: `${metadata.title} uploaded as ${upload.videoId}`,
        videoId: upload.videoId,
        url: upload.url,
      })),
    );
    if (schedule.mode === "immediate" && schedule.visibility !== "private" && schedule.visibility !== "draft") {
      notifications.push(
        ...(await this.notifications.notify(settings.notificationChannels, "published", {
          title: "Video published",
          body: upload.url,
          videoId: upload.videoId,
          url: upload.url,
        })),
      );
    }

    const publishingTelemetry = buildPublishingTelemetry({
      uploadDurationMs: Date.now() - started,
      apiLatencyMs: upload.apiLatencyMs,
      retries: retryResult.attempts.length,
      quotaUnits: upload.quotaUnits,
      failures: retryResult.failures,
      provider: upload.provider,
      verificationMs,
    });

    const video: PublishedVideo = {
      id: persisted.id,
      version: PUBLISHED_VIDEO_VERSION,
      videoId: upload.videoId,
      url: upload.url,
      publishedAt,
      uploadedAt: upload.uploadedAt,
      visibility: upload.visibility,
      metadata,
      provider: upload.provider,
      thumbnail,
      schedule,
      verification,
      retryHistory: retryResult.attempts,
      notifications,
      auditLog: audit.list(),
      checksum: input.render.checksum,
      renderPackageId: input.render.id,
      telemetry: publishingTelemetry,
    };

    const event = createTelemetryEvent({
      name: "publishing.publish",
      generationTimeMs: Date.now() - started,
      provider: upload.provider,
      errors: verification.ok ? [] : verification.issues,
      retryCount: retryResult.attempts.length,
      cacheHit: false,
      topicId: input.content.topic.id,
      metadata: {
        uploadDurationMs: publishingTelemetry.uploadDurationMs,
        apiLatencyMs: publishingTelemetry.apiLatencyMs,
        retries: publishingTelemetry.retries,
        quotaUnits: publishingTelemetry.quotaUnits,
        failures: publishingTelemetry.failures,
        videoId: upload.videoId,
      },
    });
    this.telemetry.record(event);

    return { video, telemetry: event, idempotentReplay: false };
  }
}

function buildIdempotencyKey(
  renderId: string,
  checksum: string,
  topicId: string,
): string {
  return createHash("sha256")
    .update(`${renderId}|${checksum}|${topicId}|${PUBLISHED_VIDEO_VERSION}`)
    .digest("hex");
}

function toPublishedVideo(
  record: PersistedPublishRecord,
  extras: {
    notifications: NotificationDelivery[];
    auditLog: PublishedVideo["auditLog"];
    verification: PublishedVideo["verification"];
    telemetry: PublishedVideo["telemetry"];
  },
): PublishedVideo {
  return {
    id: record.id,
    version: PUBLISHED_VIDEO_VERSION,
    videoId: record.videoId,
    url: record.url,
    publishedAt: record.publishedAt,
    uploadedAt: record.uploadedAt,
    visibility: record.visibility,
    metadata: record.metadata,
    provider: record.provider,
    thumbnail: record.thumbnail,
    schedule: record.schedule,
    verification: extras.verification,
    retryHistory: record.retryHistory as RetryAttempt[],
    notifications: extras.notifications,
    auditLog: extras.auditLog,
    checksum: record.checksum,
    renderPackageId: record.renderPackageId,
    telemetry: extras.telemetry,
  };
}
