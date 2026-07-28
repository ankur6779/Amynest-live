import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import {
  computeBackoffMs,
  GeminiVideoError,
  mapHttpError,
} from "./errors.js";

export interface GeminiVeoClientOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface StartVideoGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: "9:16" | "16:9";
  durationSeconds: 4 | 6 | 8;
  resolution: "720p" | "1080p";
  personGeneration: "allow_all" | "allow_adult" | "dont_allow";
  signal?: AbortSignal;
}

export interface VeoOperationStatus {
  name: string;
  done: boolean;
  error?: { code?: number; message?: string; status?: string };
  response?: unknown;
}

export interface VeoGeneratedSample {
  uri: string;
  mimeType?: string;
}

/**
 * Low-level Gemini/Veo HTTP client.
 * All Google-specific transport lives here — not in orchestration.
 */
export class GeminiVeoClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: GeminiVeoClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.model = options.model;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  async healthCheck(signal?: AbortSignal): Promise<{ ok: boolean; message: string }> {
    try {
      const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}`;
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: this.headers(),
        signal,
      });
      if (response.ok) {
        return { ok: true, message: `Veo model reachable (${this.model})` };
      }
      if (response.status === 404) {
        // Model metadata endpoint may 404 while predictLongRunning still works.
        return {
          ok: true,
          message: `API key accepted; model metadata unavailable (${this.model})`,
        };
      }
      const text = await response.text();
      if (response.status === 401 || response.status === 403) {
        return { ok: false, message: `Auth failed: ${text.slice(0, 160)}` };
      }
      return {
        ok: true,
        message: `API reachable (status ${response.status})`,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async startGeneration(
    request: StartVideoGenerationRequest,
  ): Promise<{ operationName: string }> {
    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:predictLongRunning`;
    const body = {
      instances: [
        {
          prompt: request.prompt,
        },
      ],
      parameters: {
        aspectRatio: request.aspectRatio,
        durationSeconds: String(request.durationSeconds),
        personGeneration: request.personGeneration,
        resolution: request.resolution,
        ...(request.negativePrompt
          ? { negativePrompt: request.negativePrompt }
          : {}),
      },
    };

    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: this.headers({ json: true }),
      body: JSON.stringify(body),
      signal: request.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw mapHttpError(response.status, text, "startGeneration");
    }

    let payload: { name?: string };
    try {
      payload = JSON.parse(text) as { name?: string };
    } catch {
      throw new GeminiVideoError(
        "OPERATION_FAILED",
        "Invalid JSON from Veo startGeneration",
        { recoverable: true, details: { text: text.slice(0, 200) } },
      );
    }

    if (!payload.name) {
      throw new GeminiVideoError(
        "OPERATION_FAILED",
        "Veo startGeneration returned no operation name",
        { recoverable: true, details: { text: text.slice(0, 200) } },
      );
    }

    return { operationName: payload.name };
  }

  async getOperation(
    operationName: string,
    signal?: AbortSignal,
  ): Promise<VeoOperationStatus> {
    const url = operationName.startsWith("http")
      ? operationName
      : `${this.baseUrl}/${operationName.replace(/^\//, "")}`;
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: this.headers(),
      signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw mapHttpError(response.status, text, "getOperation");
    }
    return JSON.parse(text) as VeoOperationStatus;
  }

  async cancelOperation(
    operationName: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const url = operationName.startsWith("http")
      ? `${operationName}:cancel`
      : `${this.baseUrl}/${operationName.replace(/^\//, "")}:cancel`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: this.headers({ json: true }),
      body: JSON.stringify({}),
      signal,
    });
    if (!response.ok && response.status !== 404 && response.status !== 400) {
      const text = await response.text();
      throw mapHttpError(response.status, text, "cancelOperation");
    }
  }

  async pollUntilComplete(options: {
    operationName: string;
    pollingIntervalMs: number;
    maxPollAttempts: number;
    timeoutMs: number;
    signal?: AbortSignal;
    onPoll?: (status: VeoOperationStatus, attempt: number) => void;
  }): Promise<{ status: VeoOperationStatus; pollAttempts: number; sample: VeoGeneratedSample }> {
    const started = Date.now();
    let attempts = 0;

    while (attempts < options.maxPollAttempts) {
      if (options.signal?.aborted) {
        throw new GeminiVideoError(
          "OPERATION_CANCELLED",
          "Veo polling cancelled",
          { recoverable: false },
        );
      }
      if (Date.now() - started > options.timeoutMs) {
        throw new GeminiVideoError(
          "PROVIDER_TIMEOUT",
          `Veo operation timed out after ${options.timeoutMs}ms`,
          { recoverable: true, details: { operationName: options.operationName } },
        );
      }

      attempts += 1;
      const status = await this.getOperation(options.operationName, options.signal);
      options.onPoll?.(status, attempts);

      if (status.done) {
        if (status.error?.message) {
          throw new GeminiVideoError(
            "OPERATION_FAILED",
            status.error.message,
            {
              recoverable: false,
              details: {
                code: status.error.code,
                status: status.error.status,
              },
            },
          );
        }
        const sample = extractSample(status.response);
        if (!sample) {
          throw new GeminiVideoError(
            "OPERATION_FAILED",
            "Veo operation completed without a video sample",
            { recoverable: false, details: { response: status.response } },
          );
        }
        return { status, pollAttempts: attempts, sample };
      }

      await this.sleep(options.pollingIntervalMs);
    }

    throw new GeminiVideoError(
      "PROVIDER_TIMEOUT",
      `Veo polling exhausted after ${attempts} attempts`,
      { recoverable: true },
    );
  }

  async downloadVideo(options: {
    uri: string;
    outputPath: string;
    signal?: AbortSignal;
  }): Promise<void> {
    await mkdir(dirname(options.outputPath), { recursive: true });
    const response = await this.fetchImpl(options.uri, {
      method: "GET",
      headers: this.headers(),
      signal: options.signal,
      redirect: "follow",
    });
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw mapHttpError(response.status || 500, text, "downloadVideo");
    }

    const nodeStream = Readable.fromWeb(
      response.body as import("node:stream/web").ReadableStream,
    );
    await pipeline(nodeStream, createWriteStream(options.outputPath));
  }

  async withRetries<T>(
    operation: () => Promise<T>,
    retryCount: number,
    signal?: AbortSignal,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      if (signal?.aborted) {
        throw new GeminiVideoError(
          "OPERATION_CANCELLED",
          "Veo request cancelled before retry",
          { recoverable: false },
        );
      }
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const recoverable =
          error instanceof GeminiVideoError ? error.recoverable : true;
        if (!recoverable || attempt >= retryCount) break;
        await this.sleep(computeBackoffMs(attempt));
      }
    }
    if (lastError instanceof GeminiVideoError) throw lastError;
    throw new GeminiVideoError(
      "RETRY_EXHAUSTED",
      lastError instanceof Error ? lastError.message : "Veo retries exhausted",
      { recoverable: false, cause: lastError },
    );
  }

  buildOutputPath(outputDirectory: string, assetId: string): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return join(outputDirectory, `${assetId}-${stamp}.mp4`);
  }

  private headers(options: { json?: boolean } = {}): Record<string, string> {
    const headers: Record<string, string> = {
      "x-goog-api-key": this.apiKey,
    };
    if (options.json) headers["Content-Type"] = "application/json";
    return headers;
  }
}

