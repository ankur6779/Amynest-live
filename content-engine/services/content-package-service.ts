import {
  ContentEngineError,
  createDefaultProviderRegistry,
  toContentEngineError,
  type AIProvider,
  type ProviderRegistry,
} from "../ai/index.js";
import { buildCaptions } from "../captions/index.js";
import {
  buildContentCacheKey,
  InMemoryContentCache,
  type ContentCache,
} from "../cache/index.js";
import { resolveGenerationSettings } from "../config/generation.js";
import {
  buildModerationRewriteHint,
  moderatePayload,
} from "../moderation/index.js";
import { generateScriptPayload, type ScriptGenerationResult } from "../script/index.js";
import { calculateSeoScore } from "../seo/index.js";
import { calculateQualityScore } from "../scoring/index.js";
import { gateGeneratedPayload } from "../studio/quality/from-payload.js";
import {
  createTelemetryEvent,
  InMemoryTelemetrySink,
  type TelemetryEvent,
  type TelemetrySink,
} from "../telemetry/index.js";
import type {
  ContentEngineConfig,
  ContentGenerationInput,
  ContentPackage,
  ModerationResult,
  QualityScoreBreakdown,
  ResolvedContentEngineConfig,
  SeoScoreBreakdown,
  Topic,
} from "../types/index.js";
import { CONTENT_PACKAGE_VERSION } from "../types/index.js";
import {
  clampTarget,
  estimateSpeakingSeconds,
  refineVoiceScript,
} from "../voice/index.js";

export interface ContentPackageServiceOptions {
  config: ContentEngineConfig;
  registry?: ProviderRegistry;
  cache?: ContentCache;
  telemetry?: TelemetrySink;
}

export interface ContentGenerationResult {
  package: ContentPackage;
  quality: QualityScoreBreakdown;
  seo: SeoScoreBreakdown;
  moderation: ModerationResult;
  telemetry: TelemetryEvent;
  cacheHit: boolean;
}

/**
 * Phase 2 orchestrator: topic → production-ready ContentPackage.
 * Provider-agnostic, cached, moderated, scored, and instrumented.
 */
export class ContentPackageService {
  private readonly config: ResolvedContentEngineConfig;
  private readonly registry: ProviderRegistry;
  private readonly cache: ContentCache;
  private readonly telemetry: TelemetrySink;

  constructor(options: ContentPackageServiceOptions) {
    this.config = resolveGenerationSettings(options.config);
    this.registry = options.registry ?? createDefaultProviderRegistry(this.config);
    this.cache = options.cache ?? new InMemoryContentCache();
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
  }

  async generateFromTopic(
    topic: Topic,
    overrides: Partial<
      Pick<ContentGenerationInput, "language" | "duration" | "videoStyle" | "ageGroup">
    > = {},
  ): Promise<ContentGenerationResult> {
    const input: ContentGenerationInput = {
      topic,
      category: topic.category,
      ageGroup: overrides.ageGroup ?? topic.ageGroup,
      language:
        overrides.language ??
        this.config.defaultLanguage ??
        this.config.language,
      duration: overrides.duration ?? topic.estimatedDuration,
      videoStyle: overrides.videoStyle ?? topic.videoStyle,
    };
    return this.generate(input);
  }

  async generate(input: ContentGenerationInput): Promise<ContentGenerationResult> {
    const started = Date.now();
    const primary = this.registry.resolvePrimary(this.config);
    const cacheKey = buildContentCacheKey({
      topicId: input.topic.id,
      language: input.language,
      duration: input.duration,
      videoStyle: input.videoStyle,
      provider: primary.id,
    });

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return this.resultFromCache(cached, input, started);
    }

