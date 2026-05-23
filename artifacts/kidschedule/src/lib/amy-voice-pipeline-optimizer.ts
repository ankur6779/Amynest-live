/**
 * Pipeline execution optimizer — learning-backed layer selection, staged races, telemetry.
 * Does not own playback lifecycle (see amy-voice-controller.ts).
 */

import { prepareAmyLessonParagraphSpeech, prepareAmyParentHubSpeech } from "@/lib/amy-speech-mode";
import { shouldSkipLiveTtsApi } from "@/lib/amy-voice-circuit";
import { isSafeModeActive, isCacheDisabled } from "@/lib/admin-audio-ops";
import type { AmySpeechPolicy } from "@/lib/amy-speech-mode";
import type { SpeakOptions } from "@/hooks/use-amy-voice";
import type { AuthFetchFn } from "@/lib/poll-result";
import {
  generateTts,
  resolveClientPlaybackUrl,
} from "@/lib/tts-playback";
import { warmLocalCacheFromUrl } from "@/lib/local-tts-cache";
import { preloadStaticPhrases, lookupStaticAudioUrl } from "@/lib/static-audio";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";
import type { StaticAudioMode } from "@workspace/static-audio/browser";
import {
  buildScoringContext,
  getBestLearnableLayer,
  getDeviceClass,
  getNetworkProfile,
  getPredictedNextKey,
  getRankedLearnableLayers,
  initPipelineLearning,
  isLayerScorePenalized,
  isSlowNetworkProfile,
  recordLayerOutcome,
  recordPhraseTransition,
  resolveAdaptivePipelineBudget,
  resolveStrategyFromLayers,
  type DeviceClass,
  type LearnableLayer,
  type LayerScoringContext,
  type NetworkProfile,
  type PipelineStrategy,
} from "@/lib/amy-voice-pipeline-learning";
import {
  initHybridTtsLearning,
  hashCacheKeySync,
  queueServerTelemetry,
} from "@/lib/amy-voice-pipeline-server-sync";
import {
  assertPrefetchCacheKey as assertLessonPrefetchCacheKey,
  assertVerbatimLessonText,
  createAudioIdentity,
  lessonLocalCacheKey,
  lessonPipelineCacheKey,
  logLessonAudioIdentity,
  type AudioIdentity,
} from "@/lib/lesson-audio-identity";
import {
  assertPrefetchCacheKey as assertParentHubPrefetchCacheKey,
  assertVerbatimParentHubText,
  isParentHubAudioIdentity,
  logParentHubAudioIdentity,
  parentHubLocalCacheKey,
  parentHubPipelineCacheKey,
  type ParentHubAudioIdentity,
} from "@/lib/parent-hub-audio-identity";

export type { DeviceClass, LearnableLayer, LayerScoringContext, NetworkProfile, PipelineStrategy };

export const LONG_TEXT_THRESHOLD = 120;
export const MAX_PIPELINE_TIME_MS = 2500;
export const STAGED_PREGEN_DELAY_MS = 130;
export const LAYER_FAILURE_TTL_MS = 10_000;

export type RememberedLayer = LearnableLayer | "emergency_local";

const AUDIBLE_LAYERS = new Set<RememberedLayer>([
  "static",
  "cache",
  "api",
  "elevenlabs",
  "emergency_local",
]);

type LayerFailureEntry = { until: number };
const layerFailures = new Map<string, LayerFailureEntry>();
const prefetchInFlight = new Set<string>();
const layerTryStarts = new Map<string, number>();

initPipelineLearning();
initHybridTtsLearning();

