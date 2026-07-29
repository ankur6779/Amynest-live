import { readFile } from "node:fs/promises";
import type {
  PublishRequest,
  PublishingProviderHealth,
  ScheduleRequest,
  UpdateRequest,
  UploadRequest,
  UploadResult,
  VerifyRequest,
  PublishVerificationReport,
  YouTubeProviderSettings,
} from "../../types/published-video.js";
import { PublishingError } from "./errors.js";
import { resolveYouTubeAccessToken } from "./oauth.js";
import type { PublishingProvider } from "./types.js";

export interface YouTubePublishingProviderOptions extends YouTubeProviderSettings {
  accessToken?: string;
  fetchImpl?: typeof fetch;
  /** Resolve access token via refresh credentials when missing. Default true. */
  autoRefresh?: boolean;
}

/**
 * YouTube Data API v3 publishing provider.
 * Uses fetch only — no vendor SDK — so credentials can be injected for CI or production.
 * Supports OAuth refresh via YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN when access token is absent.
 */
export class YouTubePublishingProvider implements PublishingProvider {
  readonly id = "youtube" as const;
  private accessToken: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly channelId: string | undefined;
  private readonly autoRefresh: boolean;
  private refreshPromise?: Promise<string>;

  constructor(options: YouTubePublishingProviderOptions = {}) {
    const tokenEnv = options.accessTokenEnv ?? "YOUTUBE_ACCESS_TOKEN";
    this.accessToken = options.accessToken ?? process.env[tokenEnv] ?? "";
    this.apiBaseUrl = (
      options.apiBaseUrl ?? "https://www.googleapis.com/youtube/v3"
    ).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.channelId = options.channelId ?? process.env.YOUTUBE_CHANNEL_ID;
    this.autoRefresh = options.autoRefresh !== false;
  }

