import { createHash } from "node:crypto";
import type {
  PublishRequest,
  PublishingProviderHealth,
  ScheduleRequest,
  UpdateRequest,
  UploadRequest,
  UploadResult,
  VerifyRequest,
  PublishVerificationReport,
  VideoVisibility,
} from "../../types/published-video.js";
import { PublishingError } from "./errors.js";
import type { PublishingProvider } from "./types.js";

export interface MockPublishingProviderOptions {
  /** Force the next N upload attempts to fail with a retryable network error. */
  failUploads?: number;
  failWith?: "network" | "quota";
  latencyMs?: number;
}

/**
 * Deterministic publishing provider for tests and offline CI.
 * Simulates upload, schedule, verify, and metadata updates in-memory.
 */
export class MockPublishingProvider implements PublishingProvider {
  readonly id = "mock" as const;
  private readonly videos = new Map<string, StoredVideo>();
  private readonly byIdempotency = new Map<string, string>();
  private failUploads: number;
  private readonly failWith: "network" | "quota";
  private readonly latencyMs: number;

  constructor(options: MockPublishingProviderOptions = {}) {
    this.failUploads = options.failUploads ?? 0;
    this.failWith = options.failWith ?? "network";
    this.latencyMs = options.latencyMs ?? 1;
  }

  async health(): Promise<PublishingProviderHealth> {
    return {
      ok: true,
      message: "MockPublishingProvider ready",
      checkedAt: new Date().toISOString(),
      quotaRemaining: 10_000,
    };
  }

  async upload(request: UploadRequest): Promise<UploadResult> {
    await delay(this.latencyMs);

    const existingId = this.byIdempotency.get(request.idempotencyKey);
    if (existingId) {
      const existing = this.videos.get(existingId);
      if (existing) return toUploadResult(existing, this.latencyMs);
    }

    if (this.failUploads > 0) {
      this.failUploads -= 1;
      throw new PublishingError(
        this.failWith,
        this.failWith === "quota"
          ? "Mock YouTube quota exceeded"
          : "Mock network failure during upload",
        { retryable: true },
      );
    }

    const videoId = `mock_${createHash("sha256")
      .update(request.idempotencyKey)
      .digest("hex")
      .slice(0, 11)}`;
    const uploadedAt = new Date().toISOString();
    const visibility = resolveUploadVisibility(request);
    const stored: StoredVideo = {
      videoId,
      url: `https://youtube.com/shorts/${videoId}`,
      uploadedAt,
      visibility,
      metadata: { ...request.metadata, visibility },
      thumbnailPath: request.thumbnailPath,
      thumbnailApplied: Boolean(request.thumbnailPath),
      durationSeconds: request.durationSeconds,
      width: request.width,
      height: request.height,
      checksum: request.checksum,
      publishAt: request.schedule.publishAt,
      deleted: false,
      provider: this.id,
      apiLatencyMs: this.latencyMs,
      quotaUnits: 1600,
    };
    this.videos.set(videoId, stored);
    this.byIdempotency.set(request.idempotencyKey, videoId);
    return toUploadResult(stored, this.latencyMs);
  }

  async update(request: UpdateRequest): Promise<UploadResult> {
    await delay(this.latencyMs);
    const video = this.requireVideo(request.videoId);
    video.metadata = {
      ...video.metadata,
      ...request.metadata,
      tags: request.metadata.tags ?? video.metadata.tags,
    };
    if (request.metadata.visibility) video.visibility = request.metadata.visibility;
    return toUploadResult(video, this.latencyMs);
  }

  async delete(videoId: string): Promise<boolean> {
    await delay(this.latencyMs);
    const video = this.videos.get(videoId);
    if (!video || video.deleted) return false;
    video.deleted = true;
    return true;
  }

  async schedule(request: ScheduleRequest): Promise<UploadResult> {
    await delay(this.latencyMs);
    const video = this.requireVideo(request.videoId);
    video.publishAt = request.schedule.publishAt;
    video.visibility =
      request.schedule.mode === "draft" ? "draft" : request.schedule.visibility;
    video.metadata.visibility = video.visibility;
    return toUploadResult(video, this.latencyMs);
  }

  async publish(request: PublishRequest): Promise<UploadResult> {
    await delay(this.latencyMs);
    const video = this.requireVideo(request.videoId);
    video.visibility = request.visibility;
    video.metadata.visibility = request.visibility;
    video.publishAt = request.publishAt ?? new Date().toISOString();
    return toUploadResult(video, this.latencyMs);
  }

  async verify(request: VerifyRequest): Promise<PublishVerificationReport> {
    await delay(this.latencyMs);
    const video = this.videos.get(request.videoId);
    const issues: string[] = [];
    const videoExists = Boolean(video) && !video?.deleted;
    if (!videoExists) issues.push("video does not exist");

    const thumbnailApplied =
      videoExists &&
      (request.expected.thumbnailPath ? Boolean(video?.thumbnailApplied) : true);
    if (videoExists && request.expected.thumbnailPath && !thumbnailApplied) {
      issues.push("thumbnail not applied");
    }

    const metadataApplied =
      videoExists && video!.metadata.title === request.expected.title;
    if (videoExists && !metadataApplied) issues.push("metadata title mismatch");

    const visibilityCorrect =
      videoExists && video!.visibility === request.expected.visibility;
    if (videoExists && !visibilityCorrect) issues.push("visibility mismatch");

    const durationMatch =
      videoExists &&
      Math.abs(video!.durationSeconds - request.expected.durationSeconds) <= 0.5;
    if (videoExists && !durationMatch) issues.push("duration mismatch");

    const resolutionMatch =
      videoExists &&
      video!.width === request.expected.width &&
      video!.height === request.expected.height;
    if (videoExists && !resolutionMatch) issues.push("resolution mismatch");

    return {
      ok: issues.length === 0,
      videoExists,
      thumbnailApplied,
      metadataApplied,
      visibilityCorrect,
      durationMatch,
      resolutionMatch,
      issues,
      checkedAt: new Date().toISOString(),
    };
  }

  private requireVideo(videoId: string): StoredVideo {
    const video = this.videos.get(videoId);
    if (!video || video.deleted) {
      throw new PublishingError("not_found", `Video not found: ${videoId}`, {
        retryable: false,
      });
    }
    return video;
  }
}

interface StoredVideo {
  videoId: string;
  url: string;
  uploadedAt: string;
  visibility: VideoVisibility;
  metadata: UploadRequest["metadata"];
  thumbnailPath: string | null;
  thumbnailApplied: boolean;
  durationSeconds: number;
  width: number;
  height: number;
  checksum: string;
  publishAt: string | null;
  deleted: boolean;
  provider: "mock";
  apiLatencyMs: number;
  quotaUnits: number;
}

function resolveUploadVisibility(request: UploadRequest): VideoVisibility {
  if (request.schedule.mode === "draft") return "draft";
  if (request.schedule.mode === "scheduled") return "private";
  return request.metadata.visibility;
}

function toUploadResult(video: StoredVideo, latencyMs: number): UploadResult {
  return {
    videoId: video.videoId,
    url: video.url,
    uploadedAt: video.uploadedAt,
    visibility: video.visibility,
    provider: video.provider,
    apiLatencyMs: latencyMs,
    quotaUnits: video.quotaUnits,
    thumbnailApplied: video.thumbnailApplied,
  };
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