export function pipelineCacheKey(
  text: string,
  mode: StaticAudioMode,
  opts?: SpeakOptions,
): string {
  const kind = opts?.lessonParagraph
    ? "lesson"
    : opts?.parentHub
      ? "parent"
      : opts?.catalogPlayback
        ? "catalog"
        : "default";

  if (opts?.parentHub) {
    if (!isParentHubAudioIdentity(opts.audioIdentity)) {
      const msg = "Parent Hub pipelineCacheKey requires audioIdentity";
      if (import.meta.env.DEV) throw new Error(msg);
      console.error("[ParentHubAudioIdentity]", msg);
      const trimmed = text.trim();
      return `${kind}:${mode}:${hashCacheKeySync(trimmed)}`;
    }
    assertVerbatimParentHubText(text, opts.audioIdentity.text);
    return parentHubPipelineCacheKey(opts.audioIdentity);
  }

  if (opts?.lessonParagraph) {
    if (!opts.audioIdentity || isParentHubAudioIdentity(opts.audioIdentity)) {
      const msg = "Lesson pipelineCacheKey requires audioIdentity";
      if (import.meta.env.DEV) throw new Error(msg);
      console.error("[LessonAudioIdentity]", msg);
      const trimmed = text.trim();
      return `${kind}:${mode}:${hashCacheKeySync(trimmed)}`;
    }
    assertVerbatimLessonText(text, opts.audioIdentity.text);
    return lessonPipelineCacheKey(opts.audioIdentity, mode);
  }

  return `${kind}:${mode}:${text.trim().toLowerCase().slice(0, 240)}`;
}

function isRememberedLayer(layer: AmyVoiceLayer): layer is RememberedLayer {
  return AUDIBLE_LAYERS.has(layer as RememberedLayer);
}

export function rememberLayerSuccess(cacheKey: string, layer: AmyVoiceLayer): void {
  if (!isRememberedLayer(layer)) return;
  recordLayerOutcome(cacheKey, layer, true, 0);
}

export function getRememberedLayer(cacheKey: string, context?: LayerScoringContext): RememberedLayer | null {
  if (!context) return null;
  const best = getBestLearnableLayer(cacheKey, context);
  return best;
}

export function getScoredLayerOrder(
  cacheKey: string,
  text: string,
  policy: AmySpeechPolicy,
  opts?: SpeakOptions,
): LearnableLayer[] {
  const context = buildScoringContext(text, policy, opts);
  return getRankedLearnableLayers(cacheKey, context);
}

export function markLayerFailed(layer: string, cacheKey?: string): void {
  layerFailures.set(cacheKey ? `${cacheKey}:${layer}` : layer, {
    until: Date.now() + LAYER_FAILURE_TTL_MS,
  });
}

export function isLayerRecentlyFailed(layer: string, cacheKey?: string): boolean {
  if (isLayerScorePenalized(layer, cacheKey)) return true;
  const key = cacheKey ? `${cacheKey}:${layer}` : layer;
  const entry = layerFailures.get(key);
  if (!entry) return false;
  if (Date.now() > entry.until) {
    layerFailures.delete(key);
    return false;
  }
  return true;
}

export function isSlowNetwork(): boolean {
  return isSlowNetworkProfile();
}

export function resolvePipelineStrategy(
  text: string,
  policy: AmySpeechPolicy,
  cacheKey: string,
  opts?: SpeakOptions,
): PipelineStrategy {
  const context = buildScoringContext(text, policy, opts);
  const ranked = getRankedLearnableLayers(cacheKey, context);
  return resolveStrategyFromLayers(ranked, {
    ...context,
    textLength: text.length,
  });
}

export class PipelineTimeBudget {
  private readonly startedAt = Date.now();

  constructor(public readonly maxMs = MAX_PIPELINE_TIME_MS) {}

  elapsed(): number {
    return Date.now() - this.startedAt;
  }

  exceeded(): boolean {
    return this.elapsed() > this.maxMs;
  }

  remaining(): number {
    return Math.max(0, this.maxMs - this.elapsed());
  }
}

export function createAdaptivePipelineBudget(
  cacheKey: string,
  text: string,
  policy: AmySpeechPolicy,
  opts?: SpeakOptions,
): PipelineTimeBudget {
  const context = buildScoringContext(text, policy, opts);
  const maxMs = resolveAdaptivePipelineBudget(cacheKey, context, MAX_PIPELINE_TIME_MS);
  return new PipelineTimeBudget(maxMs);
}

export type LayerTryRecord = {
  layer: string;
  success: boolean;
  latency: number;
  exploration?: boolean;
};

