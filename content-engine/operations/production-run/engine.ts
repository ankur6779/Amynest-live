import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AnalyticsOrchestrator } from "../../analytics/orchestrator.js";
import { MockAnalyticsProvider } from "../../analytics/providers/mock.js";
import { createDefaultAnalyticsRegistry } from "../../analytics/providers/index.js";
import { YouTubeAnalyticsProvider } from "../../analytics/providers/youtube.js";
import { BrainOrchestrator } from "../../brain/orchestrator.js";
import { PublishingOrchestrator } from "../../publishing/orchestrator.js";
import {
  createDefaultPublishingRegistry,
  MockPublishingProvider,
  YouTubePublishingProvider,
} from "../../publishing/youtube/index.js";
import { resolveYouTubeAccessToken } from "../../publishing/youtube/oauth.js";
import { RenderOrchestrator } from "../../render-engine/orchestrator.js";
import { createDefaultRenderRegistry } from "../../render-engine/providers/index.js";
import { FFmpegRenderer } from "../../render-engine/providers/ffmpeg.js";
import { MockRenderer } from "../../render-engine/providers/mock.js";
import type { ContentEngineConfig, TopicCategory, VideoStyle } from "../../types/index.js";
import type { AnalyticsReport } from "../../types/analytics.js";
import type { CampaignPlan } from "../../types/campaign-plan.js";
import type { ContentPackage } from "../../types/content-package.js";
import type { WorkflowResult } from "../../types/workflow.js";
import { createPipelineServices } from "../../workflow/jobs/pipeline.js";
import { WorkflowOrchestrator } from "../../workflow/orchestrator/index.js";
import { loadLayeredConfiguration } from "../configuration/engine.js";
import { loadAmyNestEnvFiles } from "../env/load-env.js";
import { createStructuredLogger } from "../logging/engine.js";
import {
  FileOperationsStore,
  type OperationsPersistenceStore,
} from "../persistence/store.js";

export interface ProductionRunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  count?: number;
  visibility?: "unlisted" | "private" | "public";
  dataDirectory?: string;
  backupDirectory?: string;
  outputDirectory?: string;
  now?: () => Date;
  planCampaigns?: boolean;
}

export interface ProductionRunReport {
  ok: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  providers: {
    script: string;
    renderer: string;
    publishing: string;
    analytics: string;
  };
  workflowId?: string;
  videosGenerated: number;
  videosPublished: number;
  published: Array<{ videoId: string; url: string; topicId: string }>;
  analyticsReportId?: string;
  campaignPlanId?: string;
  learningUpdated: boolean;
  blockers: string[];
  warnings: string[];
  steps: Array<{ name: string; ok: boolean; message: string; durationMs: number }>;
}

/**
 * Real production E2E run:
 * generate → render → upload (Unlisted) → verify → analytics → learning → campaign plan.
 */