    const errors: string[] = [];
    let retryCount = 0;
    let provider: AIProvider = primary;
    let rewriteHint: string | undefined;
    let lastModeration: ModerationResult = { ok: true, violations: [] };
    const maxAttempts = Math.max(1, this.config.maxRetries + 1);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt > 0) retryCount += 1;

        const script = await this.generateWithFallback(
          input,
          provider,
          rewriteHint,
          errors,
        );
        provider = this.registry.get(script.provider);

        const voiceScript = refineVoiceScript(
          script.payload.voiceScript,
          input.duration,
        );
        const readingTime = estimateSpeakingSeconds(voiceScript);
        const estimatedDuration = clampTarget(input.duration);
        const captions = buildCaptions(voiceScript, estimatedDuration);
        const payload = { ...script.payload, voiceScript };

        lastModeration = moderatePayload(payload);
        if (!lastModeration.ok) {
          rewriteHint = buildModerationRewriteHint(lastModeration);
          errors.push(
            `moderation:${lastModeration.violations.map((v) => v.code).join(",")}`,
          );
          continue;
        }

        const seo = calculateSeoScore({
          title: payload.titles.primary,
          description: script.description,
          keywords: payload.keywords,
          hashtags: payload.hashtags,
          voiceScript,
        });
        const quality = calculateQualityScore({
          payload,
          topicTitle: input.topic.title,
          category: input.category,
          channelName: this.config.branding.channelName,
        });

        if (seo.overall < this.config.minimumSEOScore) {
          rewriteHint =
            "Improve SEO: strengthen title keywords, expand description usefulness, diversify hashtags, keep natural voice.";
          errors.push(`seo_threshold:${seo.overall}`);
          continue;
        }

        if (quality.overall < this.config.minimumQualityScore) {
          rewriteHint =
            "Improve clarity, emotional warmth, curiosity hook, retention structure, and AmyNest brand consistency.";
          errors.push(`quality_threshold:${quality.overall}`);
          continue;
        }

        const studioGate = gateGeneratedPayload({
          payload,
          topicTitle: input.topic.title,
          category: input.category,
        });
        if (!studioGate.ok) {
          rewriteHint =
            studioGate.rewriteHint ??
            "Studio quality below 90 — regenerate with stronger hook, clearer AmyNest feature demo, warm emotion, and premium CTA.";
          errors.push(`studio_quality_threshold:${studioGate.scores.overall}`);
          continue;
        }

        const contentPackage: ContentPackage = {
          topic: input.topic,
          title: payload.titles.primary,
          alternateTitles: [
            ...payload.titles.alternates,
            payload.titles.short,
            payload.titles.highCtr,
            payload.titles.searchOptimized,
          ],
          hook: payload.hook,
          openingQuestion: payload.openingQuestion,
          story: payload.story,
          keyPoints: payload.keyPoints,
          cta: payload.cta,
          voiceScript,
          sceneScript: payload.sceneScript,
          captions,
          description: script.description,
          hashtags: payload.hashtags,
          keywords: payload.keywords,
          seoScore: seo.overall,
          readingTime,
          estimatedDuration,
          language: input.language,
          provider: script.provider,
          generatedAt: new Date().toISOString(),
          version: CONTENT_PACKAGE_VERSION,
        };

        this.cache.set(cacheKey, contentPackage, this.config.cacheTTL);

        const event = createTelemetryEvent({
          name: "content_package.generate",
          generationTimeMs: Date.now() - started,
          provider: script.provider,
          tokens: script.usage?.totalTokens,
          promptTokens: script.usage?.promptTokens,
          completionTokens: script.usage?.completionTokens,
          errors,
          retryCount,
          cacheHit: false,
          topicId: input.topic.id,
          seoScore: seo.overall,
          qualityScore: quality.overall,
          metadata: {
            promptIds: script.promptIds.join(","),
            latencyMs: script.latencyMs,
          },
        });
        this.telemetry.record(event);

        return {
          package: contentPackage,
          quality,
          seo,
          moderation: lastModeration,
          telemetry: event,
          cacheHit: false,
        };
      } catch (error) {
        const mapped = toContentEngineError(error);
        errors.push(`${mapped.code}:${mapped.message}`);
        if (!mapped.recoverable) throw mapped;

        const fallback = this.registry.resolveFallback(this.config);
        if (fallback && fallback.id !== provider.id) {
          provider = fallback;
          continue;
        }
      }
    }

    const event = createTelemetryEvent({
      name: "content_package.generate_failed",
      generationTimeMs: Date.now() - started,
      provider: provider.id,
      errors,
      retryCount,
      cacheHit: false,
      topicId: input.topic.id,
    });
    this.telemetry.record(event);

    throw new ContentEngineError(
      "RETRY_EXHAUSTED",
      `Failed to generate content package after ${maxAttempts} attempt(s)`,
      {
        recoverable: false,
        details: { errors, moderation: lastModeration },
      },
    );
  }

  private async generateWithFallback(
    input: ContentGenerationInput,
    provider: AIProvider,
    rewriteHint: string | undefined,
    errors: string[],
  ): Promise<ScriptGenerationResult> {
    try {
      return await generateScriptPayload(input, provider, { rewriteHint });
    } catch (error) {
      const mapped = toContentEngineError(error);
      errors.push(`${mapped.code}:${mapped.message}`);
      if (!mapped.recoverable) throw mapped;

      const fallback = this.registry.resolveFallback(this.config);
      if (!fallback || fallback.id === provider.id) throw mapped;

      errors.push(`fallback:${fallback.id}`);
      return generateScriptPayload(input, fallback, { rewriteHint });
    }
  }

  private resultFromCache(
    cached: ContentPackage,
    input: ContentGenerationInput,
    started: number,
  ): ContentGenerationResult {
    const seo = calculateSeoScore({
      title: cached.title,
      description: cached.description,
      keywords: cached.keywords,
      hashtags: cached.hashtags,
      voiceScript: cached.voiceScript,
    });
    const quality = calculateQualityScore({
      payload: {
        hook: cached.hook,
        openingQuestion: cached.openingQuestion,
        story: cached.story,
        keyPoints: cached.keyPoints,
        cta: cached.cta,
        voiceScript: cached.voiceScript,
        sceneScript: cached.sceneScript,
        titles: {
          primary: cached.title,
          alternates: cached.alternateTitles.slice(0, 5),
          short: cached.title,
          highCtr: cached.title,
          searchOptimized: cached.title,
        },
        description: {
          seo: cached.description,
          appPromotion: "",
          playStoreCta: "",
          website: "",
          socialLinks: "",
          disclaimer: "",
        },
        hashtags: cached.hashtags,
        keywords: cached.keywords,
      },
      topicTitle: input.topic.title,
      category: input.category,
      channelName: this.config.branding.channelName,
    });

    const event = createTelemetryEvent({
      name: "content_package.generate",
      generationTimeMs: Date.now() - started,
      provider: cached.provider,
      errors: [],
      retryCount: 0,
      cacheHit: true,
      topicId: input.topic.id,
      seoScore: cached.seoScore,
      qualityScore: quality.overall,
    });
    this.telemetry.record(event);

    return {
      package: cached,
      quality,
      seo,
      moderation: { ok: true, violations: [] },
      telemetry: event,
      cacheHit: true,
    };
  }
}
