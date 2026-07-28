import { createHash } from "node:crypto";
import { resolveBrainSettings } from "../config/brain.js";
import type { ContentEngineConfig } from "../types/index.js";
import type {
  BrainInput,
  CampaignPlan,
} from "../types/campaign-plan.js";
import { CAMPAIGN_PLAN_VERSION } from "../types/campaign-plan.js";
import {
  createTelemetryEvent,
  InMemoryTelemetrySink,
  type TelemetryEvent,
  type TelemetrySink,
} from "../telemetry/index.js";
import { planCampaignSeries } from "./campaigns/index.js";
import { exportCampaignPlan } from "./export/index.js";
import {
  collectExperimentResults,
  planExperiments,
} from "./experimentation/index.js";
import { buildContentMemory } from "./memory/index.js";
import { buildOptimizationDecision } from "./optimizer/index.js";
import {
  buildBrainRecommendations,
  buildPublishingCalendar,
  buildPublishingSchedule,
} from "./planner/index.js";
import { aggregateExpectedPerformance } from "./predictor/index.js";
import {
  boostTopicsWithTrends,
  rankCampaigns,
  rankCategories,
  rankCtas,
  rankHooks,
  rankPublishingSlots,
  rankTopics,
} from "./ranking/index.js";
import { activeSeasonalEvents, listSeasonalEvents } from "./seasonal/index.js";
import { buildBrainTelemetry } from "./telemetry/index.js";
import {
  createDefaultTrendRegistry,
  type TrendProviderRegistry,
} from "./trends/index.js";

export interface BrainOrchestratorOptions {
  config: ContentEngineConfig;
  trendRegistry?: TrendProviderRegistry;
  telemetry?: TelemetrySink;
  now?: () => Date;
}

export interface BrainOrchestrationResult {
  plan: CampaignPlan;
  telemetry: TelemetryEvent;
}

/**
 * Phase 9 orchestrator: AnalyticsReport → CampaignPlan.
 * Learns from analytics and plans future content decisions.
 */
export class BrainOrchestrator {
  private readonly config: ContentEngineConfig;
  private readonly trendRegistry: TrendProviderRegistry;
  private readonly telemetry: TelemetrySink;
  private readonly now: () => Date;

  constructor(options: BrainOrchestratorOptions) {
    this.config = options.config;
    this.trendRegistry = options.trendRegistry ?? createDefaultTrendRegistry();
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
    this.now = options.now ?? (() => new Date());
  }

  async plan(input: BrainInput): Promise<BrainOrchestrationResult> {
    const started = Date.now();
    const settings = resolveBrainSettings(this.config);
    const now = this.now();
    const horizonDays = input.horizonDays ?? 30;
    const startDate =
      input.startDate ??
      new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
    const endDate = addDays(startDate, horizonDays - 1);

    const memory = buildContentMemory({
      analytics: input.analytics,
      publishedTopicIds: input.publishedTopicIds,
      learningWindowDays: settings.learningWindowDays,
      now,
    });

    const rankedTopics = rankTopics({
      analytics: input.analytics,
      memory,
      confidenceThreshold: settings.confidenceThreshold,
    });
    const rankedCategories = rankCategories(input.analytics);

    const trendProvider = await this.trendRegistry.resolveProvider(
      settings.trendProvider,
    );
    const trendSignals = await trendProvider.fetchTrends({
      region: settings.seasonalCalendar,
      limit: 8,
    });

    const topicsBoosted = boostTopicsWithTrends(rankedTopics, trendSignals);

    const optimization = buildOptimizationDecision({
      analytics: input.analytics,
      memory,
      rankedTopics: topicsBoosted,
      rankedCategories,
      enabled: settings.optimizationEnabled,
    });

    const year = Number(startDate.slice(0, 4));
    const seasonalAll = [
      ...listSeasonalEvents(settings.seasonalCalendar, year),
      ...listSeasonalEvents(settings.seasonalCalendar, year + 1),
    ];
    const seasonalEvents = activeSeasonalEvents(seasonalAll, startDate, endDate);

    const series = settings.campaignPlanningEnabled
      ? planCampaignSeries({
          optimization,
          seasonalEvents,
          trendSignals,
        })
      : [];

    const schedule = settings.campaignPlanningEnabled
      ? buildPublishingSchedule({
          startDate,
          horizonDays,
          series,
          rankedTopics: topicsBoosted,
          memory,
          optimization,
          analytics: input.analytics,
          predictionEnabled: settings.predictionEnabled,
        })
      : [];

    const experiments = planExperiments({
      analytics: input.analytics,
      optimization,
      enabled: settings.abTestingEnabled,
      now,
    });
    const experimentResults = collectExperimentResults(
      experiments,
      input.analytics,
      optimization,
    );

    const recommendations = buildBrainRecommendations({
      optimization,
      series,
      memory,
    });

    const expectedPerformance = aggregateExpectedPerformance(
      schedule.map((s) => s.predicted),
    );

    const plan: CampaignPlan = {
      id: `cp_${createHash("sha256")
        .update(`${startDate}|${endDate}|${input.analytics.id}`)
        .digest("hex")
        .slice(0, 12)}`,
      version: CAMPAIGN_PLAN_VERSION,
      createdAt: now.toISOString(),
      horizonDays,
      startDate,
      endDate,
      series,
      schedule,
      priorityTopics: topicsBoosted.slice(0, 15),
      recommendedHooks:
        memory.winningHooks.length > 0
          ? memory.winningHooks
          : recommendations
              .filter((r) => /hook|question/i.test(r.message))
              .map((r) => r.message),
      recommendedCtas:
        memory.winningCtas.length > 0
          ? memory.winningCtas
          : [
              optimization.ctaStyle === "app-demo"
                ? "Watch how AmyNest guides your routine — try it free"
                : "Try AmyNest AI free today",
            ],
      publishingCalendar: buildPublishingCalendar(schedule),
      optimization,
      recommendations,
      experiments,
      experimentResults,
      rankings: {
        topics: topicsBoosted.slice(0, 20),
        categories: rankedCategories,
        hooks: rankHooks(memory),
        ctas: rankCtas(memory),
        campaigns: rankCampaigns(series),
        publishingSlots: rankPublishingSlots(memory, input.analytics),
      },
      seasonalEvents,
      trendSignals,
      memory,
      expectedPerformance,
      telemetry: buildBrainTelemetry({
        analytics: input.analytics,
        expected: expectedPerformance,
        experimentResults,
        recommendationCount: recommendations.length,
        provider: trendProvider.id,
        planningDurationMs: Date.now() - started,
      }),
    };

    const event = createTelemetryEvent({
      name: "brain.plan",
      generationTimeMs: Date.now() - started,
      provider: trendProvider.id,
      errors: [],
      retryCount: 0,
      cacheHit: false,
      metadata: {
        scheduleSlots: plan.schedule.length,
        seriesCount: plan.series.length,
        recommendations: plan.recommendations.length,
        experiments: plan.experiments.length,
        predictionConfidence: plan.expectedPerformance.confidence,
        optimizationGains: plan.telemetry.optimizationGains,
      },
    });
    this.telemetry.record(event);

    return { plan, telemetry: event };
  }

  export(plan: CampaignPlan, format: "json" | "yaml" | "campaign-plan-v1" = "json") {
    return exportCampaignPlan(plan, format);
  }
}

function addDays(isoDate: string, days: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00.000Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}
