import { ContentEngineError } from "./errors.js";
import type {
  AIGenerateRequest,
  AIGenerateResult,
  AIHealthStatus,
  AIProvider,
} from "./provider.js";

export interface OpenAIProviderOptions {
  apiKey?: string;
  apiKeyEnv?: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * OpenAI-compatible chat completions provider.
 * Uses fetch only — no vendor SDK — so baseUrl can point at OpenAI or compatible gateways.
 */
export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: OpenAIProviderOptions = {}) {
    const envName = options.apiKeyEnv ?? "OPENAI_API_KEY";
    this.apiKey =
      options.apiKey ??
      process.env[envName] ??
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
      "";
    this.model = options.model ?? "gpt-4o-mini";
    this.baseUrl = (
      options.baseUrl ??
      process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ??
      "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  supportsStreaming(): boolean {
    return true;
  }

  supportsImages(): boolean {
    return true;
  }

  supportsJSON(): boolean {
    return true;
  }

  async health(): Promise<AIHealthStatus> {
    if (!this.apiKey) {
      return {
        ok: false,
        message: "OpenAI API key missing",
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      ok: true,
      message: `OpenAIProvider configured (model=${this.model})`,
      checkedAt: new Date().toISOString(),
    };
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
    if (!this.apiKey) {
      throw new ContentEngineError(
        "CONFIG_ERROR",
        "OpenAIProvider requires an API key",
        { recoverable: false },
      );
    }

    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const body: Record<string, unknown> = {
        model: this.model,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1800,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
      };

      if (request.responseFormat === "json") {
        body.response_format = { type: "json_object" };
      }

      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new ContentEngineError(
          response.status >= 500 ? "PROVIDER_UNAVAILABLE" : "UNKNOWN",
          `OpenAI-compatible provider error (${response.status}): ${errText.slice(0, 240)}`,
          {
            recoverable: response.status >= 500 || response.status === 429,
            details: { status: response.status },
          },
        );
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
        model?: string;
      };

      const text = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) {
        throw new ContentEngineError(
          "INVALID_JSON",
          "Provider returned empty content",
          { recoverable: true, details: { raw: json } },
        );
      }

      return {
        text,
        provider: this.id,
        model: json.model ?? this.model,
        usage: {
          promptTokens: json.usage?.prompt_tokens,
          completionTokens: json.usage?.completion_tokens,
          totalTokens: json.usage?.total_tokens,
        },
        latencyMs: Date.now() - started,
        raw: json,
      };
    } catch (error) {
      if (error instanceof ContentEngineError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ContentEngineError("PROVIDER_TIMEOUT", "OpenAIProvider timed out", {
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