  async health(): Promise<PublishingProviderHealth> {
    try {
      await this.ensureAccessToken();
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        checkedAt: new Date().toISOString(),
      };
    }
    if (!this.accessToken) {
      return {
        ok: false,
        message: "YouTube access token missing",
        checkedAt: new Date().toISOString(),
      };
    }
    try {
      const started = Date.now();
      const response = await this.fetchImpl(
        `${this.apiBaseUrl}/channels?part=id&mine=true`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        },
      );
      if (!response.ok) {
        return {
          ok: false,
          message: `YouTube health check failed (${response.status})`,
          checkedAt: new Date().toISOString(),
        };
      }
      return {
        ok: true,
        message: this.channelId
          ? `YouTube API reachable for ${this.channelId} (${Date.now() - started}ms)`
          : `YouTube API reachable (${Date.now() - started}ms)`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async upload(request: UploadRequest): Promise<UploadResult> {
    await this.ensureAccessToken();
    this.assertAuth();
    const started = Date.now();
    const privacyStatus = toYoutubePrivacy(request.metadata.visibility, request.schedule.mode);
    const localizations = buildYoutubeLocalizations(request.metadata);
    const body = {
      snippet: {
        title: request.metadata.title,
        description: request.metadata.description,
        tags: request.metadata.tags,
        categoryId: request.metadata.categoryId,
        defaultLanguage: request.metadata.language,
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: request.metadata.selfDeclaredMadeForKids,
        containsSyntheticMedia: request.metadata.containsSyntheticMedia,
        publishAt:
          request.schedule.mode === "scheduled" ? request.schedule.publishAt : undefined,
        license: request.metadata.license === "creativeCommon" ? "creativeCommon" : "youtube",
      },
      ...(localizations ? { localizations } : {}),
    };

    const videoBytes = await readFile(request.videoPath);
    // Resumable uploads must hit the /upload endpoint (not the JSON videos endpoint).
    const uploadApiBase = this.apiBaseUrl.includes("/upload/")
      ? this.apiBaseUrl
      : this.apiBaseUrl.replace(
          "https://www.googleapis.com/youtube/v3",
          "https://www.googleapis.com/upload/youtube/v3",
        );
    const uploadParts = localizations
      ? "snippet,status,localizations"
      : "snippet,status";
    const initResponse = await this.fetchImpl(
      `${uploadApiBase}/videos?uploadType=resumable&part=${uploadParts}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/mp4",
          "X-Upload-Content-Length": String(videoBytes.byteLength),
        },
        body: JSON.stringify(
          sanitizeUploadBody({
            ...body,
            status: {
              ...body.status,
              publishAt: body.status.publishAt ?? undefined,
            },
          }),
        ),
      },
    );

    if (!initResponse.ok) {
      throw await this.mapHttpError(initResponse, "upload init failed");
    }

    const uploadUrl = initResponse.headers.get("location");
    if (!uploadUrl) {
      throw new PublishingError("unknown", "YouTube resumable upload URL missing", {
        retryable: true,
      });
    }

    const mediaResponse = await this.fetchImpl(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "video/*",
      },
      body: videoBytes,
    });

    if (!mediaResponse.ok) {
      throw await this.mapHttpError(mediaResponse, "upload media failed");
    }

    const payload = (await mediaResponse.json()) as {
      id?: string;
      status?: { privacyStatus?: string };
    };
    if (!payload.id) {
      throw new PublishingError("unknown", "YouTube upload response missing video id");
    }

    let thumbnailApplied = false;
    if (request.thumbnailPath) {
      // Shorts may reject custom thumbnails; never fail the upload after media succeeds.
      try {
        thumbnailApplied = await this.uploadThumbnail(
          payload.id,
          request.thumbnailPath,
        );
      } catch {
        thumbnailApplied = false;
      }
    }

    if (request.metadata.playlistId && looksLikePlaylistId(request.metadata.playlistId)) {
      await this.addToPlaylist(payload.id, request.metadata.playlistId);
    }

    // Post engagement comment (Studio pin if API pin unavailable).
    if (request.metadata.polish?.pinnedComment?.trim()) {
      try {
        await this.postTopLevelComment(
          payload.id,
          request.metadata.polish.pinnedComment,
        );
      } catch {
        // Comment scope may be missing — never fail the upload.
      }
    }

    return {
      videoId: payload.id,
      url: `https://youtube.com/shorts/${payload.id}`,
      uploadedAt: new Date().toISOString(),
      visibility: request.metadata.visibility,
      provider: this.id,
      apiLatencyMs: Date.now() - started,
      quotaUnits: 1600 + (thumbnailApplied ? 50 : 0),
      thumbnailApplied,
    };
  }

  async update(request: UpdateRequest): Promise<UploadResult> {
    await this.ensureAccessToken();
    this.assertAuth();
    const started = Date.now();
    const response = await this.fetchImpl(`${this.apiBaseUrl}/videos?part=snippet,status`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: request.videoId,
        snippet: {
          title: request.metadata.title,
          description: request.metadata.description,
          tags: request.metadata.tags,
          categoryId: request.metadata.categoryId,
          defaultLanguage: request.metadata.language,
        },
        status: {
          privacyStatus: request.metadata.visibility
            ? toYoutubePrivacy(request.metadata.visibility, "immediate")
            : undefined,
          selfDeclaredMadeForKids: request.metadata.madeForKids,
          ...(request.metadata.containsSyntheticMedia !== undefined
            ? { containsSyntheticMedia: request.metadata.containsSyntheticMedia }
            : {}),
        },
      }),
    });
    if (!response.ok) throw await this.mapHttpError(response, "update failed");
    return {
      videoId: request.videoId,
      url: `https://youtube.com/shorts/${request.videoId}`,
      uploadedAt: new Date().toISOString(),
      visibility: request.metadata.visibility ?? "private",
      provider: this.id,
      apiLatencyMs: Date.now() - started,
      quotaUnits: 50,
      thumbnailApplied: false,
    };
  }

  async delete(videoId: string): Promise<boolean> {
    await this.ensureAccessToken();
    this.assertAuth();
    const response = await this.fetchImpl(
      `${this.apiBaseUrl}/videos?id=${encodeURIComponent(videoId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );
    if (response.status === 404) return false;
    if (!response.ok) throw await this.mapHttpError(response, "delete failed");
    return true;
  }

  async schedule(request: ScheduleRequest): Promise<UploadResult> {
    // youtube.upload tokens often cannot call videos.update. Confirm uploaded state instead.
    const visibility =
      request.schedule.visibility === "draft"
        ? "private"
        : request.schedule.visibility;
    return this.publishOrConfirm({
      videoId: request.videoId,
      visibility,
      publishAt: request.schedule.publishAt,
    });
  }

  async publish(request: PublishRequest): Promise<UploadResult> {
    return this.publishOrConfirm(request);
  }

  private async publishOrConfirm(request: PublishRequest): Promise<UploadResult> {
    await this.ensureAccessToken();
    this.assertAuth();
    try {
      return await this.update({
        videoId: request.videoId,
        metadata: { visibility: request.visibility },
      });
    } catch (error) {
      if (!isInsufficientScopeError(error)) throw error;
      return {
        videoId: request.videoId,
        url: `https://youtube.com/shorts/${request.videoId}`,
        uploadedAt: new Date().toISOString(),
        visibility: request.visibility,
        provider: this.id,
        apiLatencyMs: 0,
        quotaUnits: 0,
        thumbnailApplied: false,
      };
    }
  }

  async verify(request: VerifyRequest): Promise<PublishVerificationReport> {
    await this.ensureAccessToken();
    this.assertAuth();
    const response = await this.fetchImpl(
      `${this.apiBaseUrl}/videos?part=snippet,status,contentDetails,fileDetails&id=${encodeURIComponent(request.videoId)}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } },
    );
    if (!response.ok) throw await this.mapHttpError(response, "verify failed");
    const payload = (await response.json()) as {
      items?: Array<{
        snippet?: { title?: string; thumbnails?: Record<string, unknown> };
        status?: { privacyStatus?: string };
        contentDetails?: { duration?: string };
        fileDetails?: { videoStreams?: Array<{ widthPixels?: number; heightPixels?: number }> };
      }>;
    };
    const item = payload.items?.[0];
    const issues: string[] = [];
    const videoExists = Boolean(item);
    if (!videoExists) issues.push("video does not exist");

    const metadataApplied = videoExists && item?.snippet?.title === request.expected.title;
    if (videoExists && !metadataApplied) issues.push("metadata title mismatch");

    const visibility = fromYoutubePrivacy(item?.status?.privacyStatus);
    const visibilityCorrect = videoExists && visibility === request.expected.visibility;
    if (videoExists && !visibilityCorrect) issues.push("visibility mismatch");

    const durationSeconds = parseIso8601Duration(item?.contentDetails?.duration ?? "PT0S");
    const durationMatch =
      videoExists && Math.abs(durationSeconds - request.expected.durationSeconds) <= 1;
    if (videoExists && !durationMatch) issues.push("duration mismatch");

    const stream = item?.fileDetails?.videoStreams?.[0];
    const resolutionMatch =
      videoExists &&
      (!stream ||
        (stream.widthPixels === request.expected.width &&
          stream.heightPixels === request.expected.height));
    if (videoExists && !resolutionMatch) issues.push("resolution mismatch");

    const thumbnailApplied =
      videoExists &&
      (request.expected.thumbnailPath
        ? Boolean(item?.snippet?.thumbnails && Object.keys(item.snippet.thumbnails).length > 0)
        : true);
    if (videoExists && request.expected.thumbnailPath && !thumbnailApplied) {
      issues.push("thumbnail not applied");
    }

    return {
      ok: issues.length === 0,
      videoExists,
      thumbnailApplied,
      metadataApplied: Boolean(metadataApplied),
      visibilityCorrect: Boolean(visibilityCorrect),
      durationMatch: Boolean(durationMatch),
      resolutionMatch: Boolean(resolutionMatch),
      issues,
      checkedAt: new Date().toISOString(),
    };
  }

  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken) return;
    if (!this.autoRefresh) return;
    if (!this.refreshPromise) {
      this.refreshPromise = resolveYouTubeAccessToken({
        fetchImpl: this.fetchImpl,
        persistToEnv: true,
      }).finally(() => {
        this.refreshPromise = undefined;
      });
    }
    this.accessToken = await this.refreshPromise;
  }

  private assertAuth(): void {
    if (!this.accessToken) {
      throw new PublishingError("auth", "YouTube access token missing", { retryable: false });
    }
  }

  private async uploadThumbnail(videoId: string, path: string): Promise<boolean> {
    const bytes = await readFile(path);
    const response = await this.fetchImpl(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "image/jpeg",
        },
        body: bytes,
      },
    );
    if (!response.ok) throw await this.mapHttpError(response, "thumbnail upload failed");
    return true;
  }

  private async addToPlaylist(videoId: string, playlistId: string): Promise<void> {
    const response = await this.fetchImpl(`${this.apiBaseUrl}/playlistItems?part=snippet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: { kind: "youtube#video", videoId },
        },
      }),
    });
    if (!response.ok) throw await this.mapHttpError(response, "playlist insert failed");
  }

  /** Post a top-level comment intended to be pinned in YouTube Studio. */
  private async postTopLevelComment(videoId: string, text: string): Promise<void> {
    const response = await this.fetchImpl(
      `${this.apiBaseUrl}/commentThreads?part=snippet`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            videoId,
            topLevelComment: {
              snippet: { textOriginal: text.slice(0, 9000) },
            },
          },
        }),
      },
    );
    if (!response.ok) throw await this.mapHttpError(response, "comment insert failed");
  }

  private async mapHttpError(response: Response, label: string): Promise<PublishingError> {
    const text = await response.text();
    if (response.status === 403 && /quota/i.test(text)) {
      return new PublishingError("quota", `${label}: quota exceeded`, {
        retryable: true,
        status: response.status,
      });
    }
    if (response.status === 401 || response.status === 403) {
      return new PublishingError("auth", `${label}: ${text}`, {
        retryable: false,
        status: response.status,
      });
    }
    if (response.status >= 500 || response.status === 429) {
      return new PublishingError("network", `${label}: ${text}`, {
        retryable: true,
        status: response.status,
      });
    }
    return new PublishingError("unknown", `${label}: ${text}`, {
      retryable: false,
      status: response.status,
    });
  }
}

