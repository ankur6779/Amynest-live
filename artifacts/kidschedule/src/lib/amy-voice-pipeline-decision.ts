/**
 * Pipeline decision debug logs — why each layer was tried/skipped before forced TTS.
 */

import { isCacheDisabled, isSafeModeActive } from "@/lib/admin-audio-ops";
import { shouldSkipLiveTtsApi } from "@/lib/amy-voice-circuit";
import { isStreamingTemporarilyDisabled } from "@/lib/amy-voice-audio-guard";
import { isApiGloballyDegraded } from "@/lib/amy-voice-pipeline-server-sync";
import type { FailureChainEntry } from "@/lib/amy-voice-telemetry";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";

export type PipelineDecisionLog = {
  cacheKey: string;
  module?: string;
  staticTried?: boolean;
  staticResult?: string;
  cacheTried?: boolean;
  cacheResult?: string;
  apiTried?: boolean;
  apiResult?: string;
  apiSkipped?: string;
  streamingTried?: boolean;
  streamingResult?: string;
  streamingSkipped?: string;
  emergencyTried?: boolean;
  emergencyResult?: string;
  synthesisTried?: boolean;
  synthesisResult?: string;
  finalLayer: AmyVoiceLayer | "forced_emergency";
};

export type TotalAudioFailureLog = {
  event: "total_audio_failure";
  cacheKey: string;
  module?: string;
  reason: "all_layers_failed";
};

export function logPipelineDecision(decision: PipelineDecisionLog): void {
  const line = { evt: "amy_voice.pipeline_decision", ...decision };
  if (import.meta.env.DEV) {
    console.debug("[AmyVoicePipelineDecision]", line);
  } else {
    console.warn("[AmyVoicePipelineDecision]", line);
  }
}

export function logTotalAudioFailure(payload: Omit<TotalAudioFailureLog, "event">): void {
  const line: TotalAudioFailureLog = { event: "total_audio_failure", ...payload };
  console.error("[AmyVoice]", line);
}

function mapStaticResult(error?: string): string | undefined {
  if (!error) return undefined;
  if (error === "static_failed" || error.includes("blob") || error.includes("invalid")) {
    return "rejected_invalid_blob";
  }
  return error;
}

function resolveApiSkipped(dynamicAttempted: boolean): string | undefined {
  if (dynamicAttempted) return undefined;
  if (shouldSkipLiveTtsApi()) return "api_disabled";
  if (isApiGloballyDegraded()) return "api_degraded";
  if (isSafeModeActive()) return "safe_mode";
  return undefined;
}

function resolveStreamingSkipped(streamingAttempted: boolean): string | undefined {
  if (streamingAttempted) return undefined;
  if (isStreamingTemporarilyDisabled()) return "safe_mode";
  if (isSafeModeActive()) return "safe_mode";
  return undefined;
}

/** Infer layer try/skip reasons from the failure chain at never-silent fallback. */
export function buildPipelineDecisionLog(
  cacheKey: string,
  failureChain: readonly FailureChainEntry[],
  opts: {
    module?: string;
    dynamicAttempted: boolean;
    streamingAttempted: boolean;
    emergencyAttempted: boolean;
    synthesisAttempted: boolean;
  },
): PipelineDecisionLog {
  const staticEntry = failureChain.find(
    (e) => e.layer === "static" || e.error.includes("static"),
  );
  const cacheEntry = failureChain.find((e) => e.layer === "cache");
  const apiEntry = failureChain.find(
    (e) => e.layer === "api" || e.layer === "elevenlabs" || e.error.includes("api"),
  );
  const streamingEntry = failureChain.find((e) => e.error.includes("stream"));
  const emergencyEntry = failureChain.find((e) => e.layer === "emergency_local");
  const synthesisEntry = failureChain.find(
    (e) => e.error.includes("synthesis") || e.error === "synthesis_failed",
  );

  const staticTried = Boolean(staticEntry) || failureChain.length > 0;
  const cacheTried =
    Boolean(cacheEntry) || (!isCacheDisabled() && (staticTried || failureChain.length > 0));

  return {
    cacheKey,
    module: opts.module,
    staticTried,
    staticResult: staticTried
      ? mapStaticResult(staticEntry?.error) ?? "rejected_invalid_blob"
      : undefined,
    cacheTried,
    cacheResult: cacheTried ? (cacheEntry?.error ?? "miss") : undefined,
    apiTried: opts.dynamicAttempted,
    apiResult: apiEntry?.error,
    apiSkipped: resolveApiSkipped(opts.dynamicAttempted),
    streamingTried: opts.streamingAttempted,
    streamingResult: streamingEntry?.error,
    streamingSkipped: resolveStreamingSkipped(opts.streamingAttempted),
    emergencyTried: opts.emergencyAttempted,
    emergencyResult: emergencyEntry?.error,
    synthesisTried: opts.synthesisAttempted,
    synthesisResult: synthesisEntry?.error,
    finalLayer: "text_visual",
  };
}
