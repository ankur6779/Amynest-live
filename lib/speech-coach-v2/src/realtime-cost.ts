/** OpenAI gpt-realtime published audio/text token rates (USD per 1M tokens). */
export const GPT_REALTIME_PRICING_USD = {
  audioInputPer1M: 32,
  audioOutputPer1M: 64,
  cachedAudioInputPer1M: 0.4,
  textInputPer1M: 4,
  cachedTextInputPer1M: 0.4,
  textOutputPer1M: 24,
} as const;

export const DEFAULT_USD_TO_INR = 85;

export interface RealtimeUsageDelta {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputAudioTokens: number;
  outputAudioTokens: number;
  cachedInputTokens: number;
  inputTextTokens: number;
  outputTextTokens: number;
}

export interface RealtimeCostEstimate {
  costUsd: number;
  costInr: number;
}

export const EMPTY_REALTIME_USAGE_DELTA: RealtimeUsageDelta = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  inputAudioTokens: 0,
  outputAudioTokens: 0,
  cachedInputTokens: 0,
  inputTextTokens: 0,
  outputTextTokens: 0,
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Parse token usage from an OpenAI Realtime `response.done` event payload. */
export function parseRealtimeResponseUsage(
  payload: Record<string, unknown>,
): RealtimeUsageDelta | null {
  const response = payload.response as Record<string, unknown> | undefined;
  const usage = (response?.usage ?? payload.usage) as Record<string, unknown> | undefined;
  if (!usage) return null;

  const inputDetails = usage.input_token_details as Record<string, unknown> | undefined;
  const outputDetails = usage.output_token_details as Record<string, unknown> | undefined;

  const inputTokens = num(usage.input_tokens);
  const outputTokens = num(usage.output_tokens);
  const totalTokens = num(usage.total_tokens) || inputTokens + outputTokens;
  if (totalTokens <= 0 && inputTokens <= 0 && outputTokens <= 0) return null;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    inputAudioTokens: num(inputDetails?.audio_tokens),
    outputAudioTokens: num(outputDetails?.audio_tokens),
    cachedInputTokens: num(inputDetails?.cached_tokens),
    inputTextTokens: num(inputDetails?.text_tokens),
    outputTextTokens: num(outputDetails?.text_tokens),
  };
}

export function mergeRealtimeUsageDelta(
  base: RealtimeUsageDelta,
  delta: RealtimeUsageDelta,
): RealtimeUsageDelta {
  return {
    inputTokens: base.inputTokens + delta.inputTokens,
    outputTokens: base.outputTokens + delta.outputTokens,
    totalTokens: base.totalTokens + delta.totalTokens,
    inputAudioTokens: base.inputAudioTokens + delta.inputAudioTokens,
    outputAudioTokens: base.outputAudioTokens + delta.outputAudioTokens,
    cachedInputTokens: base.cachedInputTokens + delta.cachedInputTokens,
    inputTextTokens: base.inputTextTokens + delta.inputTextTokens,
    outputTextTokens: base.outputTextTokens + delta.outputTextTokens,
  };
}

/** Estimate OpenAI Realtime cost from token breakdown (gpt-realtime rates). */
export function estimateRealtimeCostUsd(
  usage: RealtimeUsageDelta,
  usdToInr = DEFAULT_USD_TO_INR,
): RealtimeCostEstimate {
  const hasBreakdown =
    usage.inputAudioTokens > 0
    || usage.outputAudioTokens > 0
    || usage.inputTextTokens > 0
    || usage.outputTextTokens > 0;

  let costUsd = 0;

  if (hasBreakdown) {
    const cachedAudio = Math.min(usage.cachedInputTokens, usage.inputAudioTokens);
    const uncachedAudioInput = Math.max(0, usage.inputAudioTokens - cachedAudio);
    const cachedText = Math.max(0, usage.cachedInputTokens - cachedAudio);

    costUsd +=
      (uncachedAudioInput * GPT_REALTIME_PRICING_USD.audioInputPer1M) / 1_000_000
      + (cachedAudio * GPT_REALTIME_PRICING_USD.cachedAudioInputPer1M) / 1_000_000
      + (usage.outputAudioTokens * GPT_REALTIME_PRICING_USD.audioOutputPer1M) / 1_000_000
      + (usage.inputTextTokens * GPT_REALTIME_PRICING_USD.textInputPer1M) / 1_000_000
      + (cachedText * GPT_REALTIME_PRICING_USD.cachedTextInputPer1M) / 1_000_000
      + (usage.outputTextTokens * GPT_REALTIME_PRICING_USD.textOutputPer1M) / 1_000_000;
  } else {
    costUsd +=
      (usage.inputTokens * GPT_REALTIME_PRICING_USD.audioInputPer1M) / 1_000_000
      + (usage.outputTokens * GPT_REALTIME_PRICING_USD.audioOutputPer1M) / 1_000_000;
  }

  return {
    costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
    costInr: Math.round(costUsd * usdToInr * 100) / 100,
  };
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))] ?? 0;
}
