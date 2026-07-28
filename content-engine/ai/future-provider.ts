import { ContentEngineError } from "./errors.js";
import type {
  AIGenerateRequest,
  AIGenerateResult,
  AIHealthStatus,
  AIProvider,
} from "./provider.js";

/**
 * Extension point for future vendors (Gemini, Anthropic, local models, etc.).
 * Registered in the provider registry; activate by implementing generate().
 */
export class FutureProvider implements AIProvider {
  readonly id = "future";

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
    return {
      ok: false,
      message: "FutureProvider is a reserved extension slot — not configured",
      checkedAt: new Date().toISOString(),
    };
  }

  async generate(_request: AIGenerateRequest): Promise<AIGenerateResult> {
    throw new ContentEngineError(
      "PROVIDER_UNAVAILABLE",
      "FutureProvider is not configured. Register a concrete provider implementation.",
      { recoverable: true },
    );
  }
}
