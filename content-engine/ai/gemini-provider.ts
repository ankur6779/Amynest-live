import { ContentEngineError } from "./errors.js";
import type {
  AIGenerateRequest,
  AIGenerateResult,
  AIHealthStatus,
  AIProvider,
} from "./provider.js";

export interface GeminiProviderOptions {
  apiKey?: string;
  apiKeyEnv?: string;
  model?: string;
  fallbackModel?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Google Gemini generateContent provider for script generation.
 * Uses the same GEMINI_API_KEY as Veo/Imagen/TTS.
 */
export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallbackModel: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: GeminiProviderOptions = {}) {
    const envName = options.apiKeyEnv ?? "GEMINI_API_KEY";
    this.apiKey =
      options.apiKey !== undefined
        ? options.apiKey.trim()
        : process.env[envName]?.trim() ||
          process.env.GOOGLE_AI_API_KEY?.trim() ||
          "";
    this.model = options.model ?? process.env.AMYNEST_GEMINI_SCRIPT_MODEL ?? "gemini-3.6-flash";
    this.fallbackModel =
      options.fallbackModel ??
      process.env.AMYNEST_GEMINI_SCRIPT_FALLBACK_MODEL ??
      "gemini-3.1-flash-lite";
    this.baseUrl = (
      options.baseUrl ??
      process.env.AMYNEST_GEMINI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 45_000;
  }

  supportsStreaming(): boolean {
    return false;
  }

  supportsImages(): boolean {
    return false;
  }

  supportsJSON(): boolean {
    return true;
  }

  async health(): Promise<AIHealthStatus> {
    if (!this.apiKey) {
      return {
        ok: false,
        message: "GEMINI_API_KEY missing",
        checkedAt: new Date().toISOString(),
      };
    }
    const started = Date.now();
    try {
      const response = await this.fetchImpl(
        `${this.baseUrl}/models/${encodeURIComponent(this.model)}`,
        { headers: { "x-goog-api-key": this.apiKey } },
      );
      if (response.ok || response.status === 404) {
        return {
          ok: true,
          message: `GeminiProvider configured (model=${this.model}, ${Date.now() - started}ms)`,
          checkedAt: new Date().toISOString(),
        };
      }
      const text = await response.text();
      return {
        ok: response.status !== 401 && response.status !== 403,
        message: `Gemini health ${response.status}: ${text.slice(0, 120)}`,
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

  async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
    if (!this.apiKey) {
      throw new ContentEngineError(
        "CONFIG_ERROR",
        "GeminiProvider requires GEMINI_API_KEY",
        { recoverable: true },
      );
    }

    const models = [this.model, this.fallbackModel].filter(
      (m, i, arr) => m && arr.indexOf(m) === i,
    );
    let lastError: unknown;
    for (const model of models) {
      try {
        return await this.generateWithModel(model, request);
      } catch (error) {
        lastError = error;
        if (error instanceof ContentEngineError && !error.recoverable) {
          throw error;
        }
      }
    }
    if (lastError instanceof ContentEngineError) throw lastError;
    throw new ContentEngineError(
      "PROVIDER_UNAVAILABLE",
      lastError instanceof Error ? lastError.message : "Gemini generate failed",
      { recoverable: true, cause: lastError },
    );
  }

  private async generateWithModel(
    model: string,
    request: AIGenerateRequest,
  ): Promise<AIGenerateResult> {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const body: Record<string, unknown> = {
        systemInstruction: { parts: [{ text: request.systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [{ text: request.userPrompt }],
          },
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 1800,
          ...(request.responseFormat === "json"
            ? { responseMimeType: "application/json" }
            : {}),
        },
      };

      const response = await this.fetchImpl(
        `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );

      const rawText = await response.text();
      if (!response.ok) {
        throw new ContentEngineError(
          response.status === 429 || response.status >= 500
            ? "PROVIDER_UNAVAILABLE"
            : "UNKNOWN",
          `Gemini error (${response.status}): ${rawText.slice(0, 240)}`,
          {
            recoverable: response.status === 429 || response.status >= 500,
            details: { status: response.status, model },
          },
        );
      }

      const json = JSON.parse(rawText) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
        modelVersion?: string;
      };

      const text =
        json.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("")
          .trim() ?? "";
      if (!text) {
        throw new ContentEngineError(
          "INVALID_JSON",
          "Gemini returned empty content",
          { recoverable: true, details: { model } },
        );
      }

      return {
        text,
        provider: this.id,
        model: json.modelVersion ?? model,
        usage: {
          promptTokens: json.usageMetadata?.promptTokenCount,
          completionTokens: json.usageMetadata?.candidatesTokenCount,
          totalTokens: json.usageMetadata?.totalTokenCount,
        },
        latencyMs: Date.now() - started,
        raw: json,
      };
    } catch (error) {
      if (error instanceof ContentEngineError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ContentEngineError("PROVIDER_TIMEOUT", "GeminiProvider timed out", {
          recoverable: true,
          cause: error,
        });
      }
      throw new ContentEngineError(
        "PROVIDER_UNAVAILABLE",
        error instanceof Error ? error.message : String(error),
        { recoverable: true, cause: error },
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