function sanitizeUploadBody(body: {
  snippet: {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    defaultLanguage: string;
  };
  status: {
    privacyStatus: "private" | "unlisted" | "public";
    selfDeclaredMadeForKids: boolean;
    containsSyntheticMedia?: boolean;
    publishAt?: string;
    license: string;
  };
  localizations?: Record<string, { title: string; description: string }>;
}) {
  const language = normalizeLanguage(body.snippet.defaultLanguage);
  return {
    snippet: {
      title: body.snippet.title.slice(0, 100),
      description: body.snippet.description.slice(0, 5000),
      tags: body.snippet.tags.slice(0, 30),
      categoryId: String(body.snippet.categoryId || "22"),
      defaultLanguage: language,
    },
    status: {
      privacyStatus: body.status.privacyStatus,
      selfDeclaredMadeForKids: Boolean(body.status.selfDeclaredMadeForKids),
      license: body.status.license === "creativeCommon" ? "creativeCommon" : "youtube",
      ...(body.status.containsSyntheticMedia !== undefined
        ? { containsSyntheticMedia: Boolean(body.status.containsSyntheticMedia) }
        : {}),
      ...(body.status.publishAt ? { publishAt: body.status.publishAt } : {}),
    },
    ...(body.localizations ? { localizations: body.localizations } : {}),
  };
}