function extractSample(response: unknown): VeoGeneratedSample | null {
  if (!response || typeof response !== "object") return null;
  const root = response as Record<string, unknown>;

  const generateVideoResponse =
    (root.generateVideoResponse as Record<string, unknown> | undefined) ??
    (root.generateVideo as Record<string, unknown> | undefined) ??
    root;

  const samples =
    (generateVideoResponse.generatedSamples as Array<Record<string, unknown>> | undefined) ??
    (generateVideoResponse.videos as Array<Record<string, unknown>> | undefined) ??
    [];

  const first = samples[0];
  if (!first) {
    // Some responses nest video directly.
    const video = generateVideoResponse.video as Record<string, unknown> | undefined;
    if (video?.uri && typeof video.uri === "string") {
      return {
        uri: video.uri,
        mimeType: typeof video.mimeType === "string" ? video.mimeType : "video/mp4",
      };
    }
    return null;
  }

  const video = (first.video as Record<string, unknown> | undefined) ?? first;
  const uri =
    (typeof video.uri === "string" && video.uri) ||
    (typeof first.uri === "string" && first.uri) ||
    "";
  if (!uri) return null;
  return {
    uri,
    mimeType:
      (typeof video.mimeType === "string" && video.mimeType) ||
      (typeof first.mimeType === "string" && first.mimeType) ||
      "video/mp4",
  };
}