export type PipelineTelemetry = {
  cacheKey: string;
  chosenStrategy: PipelineStrategy;
  layersTried: LayerTryRecord[];
  successLayer?: AmyVoiceLayer;
  totalTime: number;
  fallbackUsed: boolean;
  budgetExceeded: boolean;
  device: DeviceClass;
  network: NetworkProfile;
};

export function createPipelineTelemetry(
  cacheKey: string,
  strategy: PipelineStrategy,
  context?: LayerScoringContext,
): {
  recordTry(layer: string, success?: boolean, latencyMs?: number, exploration?: boolean): void;
  beginTry(layer: string): void;
  finish(successLayer: AmyVoiceLayer | null, fallbackUsed: boolean, budgetExceeded: boolean): void;
} {
  const layersTried: LayerTryRecord[] = [];
  const startedAt = Date.now();

  const pushServerEvent = (tryRecord: LayerTryRecord): void => {
    const normalized = normalizeLearnableLayer(tryRecord.layer);
    if (!normalized) return;
    queueServerTelemetry({
      cacheKey,
      layer: normalized,
      success: tryRecord.success,
      latency: tryRecord.latency,
      deviceClass: context?.deviceClass ?? getDeviceClass(),
      networkType: context?.networkProfile ?? getNetworkProfile(),
      textLength: context?.textLength ?? 0,
      module: context?.module,
      exploration: tryRecord.exploration,
    });
  };

  return {
    beginTry(layer: string) {
      layerTryStarts.set(layer, Date.now());
    },
    recordTry(layer: string, success = false, latencyMs?: number, exploration = false) {
      const started = layerTryStarts.get(layer);
      const latency =
        latencyMs ?? (started != null ? Math.max(0, Date.now() - started) : 0);
      const entry: LayerTryRecord = { layer, success, latency, exploration };
      layersTried.push(entry);
      pushServerEvent(entry);
      if (!success && latency >= 0) {
        recordLayerOutcome(cacheKey, layer, false, latency, {
          networkProfile: getNetworkProfile(),
          deviceClass: getDeviceClass(),
        });
      }
      layerTryStarts.delete(layer);
    },
    finish(successLayer, fallbackUsed, budgetExceeded) {
      if (successLayer && isRememberedLayer(successLayer)) {
        const lastTry = [...layersTried].reverse().find((t) => t.layer === successLayer);
        recordLayerOutcome(
          cacheKey,
          successLayer,
          true,
          lastTry?.latency ?? Date.now() - startedAt,
          { networkProfile: getNetworkProfile(), deviceClass: getDeviceClass() },
        );
      }
      logTtsPipeline({
        cacheKey,
        chosenStrategy: strategy,
        layersTried,
        successLayer: successLayer ?? undefined,
        totalTime: Date.now() - startedAt,
        fallbackUsed,
        budgetExceeded,
        device: getDeviceClass(),
        network: getNetworkProfile(),
      });
    },
  };
}

function normalizeLearnableLayer(layer: string): LearnableLayer | null {
  if (layer === "static" || layer === "cache" || layer === "api" || layer === "elevenlabs") {
    return layer;
  }
  if (layer.startsWith("learned_")) {
    const inner = layer.slice("learned_".length);
    if (inner === "static" || inner === "cache" || inner === "api" || inner === "elevenlabs") {
      return inner;
    }
  }
  if (layer === "dynamic" || layer === "pregen") return "api";
  return null;
}

export function beginLayerTry(
  telemetry: ReturnType<typeof createPipelineTelemetry> | null,
  layer: string,
): void {
  telemetry?.beginTry(layer);
}