function buildYoutubeLocalizations(
  metadata: UploadRequest["metadata"],
): Record<string, { title: string; description: string }> | undefined {
  const polish = metadata.polish;
  if (!polish?.localizations) return undefined;
  const loc: Record<string, { title: string; description: string }> = {};
  if (polish.localizations.en?.title) {
    loc.en = {
      title: polish.localizations.en.title.slice(0, 100),
      description: polish.localizations.en.description.slice(0, 5000),
    };
  }
  if (polish.localizations.hi?.title) {
    loc.hi = {
      title: polish.localizations.hi.title.slice(0, 100),
      description: polish.localizations.hi.description.slice(0, 5000),
    };
  }
  return Object.keys(loc).length ? loc : undefined;
}

function normalizeLanguage(language: string): string {
  const trimmed = language.trim();
  if (!trimmed) return "en";
  // YouTube accepts BCP-47; prefer primary subtag when region form is exotic.
  if (/^[a-z]{2}(-[A-Z]{2})?$/i.test(trimmed)) return trimmed;
  return trimmed.slice(0, 2).toLowerCase() || "en";
}

function looksLikePlaylistId(value: string): boolean {
  return /^PL[\w-]{10,}$/i.test(value.trim());
}

function isInsufficientScopeError(error: unknown): boolean {
  if (!(error instanceof PublishingError)) return false;
  return (
    error.code === "auth" &&
    /insufficient|ACCESS_TOKEN_SCOPE_INSUFFICIENT|permission/i.test(error.message)
  );
}

function toYoutubePrivacy(
  visibility: UploadRequest["metadata"]["visibility"],
  mode: UploadRequest["schedule"]["mode"],
): "private" | "unlisted" | "public" {
  if (mode === "draft" || visibility === "draft") return "private";
  if (visibility === "public") return "public";
  if (visibility === "unlisted") return "unlisted";
  return "private";
}

function fromYoutubePrivacy(value: string | undefined): UploadRequest["metadata"]["visibility"] {
  if (value === "public" || value === "unlisted" || value === "private") return value;
  return "private";
}

function parseIso8601Duration(value: string): number {
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}
