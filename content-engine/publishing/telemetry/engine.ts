import type {
  PublishingProviderId,
  PublishingTelemetry,
} from "../../types/published-video.js";

export function buildPublishingTelemetry(input: {
  uploadDurationMs: number;
  apiLatencyMs: number;
  retries: number;
  quotaUnits: number;
  failures: number;
  provider: PublishingProviderId;
  verificationMs: number;
}): PublishingTelemetry {
  return {
    uploadDurationMs: input.uploadDurationMs,
    apiLatencyMs: input.apiLatencyMs,
    retries: input.retries,
    quotaUnits: input.quotaUnits,
    failures: input.failures,
    provider: input.provider,
    verificationMs: input.verificationMs,
  };
}