export function logTtsPipeline(event: PipelineTelemetry): void {
  if (import.meta.env.DEV) {
    console.debug("[AmyVoicePipeline]", event);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type PlayAttemptResult =
  | { ok: true; layer: AmyVoiceLayer; stopPlayback?: () => void }
  | { ok: false; error: string };

/** Staged pregen race — primary layer first, secondary after delay. */
export async function runStagedPregenRace(
  staticRun: () => Promise<PlayAttemptResult>,
  cacheRun: () => Promise<PlayAttemptResult>,
  timeoutMs: number,
  isStale: () => boolean,
  primary: "static" | "cache" = "static",
): Promise<PlayAttemptResult> {
  const firstRun = primary === "static" ? staticRun : cacheRun;
  const secondRun = primary === "static" ? cacheRun : staticRun;

  if (isStale()) return { ok: false, error: "tts_cancelled" };

  const firstPromise = firstRun();
  const raced = await Promise.race([
    firstPromise.then((r) => ({ kind: "first" as const, r })),
    delay(STAGED_PREGEN_DELAY_MS).then(() => ({ kind: "wait" as const, r: null })),
  ]);

  if (raced.kind === "first" && raced.r.ok) return raced.r;
  if (isStale()) return { ok: false, error: "tts_cancelled" };

  const secondPromise = secondRun();
  const remainingMs = Math.max(200, timeoutMs - STAGED_PREGEN_DELAY_MS);

  const winner = await Promise.race([
    firstPromise.then((r) => (r.ok ? r : null)),
    secondPromise.then((r) => (r.ok ? r : null)),
    delay(remainingMs).then(() => null),
  ]);

  if (winner?.ok) return winner;

  const firstFinal = await firstPromise;
  if (firstFinal.ok) return firstFinal;
  const secondFinal = await secondPromise;
  return secondFinal.ok ? secondFinal : firstFinal;
}

export function recordLessonTransition(
  fromIdentity: AudioIdentity,
  toIdentity: AudioIdentity,
  mode: StaticAudioMode,
): void {
  const fromKey = lessonPipelineCacheKey(fromIdentity, mode);
  const toKey = lessonPipelineCacheKey(toIdentity, mode);
  recordPhraseTransition(fromKey, toKey);
  queueServerTelemetry({
    cacheKey: fromKey,
    layer: "cache",
    success: true,
    latency: 0,
    deviceClass: getDeviceClass(),
    networkType: getNetworkProfile(),
    textLength: toIdentity.text.length,
    module: "lesson",
    fromKeyHash: hashCacheKeySync(fromKey),
    toKeyHash: hashCacheKeySync(toKey),
  });
}

/** Predictive + sequential prefetch for lesson paragraphs (identity-scoped). */
export function prefetchLessonParagraph(
  identity: AudioIdentity,
  authFetch: AuthFetchFn,
  voiceId?: string,
  modelId?: string,
  previousIdentity?: AudioIdentity,
): void {
  const policy = prepareAmyLessonParagraphSpeech(identity.text);
  const playbackKey = lessonPipelineCacheKey(identity, policy.pipelineMode);
  const cacheKey = playbackKey;

  assertLessonPrefetchCacheKey(cacheKey, playbackKey);
  logLessonAudioIdentity(identity, { phase: "prefetch_start" });

  if (previousIdentity) {
    recordLessonTransition(previousIdentity, identity, policy.pipelineMode);
    const fromKey = lessonPipelineCacheKey(previousIdentity, policy.pipelineMode);
    const predicted = getPredictedNextKey(fromKey);
    if (predicted && predicted !== cacheKey) return;
  }

  if (prefetchInFlight.has(cacheKey)) return;
  prefetchInFlight.add(cacheKey);

  void (async () => {
    try {
      preloadStaticPhrases([identity.text], policy.pipelineMode, 1);
      const staticUrl = lookupStaticAudioUrl(identity.text, policy.pipelineMode);
      if (staticUrl) {
        void warmLocalCacheFromUrl(
          lessonLocalCacheKey(identity, policy.pipelineMode),
          staticUrl,
        );
      }
      if (shouldSkipLiveTtsApi() || isSafeModeActive() || isCacheDisabled() || isSlowNetwork()) return;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const data = await generateTts(
        authFetch,
        {
          text: identity.text,
          voiceId,
          modelId,
          mode: policy.pipelineMode,
        },
        { signal: controller.signal },
      ).finally(() => clearTimeout(timer));

      if (data?.success && data.cacheKey && data.audioUrl) {
        const playbackUrl = resolveClientPlaybackUrl(data.audioUrl, data.cacheKey);
        if (playbackUrl) {
          void warmLocalCacheFromUrl(lessonLocalCacheKey(identity, policy.pipelineMode), playbackUrl);
        }
      }
    } catch {
      /* best-effort prefetch */
    } finally {
      prefetchInFlight.delete(cacheKey);
    }
  })();
}

/** @deprecated Use prefetchLessonParagraph with AudioIdentity. */
export function prefetchLessonParagraphText(
  text: string,
  authFetch: AuthFetchFn,
  voiceId?: string,
  modelId?: string,
  previousText?: string,
  lessonId?: string,
  paragraphIndex?: number,
): void {
  if (!lessonId || paragraphIndex == null) {
    if (import.meta.env.DEV) {
      throw new Error("prefetchLessonParagraphText requires lessonId and paragraphIndex");
    }
    return;
  }
  const identity = createAudioIdentity(lessonId, paragraphIndex, text);
  const previousIdentity =
    previousText?.trim() && paragraphIndex > 0
      ? createAudioIdentity(lessonId, paragraphIndex - 1, previousText)
      : undefined;
  prefetchLessonParagraph(identity, authFetch, voiceId, modelId, previousIdentity);
}

/** Predictive prefetch for Parent Hub read-aloud (identity-scoped). */
export function prefetchParentHubItem(
  identity: ParentHubAudioIdentity,
  authFetch: AuthFetchFn,
  voiceId?: string,
  modelId?: string,
  previousIdentity?: ParentHubAudioIdentity,
): void {
  const policy = prepareAmyParentHubSpeech(identity.text);
  const playbackKey = parentHubPipelineCacheKey(identity);
  const cacheKey = playbackKey;

  assertParentHubPrefetchCacheKey(cacheKey, playbackKey);
  logParentHubAudioIdentity(identity, { phase: "prefetch_start" });

  if (previousIdentity) {
    const fromKey = parentHubPipelineCacheKey(previousIdentity);
    const predicted = getPredictedNextKey(fromKey);
    if (predicted && predicted !== cacheKey) return;
  }

  if (prefetchInFlight.has(cacheKey)) return;
  prefetchInFlight.add(cacheKey);

  void (async () => {
    try {
      preloadStaticPhrases([identity.text], policy.pipelineMode, 1);
      const staticUrl = lookupStaticAudioUrl(identity.text, policy.pipelineMode);
      if (staticUrl) {
        void warmLocalCacheFromUrl(parentHubLocalCacheKey(identity), staticUrl);
      }
      if (shouldSkipLiveTtsApi() || isSafeModeActive() || isCacheDisabled() || isSlowNetwork()) return;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const data = await generateTts(
        authFetch,
        {
          text: identity.text,
          voiceId,
          modelId,
          mode: policy.pipelineMode,
        },
        { signal: controller.signal },
      ).finally(() => clearTimeout(timer));

      if (data?.success && data.cacheKey && data.audioUrl) {
        const playbackUrl = resolveClientPlaybackUrl(data.audioUrl, data.cacheKey);
        if (playbackUrl) {
          void warmLocalCacheFromUrl(parentHubLocalCacheKey(identity), playbackUrl);
        }
      }
    } catch {
      /* best-effort prefetch */
    } finally {
      prefetchInFlight.delete(cacheKey);
    }
  })();
}

export function waitUntilEndWithCap(
  waitFn: () => Promise<{ ok: boolean }>,
  audioDurationSec: number,
  isCancelled: () => boolean,
): Promise<{ ok: boolean }> {
  const maxWaitMs =
    audioDurationSec > 0
      ? Math.min((audioDurationSec * 1.5 + 0.5) * 1000, 120_000)
      : 30_000;

  return Promise.race([
    waitFn(),
    delay(maxWaitMs).then(() => {
      if (isCancelled()) return { ok: false };
      return { ok: true };
    }),
  ]);
}

export {
  buildScoringContext,
  getRankedLearnableLayers,
  recordLayerOutcome,
  getDeviceClass,
  getNetworkProfile,
};