export async function runProductionPipeline(
  options: ProductionRunOptions = {},
): Promise<ProductionRunReport> {
  const started = Date.now();
  const startedAt = (options.now?.() ?? new Date()).toISOString();
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const logger = createStructuredLogger({
    level: "info",
    sink: (record) => console.log(JSON.stringify(record)),
  });
  const steps: ProductionRunReport["steps"] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  const step = async (
    name: string,
    fn: () => Promise<string>,
  ): Promise<boolean> => {
    const t0 = Date.now();
    try {
      const message = await fn();
      steps.push({ name, ok: true, message, durationMs: Date.now() - t0 });
      logger.info(message, { phase: name });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({ name, ok: false, message, durationMs: Date.now() - t0 });
      blockers.push(`${name}: ${message}`);
      logger.error(message, { phase: name });
      return false;
    }
  };

  loadAmyNestEnvFiles(cwd, env);

  let accessToken = "";
  await step("oauth-refresh", async () => {
    accessToken = await resolveYouTubeAccessToken({
      env,
      persistToEnv: true,
    });
    if (!accessToken) {
      throw new Error(
        "Unable to resolve YouTube access token. Set YOUTUBE_ACCESS_TOKEN or YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN.",
      );
    }
    return `YouTube access token ready (len=${accessToken.length})`;
  });

  const hasGeminiKey = Boolean(
    env.GEMINI_API_KEY?.trim() || env.GOOGLE_AI_API_KEY?.trim(),
  );
  const hasOpenAI = Boolean(
    env.OPENAI_API_KEY?.trim() || env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim(),
  );
  /** Explicit opt-in only — do not auto-enable Gemini media stack until live validation passes. */
  const geminiEnabled = env.AMYNEST_GEMINI_ENABLED === "true" && hasGeminiKey;
  const scriptProvider = geminiEnabled ? "gemini" : hasOpenAI ? "openai" : "mock";
  const fallbackProvider =
    geminiEnabled && hasOpenAI ? "openai" : hasOpenAI ? "mock" : "mock";
  if (!hasOpenAI && !geminiEnabled) {
    warnings.push(
      "OPENAI_API_KEY unavailable and Gemini not opted-in — using mock script provider",
    );
  } else if (!geminiEnabled && hasGeminiKey) {
    warnings.push(
      "GEMINI_API_KEY present but AMYNEST_GEMINI_ENABLED!=true — Gemini media stack stays off for production-run",
    );
  } else if (geminiEnabled && !hasOpenAI) {
    warnings.push(
      "OPENAI_API_KEY unavailable — Gemini scripts have no OpenAI fallback",
    );
  }

  const root =
    options.dataDirectory ?? mkdtempSync(join(tmpdir(), "amynest-prod-run-"));
  const dataDirectory = root;
  const backupDirectory = options.backupDirectory ?? join(root, "backups");
  const outputDirectory = options.outputDirectory ?? join(root, "renders");
  mkdirSync(dataDirectory, { recursive: true });
  mkdirSync(backupDirectory, { recursive: true });
  mkdirSync(outputDirectory, { recursive: true });

  const loaded = loadLayeredConfiguration({
    env,
    environment: "production",
    runtimeOverrides: {
      runtimeEnvironment: "production",
      secretValidationMode: "strict",
      providerFallbackMode: "none",
      scriptProvider,
      fallbackProvider,
      renderer: "ffmpeg",
      preferredRenderer: "ffmpeg",
      publishingProvider: "youtube",
      analyticsProvider: "youtube",
      trendProvider: "mock",
      defaultVisibility: options.visibility ?? "unlisted",
      dailyVideoCount: options.count ?? 3,
      minimumSampleSize: 1,
      dataDirectory,
      backupDirectory,
      outputDirectory,
      preferredProviders: geminiEnabled
        ? [
            "google-imagen",
            "google-veo",
            "local-library",
            "screen-recording",
            "illustration",
            "openai-images",
            "placeholder",
          ]
        : undefined,
      maximumAIAssets: geminiEnabled ? 4 : undefined,
      opsNotificationChannels: env.WEBHOOK_URL ? ["webhook"] : [],
    },
  });

  const config: ContentEngineConfig = loaded.config;
  const store: OperationsPersistenceStore = new FileOperationsStore(dataDirectory);
  store.ensure();

  await step("validate-config", async () => {
    if (!loaded.validation.ok) {
      throw new Error(loaded.validation.issues.map((i) => i.message).join("; "));
    }
    return "Production config validated";
  });

  let workflowResult: WorkflowResult | undefined;
  await step("generate-render-upload", async () => {
    const publishingRegistry = createDefaultPublishingRegistry({
      fallbackMode: "none",
      providers: [
        new MockPublishingProvider(),
        new YouTubePublishingProvider({
          accessToken,
          channelId: env.YOUTUBE_CHANNEL_ID,
        }),
      ],
    });
    const renderRegistry = createDefaultRenderRegistry({
      fallbackMode: "none",
      providers: [new MockRenderer(), new FFmpegRenderer()],
    });

    const services = createPipelineServices(config);
    services.render = new RenderOrchestrator({
      config,
      registry: renderRegistry,
    });
    services.publishing = new PublishingOrchestrator({
      config,
      registry: publishingRegistry,
      sleep: async () => undefined,
    });

    const orchestrator = new WorkflowOrchestrator({
      config,
      services,
      store: store.workflows,
      sleep: async () => undefined,
    });

    const { result } = await orchestrator.run({
      type: "GenerateDailyVideos",
      trigger: "manual",
      count: options.count ?? 3,
    });
    workflowResult = result;
    if (result.status !== "completed") {
      throw new Error(
        `Workflow ${result.status}: ${result.executionSummary.errors.join("; ")}`,
      );
    }
    for (const unit of result.videoUnits) {
      if (unit.artifacts.published) {
        store.savePublishedVideo(unit.artifacts.published);
      }
    }
    return `Published ${result.videosPublished}/${result.videosGenerated} videos`;
  });

  let analyticsReport: AnalyticsReport | undefined;
  if (workflowResult) {
    await step("collect-analytics", async () => {
      const published = store.listPublishedVideos();
      if (published.length === 0) {
        throw new Error("No published videos available for analytics");
      }

      const youtubeAnalytics = new YouTubeAnalyticsProvider({ accessToken });
      const youtubeHealth = await youtubeAnalytics.health();
      let analyticsProviderId: "youtube" | "mock" = "youtube";
      if (!youtubeHealth.ok) {
        analyticsProviderId = "mock";
        warnings.push(
          `YouTube Analytics unavailable (${youtubeHealth.message}). Re-run OAuth with yt-analytics.readonly scope. Falling back to mock metrics for learning bootstrap.`,
        );
      }

      const analyticsRegistry = createDefaultAnalyticsRegistry({
        fallbackMode: analyticsProviderId === "youtube" ? "none" : "mock",
        providers: [new MockAnalyticsProvider(), youtubeAnalytics],
      });
      const analytics = new AnalyticsOrchestrator({
        config: {
          ...config,
          analyticsProvider: analyticsProviderId,
          providerFallbackMode: analyticsProviderId === "youtube" ? "none" : "mock",
        },
        registry: analyticsRegistry,
      });

      const videoTopicIds: Record<string, string> = {};
      const topicsById: Record<
        string,
        { title: string; category: TopicCategory; videoStyle: VideoStyle }
      > = {};
      const contentByTopicId: Record<string, ContentPackage> = {};

      for (const unit of workflowResult!.videoUnits) {
        if (unit.videoId) videoTopicIds[unit.videoId] = unit.topicId;
        const topic = unit.artifacts.topic;
        if (topic) {
          topicsById[topic.id] = {
            title: topic.title,
            category: topic.category,
            videoStyle: topic.videoStyle,
          };
        }
        if (unit.artifacts.content) {
          contentByTopicId[unit.topicId] = unit.artifacts.content;
        }
      }

      const { report } = await analytics.analyze({
        videos: published,
        videoTopicIds,
        topicsById,
        contentByTopicId,
        schedule: "daily",
      });
      analyticsReport = report;
      store.saveAnalytics(report);
      store.saveLearning(report.learningUpdates);
      return `Analytics report ${report.id} via ${analyticsProviderId}; learning updated`;
    });
  }

  let campaignPlan: CampaignPlan | undefined;
  if (analyticsReport && options.planCampaigns !== false) {
    await step("campaign-plan", async () => {
      const brain = new BrainOrchestrator({
        config,
        now: options.now,
      });
      const { plan } = await brain.plan({
        analytics: analyticsReport!,
        startDate: (options.now?.() ?? new Date()).toISOString().slice(0, 10),
        horizonDays: 30,
      });
      campaignPlan = plan;
      store.saveCampaignPlan(plan);
      return `Campaign plan ${plan.id}`;
    });
  }

  const published = (workflowResult?.videoUnits ?? [])
    .filter((u) => u.videoId && u.url)
    .map((u) => ({
      videoId: u.videoId!,
      url: u.url!,
      topicId: u.topicId,
    }));

  return {
    ok: blockers.length === 0 && steps.every((s) => s.ok),
    startedAt,
    completedAt: (options.now?.() ?? new Date()).toISOString(),
    durationMs: Date.now() - started,
    providers: {
      script: String(config.scriptProvider ?? "mock"),
      renderer: String(config.renderer ?? "mock"),
      publishing: String(config.publishingProvider ?? "mock"),
      analytics: String(config.analyticsProvider ?? "mock"),
    },
    workflowId: workflowResult?.workflowId,
    videosGenerated: workflowResult?.videosGenerated ?? 0,
    videosPublished: workflowResult?.videosPublished ?? 0,
    published,
    analyticsReportId: analyticsReport?.id,
    campaignPlanId: campaignPlan?.id,
    learningUpdated: Boolean(store.getLearning()),
    blockers,
    warnings,
    steps,
  };
}
