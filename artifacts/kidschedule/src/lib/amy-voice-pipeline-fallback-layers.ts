/**
 * Amy voice pipeline — layers 5–6 (emergency, synthesis, visual never-silent fallback).
 */

import { forceEmergencyPlayback, playEmergencyPhrase, playFallbackTone, playNaturalSpeechSynthesis } from "@/lib/emergency-audio";
import { emitAmyVoiceTextFallback } from "@/lib/amy-voice-visual-fallback";
import { logAmyModeDiagnosis } from "@/lib/amy-speech-mode";
import type { AmySpeechPolicy } from "@/lib/amy-speech-mode";
import { maybeQueueAmyVoiceLearning } from "@/lib/amy-voice-learning";
import {
  buildPipelineDecisionLog,
  logPipelineDecision,
  logTotalAudioFailure,
} from "@/lib/amy-voice-pipeline-decision";
import { buildScoringContext, createPipelineTelemetry } from "@/lib/amy-voice-pipeline-optimizer";
import {
  recordAmyVoiceFallbackUsed,
  recordAmyVoiceLayerFailed,
  recordAmyVoiceLayerSuccess,
} from "@/lib/amy-voice-telemetry";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";
import type { StaticAudioMode } from "@workspace/static-audio/browser";
import type { SpeakOptions } from "@/hooks/use-amy-voice";
import {
  type AmyVoicePipelineContext,
  type FailureChainEntry,
  type FinishAttemptFn,
  type NeverSilentPipelineFlags,
  type PlayAttemptResult,
  NEVER_SILENT_MS,
  isStale,
  splitWords,
  withTimeout,
  type SpeakFinishResult,
} from "@/lib/amy-voice-pipeline-types";

export async function trySpeechSynthesisLayer(
  text: string,
  ctx: AmyVoicePipelineContext,
  policy: AmySpeechPolicy,
): Promise<PlayAttemptResult> {
  if (!policy.preferSpeechSynthesisFallback) {
    recordAmyVoiceLayerFailed("emergency_local", "synthesis_blocked");
    return { ok: false, error: "synthesis_blocked" };
  }
  const ok = await withTimeout(
    playNaturalSpeechSynthesis(text, policy.prosody.synthesisRate),
    NEVER_SILENT_MS,
    "synthesis",
  ).catch(() => false);
  if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
  if (ok) {
    recordAmyVoiceLayerSuccess("emergency_local_success", { source: "speechSynthesis" });
    recordAmyVoiceFallbackUsed("api", "emergency_local");
    return { ok: true, layer: "emergency_local" };
  }
  recordAmyVoiceLayerFailed("emergency_local", "synthesis_failed");
  return { ok: false, error: "synthesis_failed" };
}

export async function tryEmergencyLayer(
  text: string,
  ctx: AmyVoicePipelineContext,
): Promise<PlayAttemptResult> {
  const ok = await withTimeout(
    playEmergencyPhrase(text),
    NEVER_SILENT_MS,
    "emergency",
  ).catch(() => false);
  if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
  if (ok) {
    recordAmyVoiceLayerSuccess("emergency_local_success");
    return { ok: true, layer: "emergency_local" };
  }
  recordAmyVoiceLayerFailed("emergency_local", "emergency_failed");
  return { ok: false, error: "emergency_failed" };
}

export function tryTextVisualLayer(text: string, mode: StaticAudioMode): PlayAttemptResult {
  emitAmyVoiceTextFallback({
    phrase: text,
    mode,
    highlightWords: splitWords(text),
    showTapToHear: true,
    animated: true,
  });
  recordAmyVoiceLayerSuccess("text_visual_success");
  return { ok: true, layer: "text_visual" };
}

/** Absolute last audio guarantee — visual highlight + forced local TTS/tone. */
export async function runNeverSilentFallback(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  policy: AmySpeechPolicy,
  depth: number,
  cacheKey: string,
  failureChain: FailureChainEntry[],
  opts: SpeakOptions | undefined,
  flags: NeverSilentPipelineFlags,
  finishAttempt: FinishAttemptFn,
  telemetry: ReturnType<typeof createPipelineTelemetry> | null,
): Promise<SpeakFinishResult> {
  if (isStale(ctx)) return { success: false, error: "tts_cancelled" };

  const scoringContext = buildScoringContext(text, policy, opts);
  logPipelineDecision(
    buildPipelineDecisionLog(cacheKey, failureChain, {
      module: scoringContext.module,
      ...flags,
    }),
  );

  tryTextVisualLayer(text, mode);
  if (depth === 0) {
    logAmyModeDiagnosis(policy, "text_visual");
    maybeQueueAmyVoiceLearning(policy, "text_visual");
  }

  telemetry?.recordTry("forced_emergency");
  const forced = await forceEmergencyPlayback(text);
  if (forced.success) {
    recordAmyVoiceLayerSuccess("emergency_local_success", { forced: true });
    recordAmyVoiceFallbackUsed("text_visual", "emergency_local");
    return finishAttempt({ ok: true, layer: "emergency_local" }, true);
  }

  logTotalAudioFailure({
    cacheKey,
    module: scoringContext.module,
    reason: "all_layers_failed",
  });

  const tone = await playFallbackTone();
  if (tone) {
    recordAmyVoiceLayerSuccess("emergency_local_success", { forced: true, tone: true });
    return finishAttempt({ ok: true, layer: "emergency_local" }, true);
  }

  return finishAttempt({ ok: true, layer: "emergency_local" }, true);
}

export type { NeverSilentPipelineFlags };
