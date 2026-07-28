/** Provider-agnostic AI generation request. */
export interface AIGenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: "json" | "text";
  temperature?: number;
  maxTokens?: number;
  /** Opaque context for providers/mocks (never required for HTTP providers). */
  metadata?: Record<string, string>;
}

export interface AITokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AIGenerateResult {
  text: string;
  provider: string;
  model?: string;
  usage?: AITokenUsage;
  latencyMs: number;
  raw?: unknown;
}

export interface AIHealthStatus {
  ok: boolean;
  message?: string;
  checkedAt: string;
}

/**
 * AI provider contract.
 * Business logic must never call a vendor SDK directly — only this interface.
 */
export interface AIProvider {
  readonly id: string;
  generate(request: AIGenerateRequest): Promise<AIGenerateResult>;
  health(): Promise<AIHealthStatus>;
  supportsStreaming(): boolean;
  supportsImages(): boolean;
  supportsJSON(): boolean;
}
